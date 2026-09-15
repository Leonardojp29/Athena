import {
  Controller,
  Get,
  Headers,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiBudgetService } from '../../shared/api-budget.service.js';
import { KvService } from '../../shared/kv.service.js';
import { CerrarPartidosUseCase } from '../sync/cerrar-partidos.usecase.js';
import { MatchSyncService } from '../sync/match-sync.service.js';
import { ColaDeTareas } from './cola-de-tareas.service.js';
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
    private readonly cerrar: CerrarPartidosUseCase,
    private readonly matchSync: MatchSyncService,
    private readonly cola: ColaDeTareas,
    private readonly presupuesto: ApiBudgetService,
    private readonly kv: KvService,
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

  @Post('marcador')
  @HttpCode(200)
  async marcador(@Headers('x-cron-secreto') secreto: string | undefined) {
    this.autorizar(secreto);
    return this.queue.latirMarcador();
  }

  @Post('daily')
  @HttpCode(200)
  async daily(@Headers('x-cron-secreto') secreto: string | undefined) {
    this.autorizar(secreto);
    await this.queue.daily();
    return { ok: true };
  }

  /* Cuando un partido concreto quedó sin datos, esto lo arregla sin esperar al barrido. */
  @Post('partidos/:id/resincronizar')
  @HttpCode(200)
  async resincronizar(
    @Headers('x-cron-secreto') secreto: string | undefined,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    this.autorizar(secreto);
    const resultado = await this.cerrar.forzarUno(id);
    return { ...resultado, facetas: await this.matchSync.facetasDe(id) };
  }

  /**
   * Si el sync está vivo, y de dónde viene.
   *
   * El latido lo dispara pg_cron desde Supabase, fuera del repositorio: cuando se apunta a una URL
   * que ya no existe, todo sigue "bien" salvo que los datos dejan de llegar. Esto lo hace visible.
   */
  @Get('salud')
  async salud(@Headers('x-cron-secreto') secreto: string | undefined) {
    this.autorizar(secreto);
    const [marcas, cola, cuota, cierre] = await Promise.all([
      this.kv.leer(['tick:ultimo', 'marcador:ultimo', 'cola:pausa']),
      this.cola.resumen(),
      this.presupuesto.snapshot(),
      this.matchSync.resumen(),
    ]);
    const haceSegundos = (clave: string): number | null => {
      const cuando = marcas.get(clave);
      return cuando ? Math.round((Date.now() - cuando) / 1000) : null;
    };

    return {
      ultimoTickHaceSeg: haceSegundos('tick:ultimo'),
      ultimoMarcadorHaceSeg: haceSegundos('marcador:ultimo'),
      colaPausada: marcas.has('cola:pausa'),
      cola,
      cuota,
      cierre,
    };
  }

  private autorizar(secreto: string | undefined): void {
    const esperado = process.env.CRON_SECRET;
    if (!esperado) throw new ServiceUnavailableException('CRON_SECRET sin configurar');
    if (secreto !== esperado) throw new UnauthorizedException();
  }
}
