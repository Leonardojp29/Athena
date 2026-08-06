import { Module } from '@nestjs/common';
import { ApiFootballModule } from '../providers/api-football/api-football.module.js';
import { DomainEventPublisher } from './domain-event.publisher.js';
import { ExternalReferenceService } from './external-reference.service.js';
import { SyncCompetitionUseCase } from './sync-competition.usecase.js';
import { MatchEventWriter } from './match-event.writer.js';
import { SyncFixturesUseCase } from './sync-fixtures.usecase.js';
import { SyncMatchEventsUseCase } from './sync-match-events.usecase.js';
import { SyncStandingsUseCase } from './sync-standings.usecase.js';
import { SyncTeamsUseCase } from './sync-teams.usecase.js';

@Module({
  imports: [ApiFootballModule],
  providers: [
    ExternalReferenceService,
    DomainEventPublisher,
    SyncCompetitionUseCase,
    SyncTeamsUseCase,
    SyncFixturesUseCase,
    SyncStandingsUseCase,
    SyncMatchEventsUseCase,
    MatchEventWriter,
  ],
  exports: [
    SyncCompetitionUseCase,
    SyncTeamsUseCase,
    SyncFixturesUseCase,
    SyncStandingsUseCase,
    SyncMatchEventsUseCase,
  ],
})
export class SyncModule {}
