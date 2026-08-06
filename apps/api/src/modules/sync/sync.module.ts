import { Module } from '@nestjs/common';
import { ApiFootballModule } from '../providers/api-football/api-football.module.js';
import { DomainEventPublisher } from './domain-event.publisher.js';
import { ExternalReferenceService } from './external-reference.service.js';
import { MatchEventWriter } from './match-event.writer.js';
import { OutboxService } from './outbox.service.js';
import { PlayerResolverService } from './player-resolver.service.js';
import { SyncCompetitionUseCase } from './sync-competition.usecase.js';
import { SyncFixturesUseCase } from './sync-fixtures.usecase.js';
import { SyncMatchDetailUseCase } from './sync-match-detail.usecase.js';
import { SyncMatchEventsUseCase } from './sync-match-events.usecase.js';
import { SyncMatchPlayersUseCase } from './sync-match-players.usecase.js';
import { SyncSeasonPlayersUseCase } from './sync-season-players.usecase.js';
import { SyncSquadUseCase } from './sync-squad.usecase.js';
import { SyncStandingsUseCase } from './sync-standings.usecase.js';
import { SyncTeamsUseCase } from './sync-teams.usecase.js';
import { VenueService } from './venue.service.js';

@Module({
  imports: [ApiFootballModule],
  providers: [
    ExternalReferenceService,
    DomainEventPublisher,
    MatchEventWriter,
    OutboxService,
    PlayerResolverService,
    VenueService,
    SyncCompetitionUseCase,
    SyncTeamsUseCase,
    SyncFixturesUseCase,
    SyncStandingsUseCase,
    SyncMatchEventsUseCase,
    SyncMatchDetailUseCase,
    SyncMatchPlayersUseCase,
    SyncSeasonPlayersUseCase,
    SyncSquadUseCase,
  ],
  exports: [
    OutboxService,
    SyncCompetitionUseCase,
    SyncTeamsUseCase,
    SyncFixturesUseCase,
    SyncStandingsUseCase,
    SyncMatchEventsUseCase,
    SyncMatchDetailUseCase,
    SyncMatchPlayersUseCase,
    SyncSeasonPlayersUseCase,
    SyncSquadUseCase,
  ],
})
export class SyncModule {}
