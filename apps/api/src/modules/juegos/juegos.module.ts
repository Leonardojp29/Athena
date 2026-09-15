import { Module } from '@nestjs/common';
import { ApiFootballModule } from '../providers/api-football/api-football.module.js';
import { SharedModule } from '../../shared/shared.module.js';
import { AuditarRetosService } from './auditar-retos.service.js';

@Module({
  imports: [SharedModule, ApiFootballModule],
  providers: [AuditarRetosService],
  exports: [AuditarRetosService],
})
export class JuegosModule {}
