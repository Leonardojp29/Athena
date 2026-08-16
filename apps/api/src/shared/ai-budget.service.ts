import { Injectable, Logger } from '@nestjs/common';
import { KvService } from './kv.service.js';

const KEY = 'presupuesto:openai:tokens';

export class AiBudgetExhaustedError extends Error {
  constructor(spent: number, cap: number) {
    super(`OpenAI daily token budget exhausted: ${spent}/${cap}`);
    this.name = 'AiBudgetExhaustedError';
  }
}

/**
 * Tope duro diario de tokens. A diferencia de la cuota de API-Football (que el
 * proveedor reporta), aquí el gasto es ilimitado por defecto: el tope lo ponemos
 * nosotros para que un bug no se traduzca en factura.
 *
 * La suma vive en Postgres y es atómica entre procesos: en serverless pueden convivir varias
 * instancias generando análisis, y el tope no puede depender de quién sumó último.
 */
@Injectable()
export class AiBudgetService {
  private readonly logger = new Logger(AiBudgetService.name);
  private readonly dailyCap = Number(process.env.OPENAI_DAILY_TOKEN_CAP ?? 2_000_000);

  constructor(private readonly kv: KvService) {}

  async assertAvailable(): Promise<void> {
    const spent = (await this.kv.leer([this.key()])).get(this.key()) ?? 0;
    if (spent >= this.dailyCap) throw new AiBudgetExhaustedError(spent, this.dailyCap);
  }

  async record(inputTokens: number, outputTokens: number, model: string): Promise<void> {
    const total = inputTokens + outputTokens;
    const spent = await this.kv.incrementar(this.key(), total, 172_800);
    this.logger.log(
      `${model}: +${total} tokens (in ${inputTokens} / out ${outputTokens}) · día ${spent}/${this.dailyCap}`,
    );
  }

  async snapshot(): Promise<{ spent: number; cap: number }> {
    return { spent: (await this.kv.leer([this.key()])).get(this.key()) ?? 0, cap: this.dailyCap };
  }

  private key(): string {
    return `${KEY}:${new Date().toISOString().slice(0, 10)}`;
  }
}
