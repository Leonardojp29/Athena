import { Body, Controller, Delete, Get, Post, UseGuards } from '@nestjs/common';
import { AuthGuard, CurrentUser } from '../auth/auth.guard.js';
import type { AuthenticatedUser } from '../auth/supabase-token.service.js';
import { FavoritesService, type FavoriteEntity } from './favorites.service.js';
import { PersonalFeedService } from './personal-feed.service.js';

interface FavoriteBody {
  entityType: string;
  entityId: string;
}

@Controller('me')
@UseGuards(AuthGuard)
export class UsersController {
  constructor(
    private readonly favorites: FavoritesService,
    private readonly feed: PersonalFeedService,
  ) {}

  @Get()
  async profile(@CurrentUser() user: AuthenticatedUser) {
    await this.favorites.ensureProfile(user);
    return { id: user.id, email: user.email, favorites: await this.favorites.list(user.id) };
  }

  @Get('favorites')
  favoriteList(@CurrentUser() user: AuthenticatedUser): Promise<FavoriteEntity[]> {
    return this.favorites.list(user.id);
  }

  @Post('favorites')
  add(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: FavoriteBody,
  ): Promise<FavoriteEntity[]> {
    return this.favorites.add(user, body.entityType, body.entityId);
  }

  @Delete('favorites')
  remove(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: FavoriteBody,
  ): Promise<FavoriteEntity[]> {
    return this.favorites.remove(user.id, body.entityType, body.entityId);
  }

  @Get('feed')
  feedForUser(@CurrentUser() user: AuthenticatedUser) {
    return this.feed.build(user.id);
  }
}
