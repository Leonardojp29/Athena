import { Module } from '@nestjs/common';
import { ApiFootballModule } from '../providers/api-football/api-football.module.js';
import { SharedModule } from '../../shared/shared.module.js';
import { SyncModule } from '../sync/sync.module.js';
import { Auditar60Service } from './auditar-60.service.js';
import { AuditarImpostorService } from './auditar-impostor.service.js';
import { AuditarRetosService } from './auditar-retos.service.js';
import { Importar60Service } from './importar-60.service.js';
import { ImportarImpostorService } from './importar-impostor.service.js';
import { ImportarRetosService } from './importar-retos.service.js';
import { ImpostorController } from './impostor.controller.js';
import { PreguntasDel60Service } from './preguntas-del-60.service.js';
import { SesentaController } from './sesenta.controller.js';
import { JuegosController } from './juegos.controller.js';
import { RetosDelImpostorService } from './retos-del-impostor.service.js';
import { RetosDelOnceService } from './retos-del-once.service.js';

@Module({
  imports: [SharedModule, ApiFootballModule, SyncModule],
  controllers: [JuegosController, ImpostorController, SesentaController],
  providers: [AuditarRetosService, Auditar60Service, AuditarImpostorService, Importar60Service, ImportarImpostorService, ImportarRetosService, PreguntasDel60Service, RetosDelImpostorService, RetosDelOnceService],
  exports: [AuditarRetosService, Auditar60Service, AuditarImpostorService, Importar60Service, ImportarImpostorService, ImportarRetosService, PreguntasDel60Service, RetosDelImpostorService, RetosDelOnceService],
})
export class JuegosModule {}
