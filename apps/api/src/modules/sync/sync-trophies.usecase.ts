import { Inject, Injectable } from '@nestjs/common';
import type { FootballDataProvider } from '@athena/domain';
import { PrismaService } from '../../shared/prisma.service.js';
import { FOOTBALL_DATA_PROVIDER } from '../providers/provider.tokens.js';
import { ExternalReferenceService } from './external-reference.service.js';

/**
 * El palmarés de un futbolista.
 *
 * Se reemplaza entero en lugar de reconciliar fila por fila, igual que los eventos de un partido:
 * un palmarés son treinta filas como mucho y cambia una vez al año, así que comparar cuesta más que
 * rehacer. Las dos operaciones van en una transacción para que nadie lea una ficha a medio escribir.
 */
@Injectable()
export class SyncTrophiesUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly refs: ExternalReferenceService,
    @Inject(FOOTBALL_DATA_PROVIDER) private readonly provider: FootballDataProvider,
  ) {}

  async execute(playerRef: string): Promise<number> {
    const playerId = await this.refs.resolve(this.provider.name, 'player', playerRef);
    if (!playerId) return 0;

    const palmares = await this.provider.getTrophies(playerRef);

    /*
     * Sin títulos no se borra lo que ya había: que el proveedor no conteste esta vez no significa
     * que el jugador haya dejado de ganarlos. Vaciar una ficha por un hueco del feed es peor que
     * dejarla como estaba.
     */
    if (palmares.length === 0) return 0;

    await this.prisma.$transaction([
      this.prisma.playerTrophy.deleteMany({ where: { playerId } }),
      this.prisma.playerTrophy.createMany({
        data: palmares.map((t) => ({
          playerId,
          competencia: t.competencia,
          pais: t.pais,
          temporada: t.temporada,
          puesto: t.puesto,
        })),
      }),
    ]);

    return palmares.length;
  }
}
