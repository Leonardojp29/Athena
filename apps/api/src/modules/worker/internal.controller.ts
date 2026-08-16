import {
  Controller,
  Headers,
  HttpCode,
  Post,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { SyncQueueService } from './sync-queue.service.js';
import { SyncScheduleService } from './sync-schedule.service.js';

/**
 * Las entradas del sync cuando no hay worker: pg_cron de Supabase las llama por HTTP.
 *
 * En producción serverless nadie tiene un proceso encendido, así que el latido viene de afuera:
 * un cron en la misma base de datos dispara el tic cada minuto y el diario a las 05:00. El secreto
 * viaja en un header y sin él no hay servicio: un endpoint que sincroniza contra una cuota
 * compartida no puede quedar abierto a internet.
 *
 * El presupuesto del tic es menor que el `maxDuration` de la función: la corrida muere limpia por
 * su propio reloj, nunca degollada por la plataforma a mitad de una escritura.
 */
@Controller('internal')
export class InternalController {
  constructor(
    private readonly queue: SyncQueueService,
    private readonly schedules: SyncScheduleService,
  ) {}

  @Post('tick')
  @HttpCode(200)
  async tick(@Headers('x-cron-secreto') secreto: string | undefined) {
    this.autorizar(secreto);
    await this.schedules.seed();

    /* Lo diario atrasado se recupera en el primer tic que lo note: el cron pudo no dispararse. */
    const perdidos = await this.schedules.atrasados();
    if (perdidos.includes('daily-refresh')) await this.queue.daily();

    return this.queue.tick(40_000);
  }

  @Post('daily')
  @HttpCode(200)
  async daily(@Headers('x-cron-secreto') secreto: string | undefined) {
    this.autorizar(secreto);
    await this.queue.daily();
    return { ok: true };
  }

  private autorizar(secreto: string | undefined): void {
    const esperado = process.env.CRON_SECRET;
    if (!esperado) throw new ServiceUnavailableException('CRON_SECRET sin configurar');
    if (secreto !== esperado) throw new UnauthorizedException();
  }
}
