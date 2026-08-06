import { Module } from '@nestjs/common';
import { OpenAiModule } from '../providers/openai/openai.module.js';
import { GenerateMatchInsightUseCase } from './generate-match-insight.usecase.js';
import { MatchFactSheetBuilder } from './match-fact-sheet.builder.js';

@Module({
  imports: [OpenAiModule],
  providers: [MatchFactSheetBuilder, GenerateMatchInsightUseCase],
  exports: [GenerateMatchInsightUseCase, MatchFactSheetBuilder],
})
export class InsightsModule {}
