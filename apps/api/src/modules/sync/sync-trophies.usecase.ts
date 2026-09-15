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

  /**
   * @param yaResuelto El id del futbolista cuando quien llama ya lo tiene. Se ahorra un viaje a la
   * base por jugador, que rellenando veintisiete mil fichas son horas.
   */
  async execute(playerRef: string, yaResuelto?: string): Promise<number> {
    const playerId =
      yaResuelto ?? (await this.refs.resolve(this.provider.name, 'player', playerRef));
    if (!playerId) return 0;

    const palmares = await this.provider.getTrophies(playerRef);

    /*
     * Sin títulos no se borra lo que ya había: que el proveedor no conteste esta vez no significa
     * que el jugador haya dejado de ganarlos. Vaciar una ficha por un hueco del feed es peor que
     * dejarla como estaba.
     */
    if (palmares.length === 0) {
      await this.marcarRevisado(playerId);
      return 0;
    }

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
      /*
       * La relevancia cuelga del palmarés —es lo que hace que buscar "ramos" traiga a Sergio
       * Ramos—, así que se recalcula acá y no envejece esperando una migración.
       */
      this.prisma.player.update({
        where: { id: playerId },
        data: { palmaresRevisadoEn: new Date() },
      }),
      this.prisma.$executeRaw`
        UPDATE players SET relevancia = ${palmares.length} * 100 + least((
          SELECT coalesce(sum(coalesce(minutes_played, 0)), 0)
          FROM player_season_statistics WHERE player_id = ${playerId}::uuid), 3000) / 10
        WHERE id = ${playerId}::uuid`,
    ]);

    return palmares.length;
  }

  /**
   * Deja dicho que a este futbolista ya se le preguntó.
   *
   * Sin la marca, quien no tiene títulos es indistinguible de quien todavía no se revisó, y el
   * relleno vuelve a gastar un pedido por cada uno en cada corrida.
   */
  private async marcarRevisado(playerId: string): Promise<void> {
    await this.prisma.player.update({
      where: { id: playerId },
      data: { palmaresRevisadoEn: new Date() },
    });
  }
}
