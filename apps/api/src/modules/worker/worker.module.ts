import { Module } from '@nestjs/common';
import { SharedModule } from '../../shared/shared.module.js';
import { SyncModule } from '../sync/sync.module.js';
import { SyncQueueService } from './sync-queue.service.js';

@Module({
  imports: [SharedModule, SyncModule],
  providers: [SyncQueueService],
  exports: [SyncQueueService],
})
export class WorkerModule {}
