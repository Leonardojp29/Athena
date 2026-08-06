import { Inject, Injectable } from '@nestjs/common';
import type { Redis } from 'ioredis';
import { REDIS } from './redis.provider.js';

// La cuenta de API-Football es compartida con otros sistemas de la empresa:
// el presupuesto se basa siempre en el "remaining" real que reportan los headers,
// nunca en el límite teórico del plan.
const DAY_SAFETY_MARGIN = 500;
const MINUTE_SAFETY_MARGIN = 30;

const DAY_KEY = 'athena:budget:apifootball:day';
const MINUTE_KEY = 'athena:budget:apifootball:minute';

export class ApiBudgetExhaustedError extends Error {
  constructor(scope: 'day' | 'minute', remaining: number) {
    super(`API-Football budget exhausted (${scope}): ${remaining} requests remaining`);
    this.name = 'ApiBudgetExhaustedError';
  }
}

@Injectable()
export class ApiBudgetService {
  constructor(@Inject(REDIS) private readonly redis: Redis) {}

  async recordFromHeaders(headers: Headers): Promise<void> {
    const day = headers.get('x-ratelimit-requests-remaining');
    const minute = headers.get('x-ratelimit-remaining');
    const ops = this.redis.multi();
    if (day !== null) ops.set(DAY_KEY, day, 'EX', 86_400);
    if (minute !== null) ops.set(MINUTE_KEY, minute, 'EX', 60);
    await ops.exec();
  }

  async assertAvailable(): Promise<void> {
    const [day, minute] = await this.redis.mget(DAY_KEY, MINUTE_KEY);
    if (day !== null && Number(day) <= DAY_SAFETY_MARGIN) {
      throw new ApiBudgetExhaustedError('day', Number(day));
    }
    if (minute !== null && Number(minute) <= MINUTE_SAFETY_MARGIN) {
      throw new ApiBudgetExhaustedError('minute', Number(minute));
    }
  }

  async snapshot(): Promise<{ dayRemaining: number | null; minuteRemaining: number | null }> {
    const [day, minute] = await this.redis.mget(DAY_KEY, MINUTE_KEY);
    return {
      dayRemaining: day === null ? null : Number(day),
      minuteRemaining: minute === null ? null : Number(minute),
    };
  }
}
