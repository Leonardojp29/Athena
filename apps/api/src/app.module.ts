import { Module } from '@nestjs/common';
import { SharedModule } from './shared/shared.module.js';
import { HealthModule } from './modules/health/health.module.js';
import { ViewsModule } from './modules/views/views.module.js';

@Module({
  imports: [SharedModule, HealthModule, ViewsModule],
})
export class AppModule {}
