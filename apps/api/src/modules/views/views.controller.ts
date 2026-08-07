import { Controller, Get, Header, Param, ParseUUIDPipe, Query, Res } from '@nestjs/common';
import { ViewCacheService } from '../../shared/view-cache.service.js';
import { ViewsService } from './views.service.js';

/*
 * Cada vista declara cuánto vale su respuesta en dos lugares que tienen que coincidir: el
 * `Cache-Control` que ve el cliente y el TTL con el que se guarda del lado del servidor. Viven
 * juntos acá para que no se separen.
 */
const TTL = {
  home: 60,
  matches: 60,
  competitions: 3600,
  competition: 300,
  team: 300,
  player: 600,
  matchEnJuego: 15,
  matchProgramado: 120,
  matchTerminado: 3600,
  topPerformers: 300,
  sitemap: 3600,
} as const;

/* Lo que el selector puede pedir; cualquier otra cosa cae en la región de este público. */
const CONTINENTES = new Set(['sudamerica', 'europa', 'norteamerica', 'asia', 'africa', 'mundial']);

@Controller('views')
export class ViewsController {
  constructor(
    private readonly views: ViewsService,
    private readonly cache: ViewCacheService,
  ) {}

  @Get('home')
  @Header('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=120')
  home() {
    return this.cache.wrap('home', TTL.home, () => this.views.home());
  }

  @Get('competitions')
  @Header('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=7200')
  competitions() {
    return this.cache.wrap('competitions', TTL.competitions, () => this.views.competitions());
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
  competition(@Param('slug') slug: string) {
    return this.cache.wrap(`competition:${slug}`, TTL.competition, () =>
      this.views.competition(slug),
    );
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

  /*
   * El partido es la vista más pedida y la que más cuesta componer, así que su caducidad la
   * decide el estado: un partido terminado no vuelve a cambiar nunca y guardarlo treinta segundos
   * era pagar el viaje a Supabase una y otra vez por una respuesta idéntica.
   */
  @Get('match/:id')
  async match(@Param('id', ParseUUIDPipe) id: string, @Res({ passthrough: true }) res: RespuestaConCabeceras) {
    const vista = await this.cache.wrap(
      `match:${id}`,
      (v: { status: string }) => ttlDePartido(v.status),
      () => this.views.match(id),
    );
    const ttl = ttlDePartido(vista.status);
    res.setHeader(
      'Cache-Control',
      `public, s-maxage=${ttl}, stale-while-revalidate=${Math.min(ttl * 2, 3600)}`,
    );
    return vista;
  }

  @Get('sitemap')
  @Header('Cache-Control', 'public, s-maxage=3600')
  sitemap() {
    return this.cache.wrap('sitemap', TTL.sitemap, () => this.views.sitemapEntries());
  }
}

/* Lo único que se usa de la respuesta de Express, sin arrastrar sus tipos hasta acá. */
interface RespuestaConCabeceras {
  setHeader(nombre: string, valor: string): void;
}

/** En juego cambia cada minuto; programado casi nada; terminado, nunca más. */
function ttlDePartido(status: string): number {
  if (status === 'in_play' || status === 'paused') return TTL.matchEnJuego;
  if (status === 'scheduled') return TTL.matchProgramado;
  return TTL.matchTerminado;
}

function limaToday(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Lima' }).format(new Date());
}
