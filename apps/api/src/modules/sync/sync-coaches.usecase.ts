import { Inject, Injectable, Logger } from '@nestjs/common';
import type { FootballDataProvider, ProviderCoach } from '@athena/domain';
import { PrismaService } from '../../shared/prisma.service.js';
import { FOOTBALL_DATA_PROVIDER } from '../providers/provider.tokens.js';
import { CoachResolverService } from './coach-resolver.service.js';
import { ExternalReferenceService } from './external-reference.service.js';

export interface ResultadoDeEntrenadores {
  entrenadores: number;
  etapas: number;
  alineaciones: number;
}

/**
 * El proveedor manda alguna fecha que no lo es —un club de los 2.309 tumbó la corrida entera con
 * un `start` que `Date` no pudo leer—. Una etapa sin fecha válida no se puede ubicar en la carrera,
 * así que se descarta en lugar de arrastrar un `Invalid Date` hasta la base.
 */
function comoFecha(dia: string | null): Date | null {
  if (!dia) return null;
  const fecha = new Date(`${dia}T00:00:00Z`);
  return Number.isNaN(fecha.getTime()) ? null : fecha;
}

/**
 * Los entrenadores de un club: su ficha, su carrera y el amarre con los partidos que dirigieron.
 *
 * Un solo pedido trae a los DT que pasaron por el club con la carrera completa de cada uno, así que
 * la llamada es barata y lo caro es escribir. Las etapas se guardan tal como las publica el
 * proveedor y no deducidas de nuestros partidos: un entrenador dirigió antes de que existiera
 * nuestra base, y la ficha tiene que decirlo igual.
 */
@Injectable()
export class SyncCoachesUseCase {
  private readonly logger = new Logger(SyncCoachesUseCase.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly refs: ExternalReferenceService,
    private readonly resolver: CoachResolverService,
    @Inject(FOOTBALL_DATA_PROVIDER) private readonly provider: FootballDataProvider,
  ) {}

  async execute(teamRef: string): Promise<ResultadoDeEntrenadores> {
    const fichas = await this.provider.getCoachesByTeam(teamRef);
    const vacio = { entrenadores: 0, etapas: 0, alineaciones: 0 };
    if (fichas.length === 0) return vacio;

    const ids = await this.resolver.resolveMany(fichas.map((f) => ({ ...f, deLaFicha: true })));
    await this.guardarFichas(fichas, ids);
    const etapas = await this.guardarEtapas(fichas, ids);

    const teamId = await this.refs.resolve(this.provider.name, 'team', teamRef);
    const alineaciones = teamId ? await this.atarAlineaciones(teamId) : 0;

    return { entrenadores: ids.size, etapas, alineaciones };
  }

  /**
   * El mismo amarre, pero sobre todos los clubes de una vez.
   *
   * Hace falta porque la carrera de un entrenador no llega preguntando por el club donde dirigió,
   * sino por el club donde está hoy: las etapas de Mourinho en el Real Madrid aparecieron
   * preguntando por el Benfica. Cuando le tocó el turno al Real Madrid esas etapas todavía no
   * existían, así que el amarre por club siempre va a llegar temprano para alguien. Es una sola
   * consulta y ni un pedido al proveedor, así que cierra el barrido y el refresco diario.
   */
  atarPendientes(): Promise<number> {
    return this.atarAlineaciones(null);
  }

  /**
   * Los nombres que dejaron escritos las alineaciones, que suelen ser mejores que la ficha.
   *
   * El proveedor llama "Guardiola" y "E. Maresca" a los mismos entrenadores que en las alineaciones
   * de esos partidos aparecen como "Pep Guardiola" y "Enzo Maresca". No cuesta un pedido: el dato
   * ya está guardado desde el primer día, solo que suelto.
   */
  async mejorarNombres(): Promise<number> {
    const filas = await this.prisma.$queryRaw<Array<{ id: string; nombre: string }>>`
      SELECT DISTINCT l.coach_id::text AS id, l.coach_name AS nombre
      FROM match_lineups l
      WHERE l.coach_id IS NOT NULL AND l.coach_name IS NOT NULL
    `;
    return this.resolver.mejorarNombres(filas);
  }

  /**
   * Lo que solo llega por acá: nacimiento, nacionalidad y la foto de la ficha.
   *
   * El nombre y el slug no se tocan: de eso se ocupa el resolutor, que es el único que ve juntos el
   * nombre guardado y el que acaba de llegar. Escribir "Guardiola" encima de "Pep Guardiola" cada
   * semana sería deshacer lo que las alineaciones enseñaron.
   */
  private async guardarFichas(fichas: ProviderCoach[], ids: Map<string, string>): Promise<void> {
    const escrituras = fichas.flatMap((ficha) => {
      const id = ids.get(ficha.providerRef);
      if (!id) return [];
      return [
        this.prisma.coach.update({
          where: { id },
          data: {
            fullName: ficha.fullName,
            birthDate: comoFecha(ficha.birthDate),
            birthPlace: ficha.birthPlace,
            nationality: ficha.nationality,
            photoUrl: ficha.photoUrl,
          },
        }),
      ];
    });
    if (escrituras.length > 0) await this.prisma.$transaction(escrituras);
  }

