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
import { SearchService, type SearchHit } from './search.service.js';

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
