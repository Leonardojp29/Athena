import { Module } from '@nestjs/common';
import { SharedModule } from './shared/shared.module.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { FeatureFlagsModule } from './modules/feature-flags/feature-flags.module.js';
import { HealthModule } from './modules/health/health.module.js';
import { SearchModule } from './modules/search/search.module.js';
import { UsersModule } from './modules/users/users.module.js';
import { ViewsModule } from './modules/views/views.module.js';
import { WorkerModule } from './modules/worker/worker.module.js';

@Module({
  imports: [
    SharedModule,
    AuthModule,
    FeatureFlagsModule,
    HealthModule,
    ViewsModule,
    SearchModule,
    UsersModule,
    WorkerModule,
  ],
})
export class AppModule {}
