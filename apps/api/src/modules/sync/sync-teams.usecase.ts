import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  slugify,
  type FootballDataProvider,
  type ProviderRef,
  type ProviderTeam,
} from '@athena/domain';
import { PrismaService } from '../../shared/prisma.service.js';
import { FOOTBALL_DATA_PROVIDER } from '../providers/provider.tokens.js';
import { bulkUpdate } from './bulk-upsert.js';
import { ExternalReferenceService } from './external-reference.service.js';
import { VenueService } from './venue.service.js';

@Injectable()
export class SyncTeamsUseCase {
  private readonly logger = new Logger(SyncTeamsUseCase.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly refs: ExternalReferenceService,
    private readonly venues: VenueService,
    @Inject(FOOTBALL_DATA_PROVIDER) private readonly provider: FootballDataProvider,
  ) {}

  async execute(competitionRef: string, seasonYear: number): Promise<number> {
    const teams = await this.provider.getTeams(competitionRef, seasonYear);
    const venueIds = await this.venues.resolveMany(teams.map((t) => t.data.venue));
    const known = await this.refs.resolveMany(
      this.provider.name,
      'team',
      teams.map((t) => t.providerRef),
    );

    const fresh = teams.filter((t) => !known.has(t.providerRef));
    const existing = teams.filter((t) => known.has(t.providerRef));

    /*
     * En un lote y no uno por uno: las copas nacionales traen más de cien clubes cada una y un
     * UPDATE por equipo contra el pooler hacía que el bootstrap del catálogo tardara horas.
     */
    await bulkUpdate(this.prisma, {
      table: 'teams',
      columns: [
        { name: 'id', cast: '::uuid' },
        { name: 'name', cast: '::text' },
        { name: 'short_name', cast: '::text' },
        { name: 'country', cast: '::text' },
        { name: 'founded', cast: '::int' },
        { name: 'is_national_team', cast: '::boolean' },
        { name: 'logo_url', cast: '::text' },
        { name: 'venue_id', cast: '::uuid' },
      ],
      rows: existing.map(({ providerRef, data }) => ({
        id: known.get(providerRef),
        name: data.name,
        short_name: data.shortName,
        country: data.country,
        founded: data.founded,
        is_national_team: data.isNationalTeam,
        logo_url: data.logoUrl,
        venue_id: data.venue ? (venueIds.get(data.venue.providerRef) ?? null) : null,
      })),
      /* Lo que el proveedor no sabe no borra lo que ya había: el estadio y el año de fundación. */
      coalesce: ['short_name', 'country', 'founded', 'logo_url', 'venue_id'],
    });

    if (fresh.length > 0) {
      const slugs = await this.computeSlugs(fresh);
      const created = await this.prisma.team.createManyAndReturn({
        data: fresh.map(({ providerRef, data }) => ({
          name: data.name,
          slug: slugs.get(providerRef) as string,
          shortName: data.shortName,
          country: data.country,
          founded: data.founded,
          isNationalTeam: data.isNationalTeam,
          logoUrl: data.logoUrl,
          venueId: data.venue ? (venueIds.get(data.venue.providerRef) ?? null) : null,
        })),
        select: { id: true },
      });
      await this.prisma.externalReference.createMany({
        data: created.map((team, i) => ({
          provider: this.provider.name,
          entityType: 'team',
          providerRef: fresh[i]?.providerRef as string,
          entityId: team.id,
        })),
      });
    }

    this.logger.log(
      `Teams ${competitionRef}/${seasonYear}: ${fresh.length} created, ${existing.length} updated`,
    );
    return teams.length;
  }

  private async computeSlugs(fresh: ProviderRef<ProviderTeam>[]): Promise<Map<string, string>> {
    const bases = fresh.map((t) => slugify(t.data.name));
    const taken = new Set(
      (
        await this.prisma.team.findMany({ where: { slug: { in: bases } }, select: { slug: true } })
      ).map((t) => t.slug),
    );
    const result = new Map<string, string>();
    for (const [i, team] of fresh.entries()) {
      const base = bases[i] as string;
      const slug = taken.has(base) ? `${base}-${team.providerRef}` : base;
      taken.add(slug === base ? base : slug);
      taken.add(base);
      result.set(team.providerRef, slug);
    }
    return result;
  }
}
