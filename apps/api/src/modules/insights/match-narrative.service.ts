import { Inject, Injectable, Logger } from '@nestjs/common';
import type { Prisma } from '@athena/database';
import { findUnsupportedNumbers, type NarrativeGenerator } from '@athena/domain';
import { PrismaService } from '../../shared/prisma.service.js';
import { NARRATIVE_GENERATOR } from '../providers/provider.tokens.js';
import type { MatchFactSheet } from './match-fact-sheet.builder.js';

export interface NarrativeSpec {
  kind: string;
  promptVersion: string;
  system: string;
  schema: Record<string, unknown>;
  schemaName: string;
}

/**
 * Genera y persiste narrativas validadas contra su evidencia.
 * Compartido por el análisis post-partido y la previa: ambos difieren solo en
 * el prompt y el tipo, no en las garantías.
 */
@Injectable()
export class MatchNarrativeService {
  private readonly logger = new Logger(MatchNarrativeService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(NARRATIVE_GENERATOR) private readonly narrator: NarrativeGenerator,
  ) {}

  async generateAndStore(
    matchId: string,
    facts: MatchFactSheet,
    spec: NarrativeSpec,
  ): Promise<string | null> {
    const result = await this.generateValidated(facts, spec, matchId);
    if (!result) return null;

    const [, created] = await this.prisma.$transaction([
      this.prisma.insight.deleteMany({
        where: { subjectType: 'match', subjectId: matchId, kind: spec.kind },
      }),
      this.prisma.insight.create({
        data: {
          subjectType: 'match',
          subjectId: matchId,
          kind: spec.kind,
          narrative: JSON.stringify(result.content),
          evidence: facts as unknown as Prisma.InputJsonValue,
          model: result.model,
          promptVersion: spec.promptVersion,
          lang: 'es',
        },
        select: { id: true },
      }),
    ]);
    return created.id;
  }

  /**
   * Una narrativa con cifras que no están en la evidencia no se publica.
   * Se reintenta una vez señalando los números ofensores; si insiste, se descarta.
   */
  private async generateValidated(
    facts: MatchFactSheet,
    spec: NarrativeSpec,
    matchId: string,
  ): Promise<{ content: Record<string, unknown>; model: string } | null> {
    const factsJson = JSON.stringify(facts, null, 2);
    let previousViolations: string[] = [];

    for (let attempt = 1; attempt <= 2; attempt++) {
      const system =
        previousViolations.length === 0
          ? spec.system
          : `${spec.system}\n\nINTENTO ANTERIOR RECHAZADO: citaste cifras que no están en los datos (${previousViolations.join(', ')}). Reescribe usando únicamente números presentes en los datos.`;

      const response = await this.narrator.generate<Record<string, unknown>>({
        system,
        facts: factsJson,
        schema: spec.schema,
        schemaName: spec.schemaName,
      });

      const prose = collectStrings(response.content).join('\n');
      const violations = findUnsupportedNumbers(prose, facts);
      if (violations.length === 0) {
        return { content: response.content, model: response.usage.model };
      }

      previousViolations = violations;
      this.logger.warn(
        `${spec.kind} intento ${attempt} para ${matchId} citó cifras sin respaldo: ${violations.join(', ')}`,
      );
    }

    this.logger.error(`${spec.kind} descartado para ${matchId}: no pasó la validación de cifras`);
    return null;
  }
}

function collectStrings(value: unknown): string[] {
  if (typeof value === 'string') return [value];
  if (Array.isArray(value)) return value.flatMap(collectStrings);
  if (value && typeof value === 'object') return Object.values(value).flatMap(collectStrings);
  return [];
}
