import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  slugify,
  type FootballDataProvider,
  type ProviderPlayer,
  type ProviderRef,
} from '@athena/domain';
import { PrismaService } from '../../shared/prisma.service.js';
import { FOOTBALL_DATA_PROVIDER } from '../providers/provider.tokens.js';
import { ExternalReferenceService } from './external-reference.service.js';

@Injectable()
export class SyncSquadUseCase {
  private readonly logger = new Logger(SyncSquadUseCase.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly refs: ExternalReferenceService,
    @Inject(FOOTBALL_DATA_PROVIDER) private readonly provider: FootballDataProvider,
  ) {}

  async execute(teamRef: string): Promise<number> {
    const squad = await this.provider.getSquad(teamRef);
    if (squad.length === 0) return 0;

    const known = await this.refs.resolveMany(
      this.provider.name,
      'player',
      squad.map((p) => p.providerRef),
    );

    const existing = squad.filter((p) => known.has(p.providerRef));
    for (const { providerRef, data } of existing) {
      await this.prisma.player.update({
        where: { id: known.get(providerRef) },
        data: { name: data.name, position: data.position, photoUrl: data.photoUrl },
      });
    }

    const fresh = squad.filter((p) => !known.has(p.providerRef));
    if (fresh.length > 0) {
      const slugs = await this.computeSlugs(fresh);
      const created = await this.prisma.player.createManyAndReturn({
        data: fresh.map(({ providerRef, data }) => ({
          name: data.name,
          slug: slugs.get(providerRef) as string,
          fullName: data.fullName,
          birthDate: data.birthDate ? new Date(data.birthDate) : null,
          nationality: data.nationality,
          heightCm: data.heightCm,
          position: data.position,
          photoUrl: data.photoUrl,
        })),
        select: { id: true },
      });
      await this.prisma.externalReference.createMany({
        data: created.map((player, i) => ({
          provider: this.provider.name,
          entityType: 'player',
          providerRef: fresh[i]?.providerRef as string,
          entityId: player.id,
        })),
      });

      const teamId = await this.refs.resolve(this.provider.name, 'team', teamRef);
      if (teamId) {
        await this.prisma.entityRelationship.createMany({
          data: created.map((player) => ({
            fromType: 'player',
            fromId: player.id,
            relation: 'played_for',
            toType: 'team',
            toId: teamId,
          })),
          skipDuplicates: true,
        });
      }
    }

    this.logger.log(
      `Plantilla ${teamRef}: ${fresh.length} nuevos, ${existing.length} actualizados`,
    );
    return squad.length;
  }

  private async computeSlugs(fresh: ProviderRef<ProviderPlayer>[]): Promise<Map<string, string>> {
    const bases = fresh.map((p) => slugify(p.data.name));
    const taken = new Set(
      (
        await this.prisma.player.findMany({
          where: { slug: { in: bases } },
          select: { slug: true },
        })
      ).map((p) => p.slug),
    );
    const result = new Map<string, string>();
    for (const [i, player] of fresh.entries()) {
      const base = bases[i] as string;
      const slug = taken.has(base) || !base ? `${base}-${player.providerRef}` : base;
      taken.add(slug);
      taken.add(base);
      result.set(player.providerRef, slug);
    }
    return result;
  }
}
