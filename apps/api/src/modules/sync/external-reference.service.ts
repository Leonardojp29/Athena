import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma.service.js';

export type RefEntityType =
  'player' | 'team' | 'competition' | 'season' | 'match' | 'venue' | 'coach';

@Injectable()
export class ExternalReferenceService {
  constructor(private readonly prisma: PrismaService) {}

  async resolve(
    provider: string,
    entityType: RefEntityType,
    providerRef: string,
  ): Promise<string | null> {
    const row = await this.prisma.externalReference.findUnique({
      where: { provider_entityType_providerRef: { provider, entityType, providerRef } },
      select: { entityId: true },
    });
    return row?.entityId ?? null;
  }

  async resolveMany(
    provider: string,
    entityType: RefEntityType,
    providerRefs: string[],
  ): Promise<Map<string, string>> {
    const rows = await this.prisma.externalReference.findMany({
      where: { provider, entityType, providerRef: { in: providerRefs } },
      select: { providerRef: true, entityId: true },
    });
    return new Map(rows.map((r) => [r.providerRef, r.entityId]));
  }

  async link(
    provider: string,
    entityType: RefEntityType,
    providerRef: string,
    entityId: string,
  ): Promise<void> {
    await this.prisma.externalReference.upsert({
      where: { provider_entityType_providerRef: { provider, entityType, providerRef } },
      update: {},
      create: { provider, entityType, providerRef, entityId },
    });
  }
}
