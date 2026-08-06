import { Controller, Get } from '@nestjs/common';

export interface HealthReport {
  status: 'ok';
  uptimeSeconds: number;
  timestamp: string;
}

@Controller('health')
export class HealthController {
  @Get()
  check(): HealthReport {
    return {
      status: 'ok',
      uptimeSeconds: Math.round(process.uptime()),
      timestamp: new Date().toISOString(),
    };
  }
}