  /**
   * Las etapas nuevas, ignorando las que ya están.
   *
   * La misma etapa llega por dos caminos —preguntando por el club donde empezó y por el de
   * después— y el índice único es el que decide. Sin `teamNombre` la fila no se puede identificar
   * ni mostrar, así que se descarta.
   */
  private async guardarEtapas(
    fichas: ProviderCoach[],
    ids: Map<string, string>,
  ): Promise<number> {
    const refsDeClub = [
      ...new Set(fichas.flatMap((f) => f.etapas.map((e) => e.teamRef).filter(esTexto))),
    ];
    const clubes = await this.refs.resolveMany(this.provider.name, 'team', refsDeClub);

    const filas = fichas.flatMap((ficha) => {
      const coachId = ids.get(ficha.providerRef);
      if (!coachId) return [];
      return ficha.etapas.flatMap((etapa) => {
        const desde = comoFecha(etapa.desde);
        if (!etapa.teamNombre || !desde) return [];
        return [
          {
            coachId,
            teamId: (etapa.teamRef && clubes.get(etapa.teamRef)) || null,
            teamNombre: etapa.teamNombre,
            desde,
            hasta: comoFecha(etapa.hasta),
          },
        ];
      });
    });
    if (filas.length === 0) return 0;

    const { count } = await this.prisma.coachSpell.createMany({
      data: filas,
      skipDuplicates: true,
    });
    return count;
  }

  /**
   * Le pone dueño a las alineaciones que solo tienen el nombre escrito.
   *
   * Los partidos que se sincronizan ahora traen el id del entrenador y se atan solos; las 30.128
   * alineaciones que ya estaban guardadas, no. Y el nombre solo no alcanza: 12.441 vienen
   * abreviadas —"F. Navarro"— y no coinciden con "Fabián Navarro". Ni siquiera el nombre completo
   * alcanza: el mismo Xabi Alonso figura once veces como "Xabier Alonso Olano" y tres como "Xabi
   * Alonso" en las alineaciones del mismo club.
   *
   * Entonces se cruza por fecha contra las etapas del club y se exige que el apellido coincida.
   * Las dos condiciones hacen falta: la fecha sola se equivoca cuando nos falta la etapa del que
   * dirigió de verdad —le colgaba los partidos de Filipe Luís a Marcelo Salles, que es el único
   * que teníamos del Flamengo—, y el apellido solo no distingue dos etapas del mismo club.
   *
   * El apellido se busca entre las palabras del otro nombre y no al final, porque el proveedor
   * escribe "Josep Guardiola i Sala" en el Mundial de Clubes y ahí queda en el medio.
   *
   * Lo que no queda claro se deja en null: el nombre suelto sigue imprimiéndose igual.
   */
  private async atarAlineaciones(teamId: string | null): Promise<number> {
    return this.prisma.$executeRaw`
      WITH candidatas AS (
        SELECT l.id AS alineacion, s.coach_id
        FROM match_lineups l
        JOIN matches m ON m.id = l.match_id
        JOIN coach_spells s
          ON s.team_id = l.team_id
         AND (m.kickoff_utc AT TIME ZONE 'UTC')::date >= s.desde
         AND (s.hasta IS NULL OR (m.kickoff_utc AT TIME ZONE 'UTC')::date <= s.hasta)
        JOIN coaches c ON c.id = s.coach_id
        WHERE l.coach_id IS NULL
          AND (${teamId}::uuid IS NULL OR l.team_id = ${teamId}::uuid)
          AND (
            l.coach_name IS NULL
            OR (length(apellido_de(c.name)) >= 3 AND apellido_de(c.name) = ANY (palabras_de(l.coach_name)))
            OR (length(apellido_de(l.coach_name)) >= 3 AND apellido_de(l.coach_name) = ANY (palabras_de(c.name)))
          )
      ),
      resumen AS (
        SELECT alineacion, min(coach_id::text) AS coach_id
        FROM candidatas
        GROUP BY alineacion
        HAVING count(DISTINCT coach_id) = 1
      )
      UPDATE match_lineups l
      SET coach_id = r.coach_id::uuid
      FROM resumen r
      WHERE l.id = r.alineacion
    `;
  }
}

function esTexto(valor: string | null): valor is string {
  return valor !== null;
}
