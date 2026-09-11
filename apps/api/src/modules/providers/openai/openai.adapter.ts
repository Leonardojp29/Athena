import { Injectable, Logger } from '@nestjs/common';
import OpenAI from 'openai';
import type {
  EmbeddingGenerator,
  NarrativeGenerator,
  NarrativeRequest,
  NarrativeResponse,
} from '@athena/domain';
import { AiBudgetService } from '../../../shared/ai-budget.service.js';

/**
 * El cliente se construye al primer uso y no al arrancar.
 *
 * `new OpenAI()` explota si falta la credencial, y eso tumbaba el API entero: sin clave de OpenAI
 * no hay análisis, pero las tablas, los partidos y el juego no tienen nada que ver con eso.
 */
function clienteDeOpenAi(timeoutMs: number): () => OpenAI {
  let cliente: OpenAI | undefined;
  return () => (cliente ??= new OpenAI({ maxRetries: 3, timeout: timeoutMs }));
}

export class NarrativeRefusedError extends Error {
  constructor(reason: string) {
    super(`Model refused to answer: ${reason}`);
    this.name = 'NarrativeRefusedError';
  }
}

@Injectable()
export class OpenAiNarrativeAdapter implements NarrativeGenerator {
  readonly name = 'openai';
  private readonly logger = new Logger(OpenAiNarrativeAdapter.name);
  private readonly cliente = clienteDeOpenAi(120_000);
  private readonly model = process.env.OPENAI_INSIGHT_MODEL ?? 'gpt-5.4-mini';

  constructor(private readonly budget: AiBudgetService) {}

  async generate<T>(request: NarrativeRequest): Promise<NarrativeResponse<T>> {
    await this.budget.assertAvailable();

    const response = await this.cliente().responses.create({
      model: this.model,
      instructions: request.system,
      input: request.facts,
      max_output_tokens: request.maxOutputTokens ?? 1_200,
      text: {
        format: {
          type: 'json_schema',
          name: request.schemaName,
          strict: true,
          schema: request.schema,
        },
      },
    });

    const usage = {
      model: response.model,
      inputTokens: response.usage?.input_tokens ?? 0,
      outputTokens: response.usage?.output_tokens ?? 0,
    };
    await this.budget.record(usage.inputTokens, usage.outputTokens, usage.model);

    const refusal = response.output
      .flatMap((item) => (item.type === 'message' ? item.content : []))
      .find((part) => part.type === 'refusal');
    if (refusal && refusal.type === 'refusal') throw new NarrativeRefusedError(refusal.refusal);

    const text = response.output_text;
    if (!text) throw new Error(`Empty response from ${this.model} (status ${response.status})`);

    return { content: JSON.parse(text) as T, usage };
  }
}

@Injectable()
export class OpenAiEmbeddingAdapter implements EmbeddingGenerator {
  readonly model = process.env.OPENAI_EMBEDDING_MODEL ?? 'text-embedding-3-small';
  readonly dimensions = 1536;
  private readonly cliente = clienteDeOpenAi(60_000);

  constructor(private readonly budget: AiBudgetService) {}

  async embed(texts: string[]): Promise<number[][]> {
    if (texts.length === 0) return [];
    await this.budget.assertAvailable();

    const response = await this.cliente().embeddings.create({
      model: this.model,
      input: texts,
      dimensions: this.dimensions,
    });
    await this.budget.record(response.usage.total_tokens, 0, this.model);

    return response.data.sort((a, b) => a.index - b.index).map((item) => item.embedding);
  }
}
