import { Module } from '@nestjs/common';
import { ApiFootballModule } from '../providers/api-football/api-football.module.js';
import { SharedModule } from '../../shared/shared.module.js';
import { SyncModule } from '../sync/sync.module.js';
import { AuditarRetosService } from './auditar-retos.service.js';
import { ImportarRetosService } from './importar-retos.service.js';
import { JuegosController } from './juegos.controller.js';
import { RetosDelOnceService } from './retos-del-once.service.js';

@Module({
  imports: [SharedModule, ApiFootballModule, SyncModule],
  controllers: [JuegosController],
  providers: [AuditarRetosService, ImportarRetosService, RetosDelOnceService],
  exports: [AuditarRetosService, ImportarRetosService, RetosDelOnceService],
})
export class JuegosModule {}
