import { Module } from '@nestjs/common';
import { ApiFootballModule } from '../providers/api-football/api-football.module.js';
import { SharedModule } from '../../shared/shared.module.js';
import { SyncModule } from '../sync/sync.module.js';
import { AuditarImpostorService } from './auditar-impostor.service.js';
import { AuditarRetosService } from './auditar-retos.service.js';
import { ImportarImpostorService } from './importar-impostor.service.js';
import { ImportarRetosService } from './importar-retos.service.js';
import { ImpostorController } from './impostor.controller.js';
import { JuegosController } from './juegos.controller.js';
import { RetosDelImpostorService } from './retos-del-impostor.service.js';
import { RetosDelOnceService } from './retos-del-once.service.js';

@Module({
  imports: [SharedModule, ApiFootballModule, SyncModule],
  controllers: [JuegosController, ImpostorController],
  providers: [AuditarRetosService, AuditarImpostorService, ImportarImpostorService, ImportarRetosService, RetosDelImpostorService, RetosDelOnceService],
  exports: [AuditarRetosService, AuditarImpostorService, ImportarImpostorService, ImportarRetosService, RetosDelImpostorService, RetosDelOnceService],
})
export class JuegosModule {}
