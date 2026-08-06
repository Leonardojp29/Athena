import {
  Controller,
  DefaultValuePipe,
  Get,
  Header,
  Param,
  ParseIntPipe,
  Query,
} from '@nestjs/common';
import { SearchService, type SearchHit } from './search.service.js';

@Controller('search')
export class SearchController {
  constructor(private readonly search: SearchService) {}

  @Get()
  @Header('Cache-Control', 'public, s-maxage=120, stale-while-revalidate=300')
  async query(
    @Query('q') q = '',
    @Query('limit', new DefaultValuePipe(12), ParseIntPipe) limit: number,
  ): Promise<{ query: string; results: SearchHit[] }> {
    return { query: q, results: await this.search.search(q, Math.min(limit, 30)) };
  }

  @Get('similar/team/:slug')
  @Header('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=7200')
  async similarTeams(@Param('slug') slug: string): Promise<{ results: SearchHit[] }> {
    return { results: await this.search.similarTeams(slug) };
  }
}
