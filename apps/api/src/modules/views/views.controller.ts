import { Controller, Get, Header, Param, ParseUUIDPipe, Query, Res } from '@nestjs/common';
import { ViewCacheService } from '../../shared/view-cache.service.js';
import { MundoService } from './mundo.service.js';
import { ViewsService } from './views.service.js';

/*
 * Cada vista declara cuánto vale su respuesta en dos lugares que tienen que coincidir: el
 * `Cache-Control` que ve el cliente y el TTL con el que se guarda del lado del servidor. Viven
 * juntos acá para que no se separen.
 */
const TTL = {
  home: 60,
  enVivo: 30,
  matches: 60,
  competitions: 3600,
  competition: 300,
  team: 300,
  player: 600,
  coach: 600,
  matchEnJuego: 15,
  matchProgramado: 120,
  matchTerminado: 3600,
  /* Un partido terminado al que le falta el detalle se repara en minutos: la caché no puede taparlo. */
  matchIncompleto: 120,
  matchPorRuta: 3600,
  semana: 300,
  topPerformers: 300,
  /* La calculadora es una tabla, no un marcador: un minuto le sobra mientras se juega la fecha. */
  calculadoraEnJuego: 60,
  sitemap: 3600,
  /* El mundo del juego cambia cuando cambian las tablas: una vez al día alcanza. */
  mundo: 86400,
} as const;

/* Lo que el selector puede pedir; cualquier otra cosa cae en la región de este público. */
const CONTINENTES = new Set(['sudamerica', 'europa', 'norteamerica', 'asia', 'africa', 'mundial']);

@Controller('views')
export class ViewsController {
  constructor(
    private readonly views: ViewsService,
    private readonly mundoDelJuego: MundoService,
    private readonly cache: ViewCacheService,
  ) {}

  @Get('home')
  @Header('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=120')
  home() {
    return this.cache.wrap('home', TTL.home, () => this.views.home());
  }

  /* Lo único que el encabezado del sitio necesita: la home entera costaba cien kilobytes por página. */
  @Get('en-vivo')
  @Header('Cache-Control', 'public, s-maxage=30, stale-while-revalidate=60')
  enVivo() {
    return this.cache.wrap('en-vivo', TTL.enVivo, () => this.views.enVivo());
  }

  /* Lo único que se pide cada quince segundos: dos kilobytes contra los ciento sesenta del día. */
  @Get('marcadores')
  @Header('Cache-Control', 'public, s-maxage=5')
  marcadores() {
    return this.views.marcadores();
  }

  @Get('competitions')
  @Header('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=7200')
  competitions() {
    return this.cache.wrap('competitions', TTL.competitions, () => this.views.competitions());
  }

  /* El catálogo que los juegos necesitan: ligas jugables, clubes reales y la fuerza de cada uno. */
  @Get('mundo')
  @Header('Cache-Control', 'public, s-maxage=86400, stale-while-revalidate=172800')
  mundo() {
    return this.cache.wrap('mundo', TTL.mundo, () => this.mundoDelJuego.mundo());
  }

  @Get('matches')
  @Header('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300')
  matches(@Query('fecha') fecha: string) {
    const dia = fecha ?? limaToday();
    return this.cache.wrap(`matches:${dia}`, TTL.matches, () => this.views.matchesOnDate(dia));
  }

  @Get('top-performers')
  @Header('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600')
  topPerformers(@Query('fecha') fecha: string, @Query('continente') continente: string) {
    const dia = fecha ?? limaToday();
    const region = CONTINENTES.has(continente) ? continente : 'sudamerica';
    return this.cache.wrap(`top:${dia}:${region}`, TTL.topPerformers, () =>
      this.views.topPerformers(dia, 6, region),
    );
  }

  @Get('competition/:slug')
  @Header('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600')
  competition(@Param('slug') slug: string, @Query('temporada') temporada?: string) {
    /* El archivo de una copa es la misma vista con otro año; sin `temporada`, la vigente. */
    const year = /^\d{4}$/.test(temporada ?? '') ? Number(temporada) : null;
    return this.cache.wrap(`competition:${slug}:${year ?? 'actual'}`, TTL.competition, () =>
      this.views.competition(slug, year),
    );
  }

