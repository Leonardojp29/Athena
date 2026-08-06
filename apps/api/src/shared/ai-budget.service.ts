import { Inject, Injectable, Logger } from '@nestjs/common';
import type { Redis } from 'ioredis';
import { REDIS } from './redis.provider.js';

const KEY = 'athena:budget:openai:tokens';

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
 */
@Injectable()
export class AiBudgetService {
  private readonly logger = new Logger(AiBudgetService.name);
  private readonly dailyCap = Number(process.env.OPENAI_DAILY_TOKEN_CAP ?? 2_000_000);

  constructor(@Inject(REDIS) private readonly redis: Redis) {}

  async assertAvailable(): Promise<void> {
    const spent = Number((await this.redis.get(this.key())) ?? 0);
    if (spent >= this.dailyCap) throw new AiBudgetExhaustedError(spent, this.dailyCap);
  }

  async record(inputTokens: number, outputTokens: number, model: string): Promise<void> {
    const total = inputTokens + outputTokens;
    const spent = await this.redis.incrby(this.key(), total);
    await this.redis.expire(this.key(), 172_800);
    this.logger.log(
      `${model}: +${total} tokens (in ${inputTokens} / out ${outputTokens}) · día ${spent}/${this.dailyCap}`,
    );
  }

  async snapshot(): Promise<{ spent: number; cap: number }> {
    return { spent: Number((await this.redis.get(this.key())) ?? 0), cap: this.dailyCap };
  }

  private key(): string {
    return `${KEY}:${new Date().toISOString().slice(0, 10)}`;
  }
}
