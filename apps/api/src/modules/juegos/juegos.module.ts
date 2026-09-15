import { Module } from '@nestjs/common';
import { ApiFootballModule } from '../providers/api-football/api-football.module.js';
import { SharedModule } from '../../shared/shared.module.js';
import { SyncModule } from '../sync/sync.module.js';
import { AuditarRetosService } from './auditar-retos.service.js';
import { ImportarRetosService } from './importar-retos.service.js';

@Module({
  imports: [SharedModule, ApiFootballModule, SyncModule],
  providers: [AuditarRetosService, ImportarRetosService],
  exports: [AuditarRetosService, ImportarRetosService],
})
export class JuegosModule {}
