import { Module } from '@nestjs/common';
import { SharedModule } from '../../shared/shared.module.js';
import { FeatureFlagsModule } from '../feature-flags/feature-flags.module.js';
import { InsightsModule } from '../insights/insights.module.js';
import { SearchModule } from '../search/search.module.js';
import { SyncModule } from '../sync/sync.module.js';
import { SyncQueueService } from './sync-queue.service.js';
import { SyncScheduleService } from './sync-schedule.service.js';

@Module({
  imports: [SharedModule, FeatureFlagsModule, SyncModule, InsightsModule, SearchModule],
  providers: [SyncQueueService, SyncScheduleService],
  exports: [SyncQueueService],
})
export class WorkerModule {}
