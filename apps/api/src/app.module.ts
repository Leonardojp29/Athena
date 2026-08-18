import { Module } from '@nestjs/common';
import { SharedModule } from './shared/shared.module.js';
import { FeatureFlagsModule } from './modules/feature-flags/feature-flags.module.js';
import { HealthModule } from './modules/health/health.module.js';
import { SearchModule } from './modules/search/search.module.js';
import { ViewsModule } from './modules/views/views.module.js';
import { WorkerModule } from './modules/worker/worker.module.js';

@Module({
  imports: [
    SharedModule,
    FeatureFlagsModule,
    HealthModule,
    ViewsModule,
    SearchModule,
    WorkerModule,
  ],
})
export class AppModule {}
