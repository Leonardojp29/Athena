import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiFootballClient, ApiFootballError } from './api-football.client.js';
import type { ApiBudgetService } from '../../../shared/api-budget.service.js';

function fakeBudget(overrides: Partial<ApiBudgetService> = {}): ApiBudgetService {
  return {
    assertAvailable: vi.fn().mockResolvedValue(undefined),
    recordFromHeaders: vi.fn().mockResolvedValue(undefined),
    snapshot: vi.fn(),
    ...overrides,
  } as unknown as ApiBudgetService;
}

function fakeResponse(body: unknown, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), { status: 200, headers });
}

const emptyEnvelope = {
  get: 'x',
  parameters: {},
  errors: {},
  results: 0,
  paging: { current: 1, total: 1 },
  response: [],
};

afterEach(() => vi.restoreAllMocks());

describe('ApiFootballClient', () => {
  it('throws when the envelope carries errors despite HTTP 200', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(fakeResponse({ ...emptyEnvelope, errors: { token: 'Invalid key' } })),
    );
    const client = new ApiFootballClient(fakeBudget());
    await expect(client.get('/status')).rejects.toThrow(ApiFootballError);
  });

  it('reports quota headers to the budget on every call', async () => {
    const budget = fakeBudget();
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(
          fakeResponse(emptyEnvelope, { 'x-ratelimit-requests-remaining': '140000' }),
        ),
    );
    const client = new ApiFootballClient(budget);
    await client.get('/leagues', { id: 281 });

    expect(budget.assertAvailable).toHaveBeenCalledOnce();
    expect(budget.recordFromHeaders).toHaveBeenCalledOnce();
  });

  it('refuses to call the API when the budget is exhausted', async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    const budget = fakeBudget({
      assertAvailable: vi.fn().mockRejectedValue(new Error('exhausted')),
    });
    const client = new ApiFootballClient(budget);

    await expect(client.get('/fixtures')).rejects.toThrow('exhausted');
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('returns the response array on success', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(
          fakeResponse({ ...emptyEnvelope, results: 1, response: [{ ok: true }] }),
        ),
    );
    const client = new ApiFootballClient(fakeBudget());
    await expect(client.get('/leagues')).resolves.toEqual([{ ok: true }]);
  });
});
