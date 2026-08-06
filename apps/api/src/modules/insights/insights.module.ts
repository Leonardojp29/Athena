import { Module } from '@nestjs/common';
import { OpenAiModule } from '../providers/openai/openai.module.js';
import { GenerateMatchInsightUseCase } from './generate-match-insight.usecase.js';
import { MatchFactSheetBuilder } from './match-fact-sheet.builder.js';
import { MatchNarrativeService } from './match-narrative.service.js';

@Module({
  imports: [OpenAiModule],
  providers: [MatchFactSheetBuilder, MatchNarrativeService, GenerateMatchInsightUseCase],
  exports: [GenerateMatchInsightUseCase, MatchFactSheetBuilder],
})
export class InsightsModule {}
