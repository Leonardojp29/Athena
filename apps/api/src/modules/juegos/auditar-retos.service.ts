import { Inject, Injectable } from '@nestjs/common';
import {
  layout,
  type FootballDataProvider,
  type ProviderLineup,
  type ProviderMatch,
  type ProviderRef,
} from '@athena/domain';
import { PrismaService } from '../../shared/prisma.service.js';
import { FOOTBALL_DATA_PROVIDER } from '../providers/provider.tokens.js';
import { RETOS_DECLARADOS, type RetoDeclarado } from './retos-once.config.js';

/** El ref del equipo cuyo XI hay que adivinar, sin depender de quién figure como local. */
export const equipoObjetivo = (reto: RetoDeclarado): string =>
  reto.objetivo === 'local' ? reto.localRef : reto.visitaRef;

export type EstadoDelReto =
  | 'ok'
  | 'sin-partido'
  | 'sin-alineacion'
  | 'sin-formacion'
  | 'xi-incompleto'
  | 'no-dibujable';

export interface Veredicto {
  reto: RetoDeclarado;
  estado: EstadoDelReto;
  fixtureRef: string | null;
  jugadoEn: string | null;
  ronda: string | null;
  formacion: string | null;
  titulares: number;
  conCasilla: number;
  yaEnAthena: number;
  porCrear: number;
}

/**
 * Comprueba los retos declarados contra el proveedor, sin escribir nada.
 *
 * El proveedor no sabe buscar partidos por fecha ni por equipos —solo `getMatches(liga, temporada)`
 * y `getMatchesByRefs`—, así que cada temporada se pide una vez y se memoriza: los sesenta y seis
 * retos caben en unas veinticinco. Después, un pedido de alineación por reto.
 */
@Injectable()
export class AuditarRetosService {
  private readonly temporadas = new Map<string, ProviderRef<ProviderMatch>[]>();

  constructor(
    private readonly prisma: PrismaService,
    @Inject(FOOTBALL_DATA_PROVIDER) private readonly provider: FootballDataProvider,
  ) {}

  async revisarTodos(claves: string[] = []): Promise<Veredicto[]> {
    const retos =
      claves.length > 0 ? RETOS_DECLARADOS.filter((r) => claves.includes(r.clave)) : RETOS_DECLARADOS;
    const veredictos: Veredicto[] = [];
    for (const reto of retos) veredictos.push(await this.revisar(reto));
    return veredictos;
  }

  async revisar(reto: RetoDeclarado): Promise<Veredicto> {
    const vacio = {
      reto,
      fixtureRef: null,
      jugadoEn: null,
      ronda: null,
      formacion: null,
      titulares: 0,
      conCasilla: 0,
      yaEnAthena: 0,
      porCrear: 0,
    };

    const partido = await this.localizar(reto);
    if (!partido) return { ...vacio, estado: 'sin-partido' };

    const comun = {
      ...vacio,
      fixtureRef: partido.providerRef,
      jugadoEn: partido.data.kickoffUtc.slice(0, 10),
      ronda: partido.data.round,
    };

    const alineacion = await this.alineacionDelObjetivo(reto, partido);
    if (!alineacion || alineacion.startXi.length === 0) return { ...comun, estado: 'sin-alineacion' };

    const conCasilla = alineacion.startXi.filter((j) => j.grid !== null).length;
    const detalle = {
      ...comun,
      formacion: alineacion.formation,
      titulares: alineacion.startXi.length,
      conCasilla,
    };

    if (alineacion.startXi.length < 11) return { ...detalle, estado: 'xi-incompleto' };
    /* Sin formación y sin casillas no hay nada con qué dibujar la cancha, y no se inventa. */
    if (alineacion.formation === null && conCasilla < 11) return { ...detalle, estado: 'sin-formacion' };
    if (layout(alineacion.startXi, { formation: alineacion.formation }) === null) {
      return { ...detalle, estado: 'no-dibujable' };
    }

    return { ...detalle, estado: 'ok', ...(await this.contarFutbolistas(alineacion)) };
  }

  async alineacionDelObjetivo(
    reto: RetoDeclarado,
    partido: ProviderRef<ProviderMatch>,
  ): Promise<ProviderLineup | null> {
    const alineaciones = await this.provider.getMatchLineups(partido.providerRef);
    return alineaciones.find((a) => a.teamRef === equipoObjetivo(reto)) ?? null;
  }

  /**
   * Dentro de la temporada, los dos equipos y el marcador identifican el partido sin ambigüedad.
   *
   * El cruce se busca en las dos orientaciones a propósito: en cancha neutral el catálogo escribe
   * primero al que la gente recuerda como local —"Perú 2-0 Australia"— y el proveedor lista al local
   * del acta, que ahí fue Australia. Son el mismo partido y hay que encontrarlo igual.
   */
  async localizar(reto: RetoDeclarado): Promise<ProviderRef<ProviderMatch> | null> {
    const llave = `${reto.competenciaRef}:${reto.temporada}`;
    let partidos = this.temporadas.get(llave);
    if (!partidos) {
      partidos = await this.provider.getMatches(reto.competenciaRef, reto.temporada);
      this.temporadas.set(llave, partidos);
    }
    const [golesLocal, golesVisita] = reto.marcador;
    return (
      partidos.find((p) => {
        const derecho =
          p.data.homeTeamRef === reto.localRef && p.data.awayTeamRef === reto.visitaRef;
        const alReves =
          p.data.homeTeamRef === reto.visitaRef && p.data.awayTeamRef === reto.localRef;
        if (derecho) return p.data.homeScore === golesLocal && p.data.awayScore === golesVisita;
        if (alReves) return p.data.homeScore === golesVisita && p.data.awayScore === golesLocal;
        return false;
      }) ?? null
    );
  }

  private async contarFutbolistas(
    alineacion: ProviderLineup,
  ): Promise<{ yaEnAthena: number; porCrear: number }> {
    const refs = alineacion.startXi.map((j) => j.playerRef).filter((r): r is string => r !== null);
    const filas = await this.prisma.externalReference.findMany({
      where: { provider: this.provider.name, entityType: 'player', providerRef: { in: refs } },
      select: { providerRef: true },
    });
    return { yaEnAthena: filas.length, porCrear: alineacion.startXi.length - filas.length };
  }
}
