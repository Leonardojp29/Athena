// Puertos de IA. El dominio no conoce OpenAI: pide narrativas y vectores.

export interface NarrativeRequest {
  /** Instrucciones de rol y estilo; no contiene datos del partido. */
  system: string;
  /** Hechos verificables serializados. La narrativa solo puede apoyarse en esto. */
  facts: string;
  /** JSON Schema estricto de la respuesta esperada. */
  schema: Record<string, unknown>;
  schemaName: string;
  maxOutputTokens?: number;
}

export interface NarrativeUsage {
  model: string;
  inputTokens: number;
  outputTokens: number;
}

export interface NarrativeResponse<T> {
  content: T;
  usage: NarrativeUsage;
}

export interface NarrativeGenerator {
  readonly name: string;
  generate<T>(request: NarrativeRequest): Promise<NarrativeResponse<T>>;
}

export interface EmbeddingGenerator {
  readonly model: string;
  readonly dimensions: number;
  embed(texts: string[]): Promise<number[][]>;
}

/** Cifras citadas en una narrativa que no existen en la evidencia. */
export function findUnsupportedNumbers(narrative: string, evidence: unknown): string[] {
  const allowed = new Set<string>();
  const collect = (value: unknown): void => {
    if (typeof value === 'number') {
      allowed.add(String(value));
      return;
    }
    if (typeof value === 'string') {
      for (const match of value.matchAll(/\d+/g)) allowed.add(match[0]);
      return;
    }
    if (Array.isArray(value)) {
      value.forEach(collect);
      return;
    }
    if (value && typeof value === 'object') {
      Object.values(value).forEach(collect);
    }
  };
  collect(evidence);

  const cited = [...narrative.matchAll(/\d+/g)].map((m) => m[0]);
  return [...new Set(cited.filter((n) => !allowed.has(n)))];
}
