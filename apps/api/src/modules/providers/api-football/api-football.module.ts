import { Module } from '@nestjs/common';
import { FOOTBALL_DATA_PROVIDER } from '../provider.tokens.js';
import { ApiFootballAdapter } from './api-football.adapter.js';
import { ApiFootballClient } from './api-football.client.js';

@Module({
  providers: [
    ApiFootballClient,
    ApiFootballAdapter,
    { provide: FOOTBALL_DATA_PROVIDER, useExisting: ApiFootballAdapter },
  ],
  exports: [FOOTBALL_DATA_PROVIDER],
})
export class ApiFootballModule {}
