import { describe, expect, it } from 'vitest';
import { HealthController } from './health.controller.js';

describe('HealthController', () => {
  it('reports ok with uptime and timestamp', () => {
    const report = new HealthController().check();
    expect(report.status).toBe('ok');
    expect(report.uptimeSeconds).toBeGreaterThanOrEqual(0);
    expect(new Date(report.timestamp).getTime()).not.toBeNaN();
  });
});
