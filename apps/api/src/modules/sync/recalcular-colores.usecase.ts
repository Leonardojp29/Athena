import { Injectable, Logger } from '@nestjs/common';
import { kitTitular } from '@athena/domain';
import { PrismaService } from '../../shared/prisma.service.js';

/**
 * El color de cada club, deducido de con qué camiseta juega de local.
 *
 * El proveedor manda el kit de cada partido y ninguno del club, así que antes se guardaba el último
 * que llegaba: un equipo quedaba pintado con su camiseta de visitante hasta el domingo siguiente, y
 * Real Madrid terminó con su tercera. Ahora cada alineación deja su muestra y acá se elige la que más
 * se repite jugando en casa, que es la definición práctica de equipación titular.
 *
 * No cuesta un request: las muestras ya viajaban en el payload de las alineaciones y se tiraban.
 */
@Injectable()
export class RecalcularColoresUseCase {
  private readonly logger = new Logger(RecalcularColoresUseCase.name);

  constructor(private readonly prisma: PrismaService) {}

  async execute(): Promise<{ equipos: number; cambiados: number }> {
    const filas = await this.prisma.$queryRaw<
      Array<{ team_id: string; kit_color: string; kit_number_color: string | null; cuando: Date }>
    >`
      SELECT l.team_id, l.kit_color, l.kit_number_color, m.kickoff_utc AS cuando
      FROM match_lineups l
      JOIN matches m ON m.id = l.match_id AND m.home_team_id = l.team_id
      JOIN seasons s ON s.id = m.season_id AND s.is_current
      WHERE l.kit_color IS NOT NULL`;

    const porEquipo = new Map<
      string,
      Array<{ color: string; numero: string | null; cuando: Date }>
    >();
    for (const fila of filas) {
      const muestras = porEquipo.get(fila.team_id) ?? [];
      muestras.push({ color: fila.kit_color, numero: fila.kit_number_color, cuando: fila.cuando });
      porEquipo.set(fila.team_id, muestras);
    }

    let cambiados = 0;
    let decididos = 0;
    for (const [teamId, muestras] of porEquipo) {
      const titular = kitTitular(muestras);
      if (!titular) continue;
      decididos++;

      /* El color del dorsal que acompaña a esa camiseta, no el de otra. */
      const dorsal =
        muestras
          .filter((m) => m.color === titular && m.numero !== null)
          .sort((a, b) => b.cuando.getTime() - a.cuando.getTime())[0]?.numero ?? null;

      /* Solo se escribe lo que cambió: esto corre todos los días sobre todo el catálogo. */
      const { count } = await this.prisma.team.updateMany({
        where: {
          id: teamId,
          OR: [
            { primaryColor: { not: titular } },
            { primaryColor: null },
            ...(dorsal !== null ? [{ secondaryColor: { not: dorsal } }] : []),
          ],
        },
        data: { primaryColor: titular, ...(dorsal !== null ? { secondaryColor: dorsal } : {}) },
      });
      cambiados += count;
    }

    this.logger.log(`Colores: ${decididos} equipos con muestras suficientes, ${cambiados} cambiados`);
    return { equipos: decididos, cambiados };
  }
}
