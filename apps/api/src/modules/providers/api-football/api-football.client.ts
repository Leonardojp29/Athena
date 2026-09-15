import { Injectable, Logger } from '@nestjs/common';
import { API_FOOTBALL_BASE_URL } from '../../../shared/entorno.js';
import { ApiBudgetService } from '../../../shared/api-budget.service.js';
import type { ApiFootballEnvelope } from './api-football.types.js';

export class ApiFootballError extends Error {
  constructor(
    readonly endpoint: string,
    readonly details: unknown,
  ) {
    super(`API-Football error on ${endpoint}: ${JSON.stringify(details)}`);
    this.name = 'ApiFootballError';
  }
}

/*
 * El plan permite 900 peticiones por minuto y el backfill las pasaba: con seis obreros haciendo
 * tres pedidos cada uno, el proveedor empezaba a devolver "Too many requests" dentro del envelope
 * —con HTTP 200— y cada partido se perdía sin más. El techo se respeta acá, en el único lugar por
 * donde pasan todas las peticiones, y no en cada script.
 */
const POR_MINUTO = Number(process.env.API_FOOTBALL_RATE_PER_MINUTE ?? 700);
const REINTENTOS = 2;
const ESPERA_REINTENTO_MS = 5_000;

@Injectable()
export class ApiFootballClient {
  private readonly logger = new Logger(ApiFootballClient.name);
  private readonly baseUrl = API_FOOTBALL_BASE_URL;
  /** Marcas de tiempo de las peticiones del último minuto. */
  private readonly ventana: number[] = [];

  constructor(private readonly budget: ApiBudgetService) {}

  async get<T>(path: string, params: Record<string, string | number> = {}): Promise<T[]> {
    const { items, paging } = await this.getPage<T>(path, params);

    if (paging.total > paging.current) {
      this.logger.warn(
        `Paginated response not fully consumed: ${path} (page ${paging.current}/${paging.total})`,
      );
    }
    return items;
  }

  /**
   * Recorre todas las páginas. /players devuelve 20 por página: sin esto una liga entera
   * entraría a la base con los primeros veinte futbolistas y el resto en silencio.
   */
  async getAllPages<T>(
    path: string,
    params: Record<string, string | number> = {},
    maxPages = 60,
  ): Promise<T[]> {
    const all: T[] = [];
    let page = 1;
    let totalPages = 1;

    do {
      const { items, paging } = await this.getPage<T>(path, { ...params, page });
      all.push(...items);
      totalPages = paging.total;
      page += 1;
    } while (page <= totalPages && page <= maxPages);

    if (totalPages > maxPages) {
      this.logger.warn(`${path}: ${totalPages} páginas exceden el tope de ${maxPages}`);
    }
    return all;
  }

  private async getPage<T>(
    path: string,
    params: Record<string, string | number>,
  ): Promise<{ items: T[]; paging: { current: number; total: number } }> {
    for (let intento = 0; ; intento++) {
      try {
        return await this.pedir<T>(path, params);
      } catch (error) {
        if (intento >= REINTENTOS || !esLimiteDeTasa(error)) throw error;
        this.logger.warn(`${path}: límite por minuto alcanzado, reintento en 5 s`);
        await esperar(ESPERA_REINTENTO_MS);
      }
    }
  }

  private async pedir<T>(
    path: string,
    params: Record<string, string | number>,
  ): Promise<{ items: T[]; paging: { current: number; total: number } }> {
    await this.budget.assertAvailable();
    await this.esperarTurno();

    const url = new URL(path, this.baseUrl);
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, String(value));
    }

    const res = await fetch(url, {
      headers: { 'x-apisports-key': process.env.API_FOOTBALL_KEY ?? '' },
    });
    await this.budget.recordFromHeaders(res.headers);
    if (!res.ok) throw new ApiFootballError(path, { httpStatus: res.status });

    /* El API devuelve errores dentro del envelope con HTTP 200. */
    const envelope = (await res.json()) as ApiFootballEnvelope<T>;
    const hasErrors = Array.isArray(envelope.errors)
      ? envelope.errors.length > 0
      : Object.keys(envelope.errors).length > 0;
    if (hasErrors) throw new ApiFootballError(path, envelope.errors);

    return { items: envelope.response, paging: envelope.paging };
  }

  /** Cede el turno hasta que quepa otra petición en el minuto en curso. */
  private async esperarTurno(): Promise<void> {
    for (;;) {
      const ahora = Date.now();
      while (this.ventana.length > 0 && ahora - (this.ventana[0] as number) >= 60_000) {
        this.ventana.shift();
      }
      if (this.ventana.length < POR_MINUTO) {
        this.ventana.push(ahora);
        return;
      }
      await esperar(60_000 - (ahora - (this.ventana[0] as number)) + 10);
    }
  }
}

function esLimiteDeTasa(error: unknown): boolean {
  if (!(error instanceof ApiFootballError)) return false;
  return JSON.stringify(error.details).toLowerCase().includes('too many requests');
}

function esperar(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
