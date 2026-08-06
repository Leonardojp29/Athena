import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma.service.js';
import type { AuthenticatedUser } from '../auth/supabase-token.service.js';

export const FAVORITE_TYPES = ['team', 'competition', 'player'] as const;
export type FavoriteType = (typeof FAVORITE_TYPES)[number];

export interface FavoriteEntity {
  entityType: FavoriteType;
  entityId: string;
  name: string;
  slug: string;
  imageUrl: string | null;
}

@Injectable()
export class FavoritesService {
  constructor(private readonly prisma: PrismaService) {}

  /** El perfil se crea al primer uso: Supabase ya validó la identidad. */
  async ensureProfile(user: AuthenticatedUser): Promise<void> {
    await this.prisma.userProfile.upsert({
      where: { id: user.id },
      update: {},
      create: { id: user.id, displayName: user.email?.split('@')[0] ?? null },
    });
  }

  async list(userId: string): Promise<FavoriteEntity[]> {
    const rows = await this.prisma.favorite.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' },
      select: { entityType: true, entityId: true },
    });
    return this.hydrate(rows);
  }

  async add(
    user: AuthenticatedUser,
    entityType: string,
    entityId: string,
  ): Promise<FavoriteEntity[]> {
    const type = this.assertType(entityType);
    await this.assertEntityExists(type, entityId);
    await this.ensureProfile(user);

    await this.prisma.favorite.upsert({
      where: { userId_entityType_entityId: { userId: user.id, entityType: type, entityId } },
      update: {},
      create: { userId: user.id, entityType: type, entityId },
    });
    return this.list(user.id);
  }

  async remove(userId: string, entityType: string, entityId: string): Promise<FavoriteEntity[]> {
    const type = this.assertType(entityType);
    await this.prisma.favorite.deleteMany({ where: { userId, entityType: type, entityId } });
    return this.list(userId);
  }

  private assertType(value: string): FavoriteType {
    if (!FAVORITE_TYPES.includes(value as FavoriteType)) {
      throw new BadRequestException(`Tipo no seguible: ${value}`);
    }
    return value as FavoriteType;
  }

  private async assertEntityExists(type: FavoriteType, id: string): Promise<void> {
    const exists =
      type === 'team'
        ? await this.prisma.team.findUnique({ where: { id }, select: { id: true } })
        : type === 'competition'
          ? await this.prisma.competition.findUnique({ where: { id }, select: { id: true } })
          : await this.prisma.player.findUnique({ where: { id }, select: { id: true } });
    if (!exists) throw new NotFoundException(`No existe ${type} ${id}`);
  }

  private async hydrate(
    rows: Array<{ entityType: string; entityId: string }>,
  ): Promise<FavoriteEntity[]> {
    const idsBy = (type: string): string[] =>
      rows.filter((r) => r.entityType === type).map((r) => r.entityId);

    const [teams, competitions, players] = await Promise.all([
      this.prisma.team.findMany({
        where: { id: { in: idsBy('team') } },
        select: { id: true, name: true, slug: true, logoUrl: true },
      }),
      this.prisma.competition.findMany({
        where: { id: { in: idsBy('competition') } },
        select: { id: true, name: true, slug: true, logoUrl: true },
      }),
      this.prisma.player.findMany({
        where: { id: { in: idsBy('player') } },
        select: { id: true, name: true, slug: true, photoUrl: true },
      }),
    ]);

    const index = new Map<string, FavoriteEntity>();
    for (const t of teams)
      index.set(`team:${t.id}`, {
        entityType: 'team',
        entityId: t.id,
        name: t.name,
        slug: t.slug,
        imageUrl: t.logoUrl,
      });
    for (const c of competitions)
      index.set(`competition:${c.id}`, {
        entityType: 'competition',
        entityId: c.id,
        name: c.name,
        slug: c.slug,
        imageUrl: c.logoUrl,
      });
    for (const p of players)
      index.set(`player:${p.id}`, {
        entityType: 'player',
        entityId: p.id,
        name: p.name,
        slug: p.slug,
        imageUrl: p.photoUrl,
      });

    return rows.flatMap((row) => {
      const found = index.get(`${row.entityType}:${row.entityId}`);
      return found ? [found] : [];
    });
  }
}
