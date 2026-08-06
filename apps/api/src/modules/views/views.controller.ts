import { Controller, Get, Header, Param, ParseUUIDPipe } from '@nestjs/common';
import { ViewsService } from './views.service.js';

@Controller('views')
export class ViewsController {
  constructor(private readonly views: ViewsService) {}

  @Get('home')
  @Header('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=120')
  home() {
    return this.views.home();
  }

  @Get('competition/:slug')
  @Header('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600')
  competition(@Param('slug') slug: string) {
    return this.views.competition(slug);
  }

  @Get('team/:slug')
  @Header('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600')
  team(@Param('slug') slug: string) {
    return this.views.team(slug);
  }

  @Get('player/:slug')
  @Header('Cache-Control', 'public, s-maxage=600, stale-while-revalidate=1200')
  player(@Param('slug') slug: string) {
    return this.views.player(slug);
  }

  @Get('match/:id')
  @Header('Cache-Control', 'public, s-maxage=30, stale-while-revalidate=60')
  match(@Param('id', ParseUUIDPipe) id: string) {
    return this.views.match(id);
  }

  @Get('sitemap')
  @Header('Cache-Control', 'public, s-maxage=3600')
  sitemap() {
    return this.views.sitemapEntries();
  }
}
