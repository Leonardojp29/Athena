import { Injectable } from '@nestjs/common';
import { KvService } from './kv.service.js';

// La cuenta de API-Football es compartida con otros sistemas de la empresa:
// el presupuesto se basa siempre en el "remaining" real que reportan los headers,
// nunca en el límite teórico del plan.
const DAY_SAFETY_MARGIN = 500;
const MINUTE_SAFETY_MARGIN = 30;

const DAY_KEY = 'presupuesto:apifootball:dia';
const MINUTE_KEY = 'presupuesto:apifootball:minuto';

/*
 * La cuota es advisoria —los márgenes son de 500 y 30— así que puede estar unos segundos vieja sin
 * riesgo. Eso permite no pagar un viaje a Postgres por cada pedido al proveedor: se lee y escribe
 * la memoria del proceso siempre, y Postgres cada tanto para que los demás procesos la vean.
 */
const PERSISTIR_CADA_MS = 5_000;
const CONFIAR_EN_MEMORIA_MS = 10_000;

/** El minuto se recupera solo; el día, no. */
export const PAUSA_POR_CUOTA_S = { minute: 60, day: 3600 } as const;

export class ApiBudgetExhaustedError extends Error {
  constructor(
    readonly scope: 'day' | 'minute',
    remaining: number,
  ) {
    super(`API-Football budget exhausted (${scope}): ${remaining} requests remaining`);
    this.name = 'ApiBudgetExhaustedError';
  }
}

@Injectable()
export class ApiBudgetService {
  private dia: number | null = null;
  private minuto: number | null = null;
  private leidoEn = 0;
  private persistidoEn = 0;

  constructor(private readonly kv: KvService) {}

  async recordFromHeaders(headers: Headers): Promise<void> {
    const day = headers.get('x-ratelimit-requests-remaining');
    const minute = headers.get('x-ratelimit-remaining');
    if (day !== null) this.dia = Number(day);
    if (minute !== null) this.minuto = Number(minute);
    this.leidoEn = Date.now();

    if (Date.now() - this.persistidoEn < PERSISTIR_CADA_MS) return;
    this.persistidoEn = Date.now();
    if (this.dia !== null) await this.kv.fijar(DAY_KEY, this.dia, 86_400);
    if (this.minuto !== null) await this.kv.fijar(MINUTE_KEY, this.minuto, 60);
  }

  async assertAvailable(): Promise<void> {
    const { dayRemaining, minuteRemaining } = await this.snapshot();
    if (dayRemaining !== null && dayRemaining <= DAY_SAFETY_MARGIN) {
      throw new ApiBudgetExhaustedError('day', dayRemaining);
    }
    if (minuteRemaining !== null && minuteRemaining <= MINUTE_SAFETY_MARGIN) {
      throw new ApiBudgetExhaustedError('minute', minuteRemaining);
    }
  }

  async snapshot(): Promise<{ dayRemaining: number | null; minuteRemaining: number | null }> {
    if (Date.now() - this.leidoEn > CONFIAR_EN_MEMORIA_MS) {
      const valores = await this.kv.leer([DAY_KEY, MINUTE_KEY]);
      this.dia = valores.get(DAY_KEY) ?? null;
      this.minuto = valores.get(MINUTE_KEY) ?? null;
      this.leidoEn = Date.now();
    }
    return { dayRemaining: this.dia, minuteRemaining: this.minuto };
  }
}
