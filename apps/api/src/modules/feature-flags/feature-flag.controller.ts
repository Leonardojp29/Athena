import { Controller, Get, Header } from '@nestjs/common';
import { FeatureFlagService } from './feature-flag.service.js';

@Controller('config')
export class FeatureFlagController {
  constructor(private readonly flags: FeatureFlagService) {}

  @Get()
  @Header('Cache-Control', 'public, s-maxage=30, stale-while-revalidate=60')
  async config(): Promise<{ flags: Record<string, boolean> }> {
    return { flags: await this.flags.all() };
  }
}
