import { Inject, Injectable } from '@nestjs/common';
import type { FootballDataProvider } from '@athena/domain';
import { PrismaService } from '../../shared/prisma.service.js';
import { FOOTBALL_DATA_PROVIDER } from '../providers/provider.tokens.js';
import { ExternalReferenceService } from './external-reference.service.js';

/**
 * Los movimientos de mercado de un club.
 *
 * Un solo pedido trae el historial completo de cada futbolista que alguna vez pasó por ahí —284 en
 * Alianza Lima—, así que la llamada es barata y lo que cuesta es escribir. Se escribe todo: el pase
 * de un jugador a un club que no cubrimos igual es parte de su carrera, y la ficha del jugador lo
 * necesita.
 *
 * A diferencia del palmarés esto no se reemplaza: el mismo pase llega dos veces, una por el club
 * que compró y otra por el que vendió, y borrar por equipo tiraría los del otro lado. Se inserta
 * ignorando lo que ya está, que es lo que hace el índice único.
 */
@Injectable()
export class SyncTransfersUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly refs: ExternalReferenceService,
    @Inject(FOOTBALL_DATA_PROVIDER) private readonly provider: FootballDataProvider,
  ) {}

  async execute(teamRef: string): Promise<number> {
    const movimientos = await this.provider.getTransfers(teamRef);
    if (movimientos.length === 0) return 0;

    /*
     * Las tres resoluciones van en tres consultas y no en tres por fila: con 284 jugadores y sus
     * clubes, hacerlo de a uno serían mil viajes a la base para escribir seiscientas filas.
     */
    const jugadores = await this.refs.resolveMany(
      this.provider.name,
      'player',
      [...new Set(movimientos.map((m) => m.playerRef))],
    );
    const clubes = await this.refs.resolveMany(
      this.provider.name,
      'team',
      [...new Set(movimientos.flatMap((m) => [m.entraARef, m.saleDeRef].filter(esTexto)))],
    );

    const filas = movimientos.flatMap((m) => {
      /* Sin el jugador en Athena el movimiento no tiene a quién colgarse. */
      const playerId = jugadores.get(m.playerRef);
      if (!playerId) return [];
      return [
        {
          playerId,
          fecha: new Date(`${m.fecha}T00:00:00Z`),
          entraATeamId: (m.entraARef && clubes.get(m.entraARef)) || null,
          entraANombre: m.entraANombre,
          saleDeTeamId: (m.saleDeRef && clubes.get(m.saleDeRef)) || null,
          saleDeNombre: m.saleDeNombre,
          clase: m.clase,
          monto: m.monto,
        },
      ];
    });
    if (filas.length === 0) return 0;

    /*
     * El mismo pase con dos fechas distintas.
     *
     * El proveedor fecha el movimiento distinto según a qué club se le pregunte: Joaquín Correa sale
     * de Botafogo el 5 de agosto si se pide Botafogo y el 6 si se pide Estudiantes. Deduplicar
     * dentro de una respuesta no alcanza —son dos respuestas—, así que antes de escribir se mira lo
     * que ya está y se descarta lo que cae en la misma ventana.
     *
     * Es una consulta más por club, y evita que la tarjeta del equipo muestre dos veces el mismo
     * fichaje, que es exactamente el error que hace desconfiar de todo lo demás.
     */
    const yaEstan = await this.prisma.transfer.findMany({
      where: { playerId: { in: [...new Set(filas.map((f) => f.playerId))] } },
      select: { playerId: true, fecha: true, entraANombre: true, saleDeNombre: true },
    });
    const conocidos = new Map<string, number[]>();
    for (const fila of yaEstan) {
      const clave = cruce(fila);
      conocidos.set(clave, [...(conocidos.get(clave) ?? []), fila.fecha.getTime()]);
    }

    const nuevas = filas.filter((fila) => {
      const fechas = conocidos.get(cruce(fila));
      return !fechas?.some((cuando) => Math.abs(cuando - fila.fecha.getTime()) <= VENTANA_MS);
    });
    if (nuevas.length === 0) return 0;

    const { count } = await this.prisma.transfer.createMany({ data: nuevas, skipDuplicates: true });
    return count;
  }
}

/* Los mismos siete días que usa el mapeador para juntar el anuncio con la fecha efectiva. */
const VENTANA_MS = 7 * 24 * 3600_000;

const cruce = (f: { playerId: string; entraANombre: string; saleDeNombre: string }): string =>
  `${f.playerId}|${f.entraANombre}|${f.saleDeNombre}`;

const esTexto = (v: string | null): v is string => v !== null;
