import { Controller, DefaultValuePipe, Get, Header, NotFoundException, Param, Query } from '@nestjs/common';
import {
  RetosDelOnceService,
  type FutbolistaBuscado,
  type IndiceDeFutbolistas,
  type RetoParaJugar,
  type TitularRevelado,
} from './retos-del-once.service.js';

const CATALOGOS = new Set(['internacional', 'peruano']);
const DIFICULTADES = new Set(['facil', 'normal', 'dificil']);
/* Lo que el cliente manda como "ya jugados". Más que eso no cabe en una sesión razonable. */
const TOPE_DE_EXCLUIDOS = 40;

@Controller('juegos/once')
export class JuegosController {
  constructor(private readonly retos: RetosDelOnceService) {}

  /*
   * Sin caché: cada partida quiere un reto distinto, y cachear el sorteo sería servir el mismo a
   * todos durante cinco minutos.
   */
  @Get('reto')
  @Header('Cache-Control', 'no-store')
  async reto(
    @Query('catalogo') catalogo = 'internacional',
    @Query('dificultad') dificultad = 'normal',
    @Query('excluir') excluir = '',
  ): Promise<RetoParaJugar> {
    const elegido = await this.retos.sortear(
      CATALOGOS.has(catalogo) ? catalogo : 'internacional',
      DIFICULTADES.has(dificultad) ? dificultad : 'normal',
      excluir.split(',').filter(Boolean).slice(0, TOPE_DE_EXCLUIDOS),
    );
    if (!elegido) throw new NotFoundException('no hay retos para esa combinación');
    return elegido;
  }

  /*
   * El buscador de la partida. Cachea por consulta porque media docena de personas jugando escriben
   * los mismos apellidos, y la base está fuera de región.
   */
  @Get('jugadores')
  @Header('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600')
  async jugadores(
    @Query('q') q = '',
    @Query('limit', new DefaultValuePipe(8)) limit: number,
  ): Promise<{ resultados: FutbolistaBuscado[] }> {
    const limpia = q.trim().slice(0, 60);
    if (limpia.length === 0) return { resultados: [] };
    /* El servicio ya recuerda en memoria; pasar por `vistas_cache` agregaría dos viajes a la base. */
    return { resultados: await this.retos.buscar(limpia, Number(limit) || 8) };
  }

  /*
   * El índice del buscador. Cambia cuando cambia el catálogo, así que el navegador y el borde lo
   * pueden guardar un día: se baja una vez y todas las partidas siguientes buscan sin salir a la red.
   */
  @Get('indice')
  @Header('Cache-Control', 'public, max-age=86400, s-maxage=86400, stale-while-revalidate=172800')
  async indice(): Promise<IndiceDeFutbolistas> {
    return this.retos.indice();
  }

  @Get('reto/:clave/solucion')
  @Header('Cache-Control', 'public, s-maxage=86400, stale-while-revalidate=172800')
  async solucion(@Param('clave') clave: string): Promise<{ titulares: TitularRevelado[] }> {
    const titulares = await this.retos.solucion(clave);
    if (!titulares) throw new NotFoundException('ese reto no existe');
    return { titulares };
  }
}
