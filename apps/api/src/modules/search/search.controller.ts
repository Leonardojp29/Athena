import {
  Controller,
  DefaultValuePipe,
  Get,
  Header,
  Param,
  ParseIntPipe,
  Query,
} from '@nestjs/common';
import { ViewCacheService } from '../../shared/view-cache.service.js';
import { SearchService, type IndiceLocal, type SearchHit } from './search.service.js';

@Controller('search')
export class SearchController {
  constructor(
    private readonly search: SearchService,
    private readonly cache: ViewCacheService,
  ) {}

  @Get()
  @Header('Cache-Control', 'public, s-maxage=120, stale-while-revalidate=300')
  async query(
    @Query('q') q = '',
    @Query('limit', new DefaultValuePipe(12), ParseIntPipe) limit: number,
  ): Promise<{ query: string; results: SearchHit[] }> {
    return { query: q, results: await this.search.search(q, Math.min(limit, 30)) };
  }

  /*
   * La vía del teclado. Se separa de `/search` porque tienen exigencias opuestas: acá ocho
   * resultados en milisegundos y nunca un embedding; allá la respuesta completa, que puede
   * permitirse el segundo que cuesta entender una descripción.
   */
  @Get('sugerencias')
  @Header('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600')
  async suggest(
    @Query('q') q = '',
    @Query('limit', new DefaultValuePipe(8), ParseIntPipe) limit: number,
  ): Promise<{ query: string; results: SearchHit[] }> {
    return { query: q, results: await this.search.suggest(q, Math.min(limit, 15)) };
  }

  /*
   * El índice que el navegador filtra sin volver a preguntar. Cambia cuando cambia el plantel de
   * competencias, o sea casi nunca: un día en el borde y otro de gracia.
   */
  @Get('indice')
  @Header('Cache-Control', 'public, s-maxage=86400, stale-while-revalidate=172800')
  async indice(): Promise<IndiceLocal> {
    return this.cache.wrap('busqueda:indice', 86_400, () => this.search.indice());
  }

  /*
   * Los vecinos semánticos de un equipo no cambian de un día para otro, pero calcularlos son tres
   * viajes a Supabase: sin caché, la página del equipo pagaba dos segundos y medio por una lista
   * que iba a ser la misma mañana.
   */
  @Get('similar/team/:slug')
  @Header('Cache-Control', 'public, s-maxage=86400, stale-while-revalidate=172800')
  async similarTeams(@Param('slug') slug: string): Promise<{ results: SearchHit[] }> {
    return this.cache.wrap(`similar:team:${slug}`, 86_400, async () => ({
      results: await this.search.similarTeams(slug),
    }));
  }
}
