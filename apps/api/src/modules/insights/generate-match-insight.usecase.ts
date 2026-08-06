import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma.service.js';
import { FeatureFlagService, FLAGS } from '../feature-flags/feature-flag.service.js';
import { hasEnoughContextForPreview, MatchFactSheetBuilder } from './match-fact-sheet.builder.js';
import { MatchNarrativeService } from './match-narrative.service.js';
import {
  MATCH_PREVIEW_KIND,
  MATCH_PREVIEW_PROMPT_VERSION,
  MATCH_PREVIEW_SCHEMA,
  MATCH_PREVIEW_SYSTEM,
  MATCH_RECAP_KIND,
  MATCH_RECAP_PROMPT_VERSION,
  MATCH_RECAP_SCHEMA,
  MATCH_RECAP_SYSTEM,
} from './prompts.js';

export { MATCH_RECAP_KIND as MATCH_INSIGHT_KIND } from './prompts.js';

@Injectable()
export class GenerateMatchInsightUseCase {
  private readonly logger = new Logger(GenerateMatchInsightUseCase.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly factSheets: MatchFactSheetBuilder,
    private readonly narratives: MatchNarrativeService,
    private readonly flags: FeatureFlagService,
  ) {}

  /** Análisis post-partido. Requiere que el partido haya terminado. */
  async execute(matchId: string, opts: { force?: boolean } = {}): Promise<string | null> {
    return this.generate(matchId, opts, {
      kind: MATCH_RECAP_KIND,
      promptVersion: MATCH_RECAP_PROMPT_VERSION,
      system: MATCH_RECAP_SYSTEM,
      schema: MATCH_RECAP_SCHEMA as unknown as Record<string, unknown>,
      schemaName: 'analisis_partido',
      requiredStatus: 'finished',
    });
  }

  /** Previa. Requiere que el partido no se haya jugado todavía. */
  async executePreview(matchId: string, opts: { force?: boolean } = {}): Promise<string | null> {
    return this.generate(matchId, opts, {
      kind: MATCH_PREVIEW_KIND,
      promptVersion: MATCH_PREVIEW_PROMPT_VERSION,
      system: MATCH_PREVIEW_SYSTEM,
      schema: MATCH_PREVIEW_SCHEMA as unknown as Record<string, unknown>,
      schemaName: 'previa_partido',
      requiredStatus: 'scheduled',
      requiresPreviewContext: true,
    });
  }

  private async generate(
    matchId: string,
    opts: { force?: boolean },
    spec: {
      kind: string;
      promptVersion: string;
      system: string;
      schema: Record<string, unknown>;
      schemaName: string;
      requiredStatus: string;
      requiresPreviewContext?: boolean;
    },
  ): Promise<string | null> {
    if (!opts.force && !(await this.flags.isEnabled(FLAGS.aiInsights))) {
      this.logger.log(
        `Flag ${FLAGS.aiInsights} apagado: no se genera ${spec.kind} para ${matchId}`,
      );
      return null;
    }

    const existing = await this.prisma.insight.findFirst({
      where: { subjectType: 'match', subjectId: matchId, kind: spec.kind },
      select: { id: true },
    });
    if (existing && !opts.force) return existing.id;

    const facts = await this.factSheets.build(matchId);
    if (facts.partido.estado !== spec.requiredStatus) {
      this.logger.warn(
        `Partido ${matchId} en estado ${facts.partido.estado}: no corresponde ${spec.kind}`,
      );
      return null;
    }

    if (spec.requiresPreviewContext && !hasEnoughContextForPreview(facts)) {
      this.logger.log(`Sin contexto suficiente para la previa de ${matchId}: se omite`);
      return null;
    }

    const id = await this.narratives.generateAndStore(matchId, facts, spec);
    if (id) this.logger.log(`${spec.kind} generado para ${matchId}`);
    return id;
  }
}
