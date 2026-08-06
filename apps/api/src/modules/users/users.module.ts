import { Module } from '@nestjs/common';
import { FavoritesService } from './favorites.service.js';
import { PersonalFeedService } from './personal-feed.service.js';
import { UsersController } from './users.controller.js';

@Module({
  controllers: [UsersController],
  providers: [FavoritesService, PersonalFeedService],
  exports: [FavoritesService],
})
export class UsersModule {}
