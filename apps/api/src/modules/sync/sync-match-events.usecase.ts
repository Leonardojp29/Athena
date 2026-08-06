import { Inject, Injectable, Logger } from '@nestjs/common';
import type { FootballDataProvider } from '@athena/domain';
import { FOOTBALL_DATA_PROVIDER } from '../providers/provider.tokens.js';
import { ExternalReferenceService } from './external-reference.service.js';
import { MatchEventWriter } from './match-event.writer.js';

@Injectable()
export class SyncMatchEventsUseCase {
  private readonly logger = new Logger(SyncMatchEventsUseCase.name);

  constructor(
    private readonly refs: ExternalReferenceService,
    private readonly writer: MatchEventWriter,
    @Inject(FOOTBALL_DATA_PROVIDER) private readonly provider: FootballDataProvider,
  ) {}

  async execute(matchProviderRef: string): Promise<number> {
    const matchId = await this.refs.resolve(this.provider.name, 'match', matchProviderRef);
    if (!matchId) throw new Error(`Match not synced: ${matchProviderRef}`);

    const events = await this.provider.getMatchEvents(matchProviderRef);
    const written = await this.writer.replace(this.provider.name, matchId, events);
    this.logger.log(`Events for match ${matchProviderRef}: ${written} rows`);
    return written;
  }
}
