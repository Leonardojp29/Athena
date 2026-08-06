import { Module } from '@nestjs/common';
import { EMBEDDING_GENERATOR, NARRATIVE_GENERATOR } from '../provider.tokens.js';
import { OpenAiEmbeddingAdapter, OpenAiNarrativeAdapter } from './openai.adapter.js';

@Module({
  providers: [
    OpenAiNarrativeAdapter,
    OpenAiEmbeddingAdapter,
    { provide: NARRATIVE_GENERATOR, useExisting: OpenAiNarrativeAdapter },
    { provide: EMBEDDING_GENERATOR, useExisting: OpenAiEmbeddingAdapter },
  ],
  exports: [NARRATIVE_GENERATOR, EMBEDDING_GENERATOR],
})
export class OpenAiModule {}
