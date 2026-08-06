import { Inject, Injectable, Logger } from '@nestjs/common';
import { findUnsupportedNumbers, type NarrativeGenerator } from '@athena/domain';
import type { Prisma } from '@athena/database';
import { PrismaService } from '../../shared/prisma.service.js';
import { FeatureFlagService, FLAGS } from '../feature-flags/feature-flag.service.js';
import { NARRATIVE_GENERATOR } from '../providers/provider.tokens.js';
import { MatchFactSheetBuilder, type MatchFactSheet } from './match-fact-sheet.builder.js';
import {
  MATCH_RECAP_PROMPT_VERSION,
  MATCH_RECAP_SCHEMA,
  MATCH_RECAP_SYSTEM,
  type MatchRecap,
} from './prompts.js';

export const MATCH_INSIGHT_KIND = 'post_match_analysis';

@Injectable()
export class GenerateMatchInsightUseCase {
  private readonly logger = new Logger(GenerateMatchInsightUseCase.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly factSheets: MatchFactSheetBuilder,
    private readonly flags: FeatureFlagService,
    @Inject(NARRATIVE_GENERATOR) private readonly narrator: NarrativeGenerator,
  ) {}

  async execute(matchId: string, opts: { force?: boolean } = {}): Promise<string | null> {
    if (!opts.force && !(await this.flags.isEnabled(FLAGS.aiInsights))) {
      this.logger.log(`Flag ${FLAGS.aiInsights} apagado: no se genera insight para ${matchId}`);
      return null;
    }

    const existing = await this.prisma.insight.findFirst({
      where: { subjectType: 'match', subjectId: matchId, kind: MATCH_INSIGHT_KIND },
      select: { id: true },
    });
    if (existing && !opts.force) return existing.id;

    const facts = await this.factSheets.build(matchId);
    if (facts.partido.estado !== 'finished') {
      this.logger.warn(`Partido ${matchId} no finalizado (${facts.partido.estado}): sin insight`);
      return null;
    }

    const recap = await this.generateValidated(facts, matchId);
    if (!recap) return null;

    const [, created] = await this.prisma.$transaction([
      this.prisma.insight.deleteMany({
        where: { subjectType: 'match', subjectId: matchId, kind: MATCH_INSIGHT_KIND },
      }),
      this.prisma.insight.create({
        data: {
          subjectType: 'match',
          subjectId: matchId,
          kind: MATCH_INSIGHT_KIND,
          narrative: JSON.stringify(recap.content),
          evidence: facts as unknown as Prisma.InputJsonValue,
          model: recap.model,
          promptVersion: MATCH_RECAP_PROMPT_VERSION,
          lang: 'es',
        },
        select: { id: true },
      }),
    ]);

    this.logger.log(`Insight generado para ${matchId}: "${recap.content.titular}"`);
    return created.id;
  }

  /**
   * Una narrativa con cifras que no están en la evidencia no se publica.
   * Se reintenta una vez señalando los números ofensores; si insiste, se descarta.
   */
  private async generateValidated(
    facts: MatchFactSheet,
    matchId: string,
  ): Promise<{ content: MatchRecap; model: string } | null> {
    const factsJson = JSON.stringify(facts, null, 2);
    let previousViolations: string[] = [];

    for (let attempt = 1; attempt <= 2; attempt++) {
      const system =
        previousViolations.length === 0
          ? MATCH_RECAP_SYSTEM
          : `${MATCH_RECAP_SYSTEM}\n\nINTENTO ANTERIOR RECHAZADO: citaste cifras que no están en los datos (${previousViolations.join(', ')}). Reescribe usando únicamente números presentes en los datos.`;

      const response = await this.narrator.generate<MatchRecap>({
        system,
        facts: factsJson,
        schema: MATCH_RECAP_SCHEMA as unknown as Record<string, unknown>,
        schemaName: 'analisis_partido',
      });

      const prose = [
        response.content.titular,
        response.content.analisis,
        ...response.content.claves,
      ].join('\n');
      const violations = findUnsupportedNumbers(prose, facts);
      if (violations.length === 0) {
        return { content: response.content, model: response.usage.model };
      }

      previousViolations = violations;
      this.logger.warn(
        `Intento ${attempt} para ${matchId} citó cifras sin respaldo: ${violations.join(', ')}`,
      );
    }

    this.logger.error(`Insight descartado para ${matchId}: no pasó la validación de cifras`);
    return null;
  }
}
