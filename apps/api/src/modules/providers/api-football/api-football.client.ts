import { Injectable, Logger } from '@nestjs/common';
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

@Injectable()
export class ApiFootballClient {
  private readonly logger = new Logger(ApiFootballClient.name);
  private readonly baseUrl = 'https://v3.football.api-sports.io';

  constructor(private readonly budget: ApiBudgetService) {}

  async get<T>(path: string, params: Record<string, string | number> = {}): Promise<T[]> {
    await this.budget.assertAvailable();

    const url = new URL(path, this.baseUrl);
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, String(value));
    }

    const res = await fetch(url, {
      headers: { 'x-apisports-key': process.env.API_FOOTBALL_KEY ?? '' },
    });
    await this.budget.recordFromHeaders(res.headers);

    if (!res.ok) {
      throw new ApiFootballError(path, { httpStatus: res.status });
    }

    // El API devuelve errores dentro del envelope con HTTP 200
    const envelope = (await res.json()) as ApiFootballEnvelope<T>;
    const hasErrors = Array.isArray(envelope.errors)
      ? envelope.errors.length > 0
      : Object.keys(envelope.errors).length > 0;
    if (hasErrors) {
      throw new ApiFootballError(path, envelope.errors);
    }

    if (envelope.paging.total > envelope.paging.current) {
      this.logger.warn(
        `Paginated response not fully consumed: ${path} (page ${envelope.paging.current}/${envelope.paging.total})`,
      );
    }

    return envelope.response;
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
    await this.budget.assertAvailable();

    const url = new URL(path, this.baseUrl);
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, String(value));
    }

    const res = await fetch(url, {
      headers: { 'x-apisports-key': process.env.API_FOOTBALL_KEY ?? '' },
    });
    await this.budget.recordFromHeaders(res.headers);
    if (!res.ok) throw new ApiFootballError(path, { httpStatus: res.status });

    const envelope = (await res.json()) as ApiFootballEnvelope<T>;
    const hasErrors = Array.isArray(envelope.errors)
      ? envelope.errors.length > 0
      : Object.keys(envelope.errors).length > 0;
    if (hasErrors) throw new ApiFootballError(path, envelope.errors);

    return { items: envelope.response, paging: envelope.paging };
  }
}
