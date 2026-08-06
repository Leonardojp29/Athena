import { Module } from '@nestjs/common';
import { HealthModule } from './modules/health/health.module.js';

/**
 * Root module of the Athena modular monolith.
 * Domain modules (players, teams, matches, insights...) register here as
 * they are built; api and worker entrypoints share them.
 */
@Module({
  imports: [HealthModule],
})
export class AppModule {}
