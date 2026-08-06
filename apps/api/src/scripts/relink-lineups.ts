import 'reflect-metadata';
import { Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { bulkUpdateLineups } from '../modules/sync/bulk-upsert.js';
import { PrismaService } from '../shared/prisma.service.js';
import { SharedModule } from '../shared/shared.module.js';

@Module({ imports: [SharedModule] })
class RelinkModule {}

interface LineupEntry {
  playerRef?: string | null;
  playerId?: string | null;
  slug?: string | null;
  photoUrl?: string | null;
  name: string;
  number: number | null;
  position: string | null;
  grid: string | null;
}

/**
 * Revincula las alineaciones ya guardadas contra los jugadores que existen hoy y les mete
 * el slug y la foto dentro del JSONB.
 *
 * No gasta un solo request: la información ya está en la base, solo estaba desconectada
 * porque cuando se guardó la alineación el jugador todavía no existía. Se corre después de
 * la fase de temporadas del backfill, que es la que crea a los que faltaban.
 */
async function main(): Promise<void> {
  const app = await NestFactory.createApplicationContext(RelinkModule, {
    logger: ['warn', 'error'],
  });
  const prisma = app.get(PrismaService);

  const refs = await prisma.externalReference.findMany({
    where: { provider: 'api-football', entityType: 'player' },
    select: { providerRef: true, entityId: true },
  });
  const players = await prisma.player.findMany({
    select: { id: true, slug: true, photoUrl: true },
  });
  const byId = new Map(players.map((p) => [p.id, p]));
  const byRef = new Map(
    refs.flatMap((r) => {
      const row = byId.get(r.entityId);
      return row ? [[r.providerRef, row] as const] : [];
    }),
  );
  console.log(`${byRef.size} jugadores con referencia del proveedor`);

  const lineups = await prisma.matchLineup.findMany({
    select: { id: true, startXi: true, substitutes: true },
  });
  console.log(`${lineups.length} alineaciones a revisar`);

  const pendientes: Array<{ id: string; startXi: unknown; substitutes: unknown }> = [];
  let vinculados = 0;
  let sinVincular = 0;

  const enriquecer = (raw: unknown): { entries: LineupEntry[]; cambio: boolean } => {
    const entries = (Array.isArray(raw) ? raw : []) as LineupEntry[];
    let cambio = false;
    const salida = entries.map((entry) => {
      const row = entry.playerRef ? byRef.get(entry.playerRef) : undefined;
      if (!row) {
        sinVincular += 1;
        return entry;
      }
      vinculados += 1;
      if (entry.playerId === row.id && entry.slug === row.slug && entry.photoUrl === row.photoUrl) {
        return entry;
      }
      cambio = true;
      return { ...entry, playerId: row.id, slug: row.slug, photoUrl: row.photoUrl };
    });
    return { entries: salida, cambio };
  };

  for (const lineup of lineups) {
    const xi = enriquecer(lineup.startXi);
    const banco = enriquecer(lineup.substitutes);
    if (!xi.cambio && !banco.cambio) continue;
    pendientes.push({ id: lineup.id, startXi: xi.entries, substitutes: banco.entries });
  }

  const escritas = await bulkUpdateLineups(prisma, pendientes);

  const total = vinculados + sinVincular;
  const pct = total > 0 ? Math.round((vinculados / total) * 100) : 0;
  console.log(
    `${escritas} alineaciones actualizadas · ${vinculados}/${total} nombres vinculados (${pct}%)`,
  );
  await app.close();
}

void main();
