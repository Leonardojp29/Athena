import { Module } from '@nestjs/common';
import { OpenAiModule } from '../providers/openai/openai.module.js';
import { EmbeddingRepository } from './embedding.repository.js';
import { SearchController } from './search.controller.js';
import { SearchService } from './search.service.js';
import { SyncEmbeddingsUseCase } from './sync-embeddings.usecase.js';

@Module({
  imports: [OpenAiModule],
  controllers: [SearchController],
  providers: [EmbeddingRepository, SearchService, SyncEmbeddingsUseCase],
  exports: [SearchService, SyncEmbeddingsUseCase],
})
export class SearchModule {}