  /*
   * La calculadora necesita la temporada entera, no la ventana de siete fechas que publica la
   * vista de competencia: sin el Apertura completo no hay tabla anual. Su caducidad la decide el
   * estado, igual que la del partido: mientras se juega algo, un minuto.
   */
  @Get('calculadora/:slug')
  async calculadora(
    @Param('slug') slug: string,
    @Res({ passthrough: true }) res: RespuestaConCabeceras,
  ) {
    const vista = await this.cache.wrap(`calculadora:${slug}`, ttlDeCalculadora, () =>
      this.views.calculadora(slug),
    );
    const ttl = ttlDeCalculadora(vista);
    res.setHeader(
      'Cache-Control',
      `public, s-maxage=${ttl}, stale-while-revalidate=${ttl * 2}`,
    );
    return vista;
  }

  @Get('team/:slug')
  @Header('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600')
  team(@Param('slug') slug: string) {
    return this.cache.wrap(`team:${slug}`, TTL.team, () => this.views.team(slug));
  }

  @Get('player/:slug')
  @Header('Cache-Control', 'public, s-maxage=600, stale-while-revalidate=1200')
  player(@Param('slug') slug: string) {
    return this.cache.wrap(`player:${slug}`, TTL.player, () => this.views.player(slug));
  }

  @Get('coach/:slug')
  @Header('Cache-Control', 'public, s-maxage=600, stale-while-revalidate=1200')
  coach(@Param('slug') slug: string) {
    return this.cache.wrap(`coach:${slug}`, TTL.coach, () => this.views.coach(slug));
  }

  /*
   * El partido es la vista más pedida y la que más cuesta componer, así que su caducidad la
   * decide el estado: un partido terminado no vuelve a cambiar nunca y guardarlo treinta segundos
   * era pagar el viaje a Supabase una y otra vez por una respuesta idéntica.
   */
  /*
   * El partido por su dirección legible. Va antes que `match/:id` porque Nest resuelve por orden y
   * `match-por-ruta` encajaría en el comodín del id.
   */
  @Get('match-por-ruta')
  @Header('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400')
  matchPorRuta(
    @Query('local') local: string,
    @Query('visita') visita: string,
    @Query('fecha') fecha: string,
  ) {
    return this.cache.wrap(`match-ruta:${local}:${visita}:${fecha}`, TTL.matchPorRuta, () =>
      this.views.matchPorRuta(local, visita, fecha),
    );
  }

  @Get('match/:id')
  async match(@Param('id', ParseUUIDPipe) id: string, @Res({ passthrough: true }) res: RespuestaConCabeceras) {
    const vista = await this.cache.wrap(`match:${id}`, ttlDePartido, () => this.views.match(id));
    const ttl = ttlDePartido(vista);
    res.setHeader(
      'Cache-Control',
      `public, s-maxage=${ttl}, stale-while-revalidate=${Math.min(ttl * 2, 3600)}`,
    );
    return vista;
  }

  /* El peso de cada día de la ventana: la tira de días deja de ser siete cajitas idénticas. */
  @Get('calendario-semana')
  @Header('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=900')
  calendarioSemana(@Query('desde') desde: string, @Query('dias') dias?: string) {
    const cuantos = Number(dias ?? 7) || 7;
    return this.cache.wrap(`semana:${desde}:${cuantos}`, TTL.semana, () =>
      this.views.calendarioSemana(desde, cuantos),
    );
  }

  @Get('sitemap/:tipo')
  @Header('Cache-Control', 'public, s-maxage=3600')
  sitemap(@Param('tipo') tipo: string, @Query('pagina') pagina?: string) {
    const numero = Math.max(0, Number(pagina ?? 0) || 0);
    return this.cache.wrap(`sitemap:${tipo}:${numero}`, TTL.sitemap, () =>
      this.views.sitemapEntries(tipo, numero),
    );
  }
}

/* Lo único que se usa de la respuesta de Express, sin arrastrar sus tipos hasta acá. */
interface RespuestaConCabeceras {
  setHeader(nombre: string, valor: string): void;
}

/** En juego cambia cada minuto; programado casi nada; terminado, solo si ya llegó todo. */
function ttlDePartido(vista: { status: string; sync?: { cerrado: boolean } | null }): number {
  if (vista.status === 'in_play' || vista.status === 'paused') return TTL.matchEnJuego;
  if (vista.status === 'scheduled') return TTL.matchProgramado;
  return vista.sync?.cerrado === false ? TTL.matchIncompleto : TTL.matchTerminado;
}

/** Mientras haya un partido en curso la tabla se mueve; si no, la próxima fecha está a días. */
function ttlDeCalculadora(vista: { hayEnVivo: boolean } | null): number {
  return vista?.hayEnVivo ? TTL.calculadoraEnJuego : TTL.competition;
}

function limaToday(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Lima' }).format(new Date());
}
