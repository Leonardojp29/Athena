import { Inject, Injectable, Logger } from '@nestjs/common';
import type { FootballDataProvider, ProviderLineupPlayer } from '@athena/domain';
import { PrismaService } from '../../shared/prisma.service.js';
import { FOOTBALL_DATA_PROVIDER } from '../providers/provider.tokens.js';
import { ExternalReferenceService } from '../sync/external-reference.service.js';
import { PlayerResolverService } from '../sync/player-resolver.service.js';
import { AuditarRetosService, equipoObjetivo } from './auditar-retos.service.js';
import { casillasManuales } from './casillas-manuales.js';
import { DISPOSICIONES_MANUALES, RETOS_DECLARADOS, type RetoDeclarado } from './retos-once.config.js';

/**
 * Las competencias cuya temporada cruza dos años, para escribirla como la lee el hincha.
 *
 * No se deduce de los datos a propósito: la temporada 2018 de Champions es "2018/19" aunque haya
 * partidos en los dos años, y la 2018 del Mundial es "2018" a secas aunque se juegue en un solo mes.
 */
const TEMPORADA_A_CABALLO = new Set(['2', '140', '556']);

/** Los escudos y logos del proveedor salen del id; no cuestan un pedido. */
const escudoDeEquipo = (ref: string): string =>
  `https://media.api-sports.io/football/teams/${ref}.png`;
const logoDeCompetencia = (ref: string): string =>
  `https://media.api-sports.io/football/leagues/${ref}.png`;

const temporadaMostrada = (reto: RetoDeclarado): string =>
  TEMPORADA_A_CABALLO.has(reto.competenciaRef)
    ? `${reto.temporada}/${String(reto.temporada + 1).slice(2)}`
    : String(reto.temporada);

interface Disposicion {
  casillas: Map<string, string>;
  formacion: string;
  aMano: boolean;
}

export interface ResultadoDeLaImportacion {
  guardados: number;
  omitidos: string[];
  futbolistasCreados: number;
}

/**
 * Trae los retos del catálogo a la base, con su once y las casillas ya resueltas.
 *
 * Una partida no vuelve a consultar al proveedor: acá se guarda todo lo que necesita. Es
 * idempotente por clave, así que agregar un reto al config y volver a correrlo solo trae ese.
 */
@Injectable()
export class ImportarRetosService {
  private readonly logger = new Logger(ImportarRetosService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditoria: AuditarRetosService,
    private readonly refs: ExternalReferenceService,
    private readonly jugadores: PlayerResolverService,
    @Inject(FOOTBALL_DATA_PROVIDER) private readonly provider: FootballDataProvider,
  ) {}

  async importar(claves: string[] = []): Promise<ResultadoDeLaImportacion> {
    const retos =
      claves.length > 0 ? RETOS_DECLARADOS.filter((r) => claves.includes(r.clave)) : RETOS_DECLARADOS;

    let guardados = 0;
    let futbolistasCreados = 0;
    const omitidos: string[] = [];

    for (const reto of retos) {
      const creados = await this.importarUno(reto);
      if (creados === null) {
        omitidos.push(reto.clave);
        this.logger.warn(`${reto.clave}: sin disposición utilizable, no se guarda`);
        continue;
      }
      guardados++;
      futbolistasCreados += creados;
    }

    return { guardados, omitidos, futbolistasCreados };
  }

  /** Devuelve cuántos futbolistas hubo que crear, o null si el reto no se puede armar. */
  private async importarUno(reto: RetoDeclarado): Promise<number | null> {
    const partido = await this.auditoria.localizar(reto);
    if (!partido) return null;

    const alineacion = await this.auditoria.alineacionDelObjetivo(reto, partido);
    if (!alineacion || alineacion.startXi.length < 11) return null;

    const disposicion = this.casillasDelOnce(reto, alineacion.startXi, alineacion.formation);
    if (!disposicion) return null;

    const creados = await this.asegurarFutbolistas(alineacion.startXi);
    const porRef = await this.refs.resolveMany(
      this.provider.name,
      'player',
      alineacion.startXi.map((j) => j.playerRef).filter((r): r is string => r !== null),
    );

    const titulares = alineacion.startXi.flatMap((j) => {
      const playerId = j.playerRef === null ? undefined : porRef.get(j.playerRef);
      const grid = j.playerRef === null ? undefined : disposicion.casillas.get(j.playerRef);
      if (!playerId || !grid) return [];
      return [{ playerId, grid, puesto: j.position, dorsal: j.number }];
    });
    /* Un once al que le falta alguien no es el once: antes que un reto imposible, ninguno. */
    if (titulares.length < 11) return null;

    const objetivoRef = equipoObjetivo(reto);
    const rivalRef = reto.objetivo === 'local' ? reto.visitaRef : reto.localRef;
    const deLocal = partido.data.homeTeamRef === objetivoRef;

    await this.guardar(reto, {
      fixtureRef: partido.providerRef,
      jugadoEn: new Date(partido.data.kickoffUtc.slice(0, 10)),
      objetivoRef,
      rivalRef,
      deLocal,
      golesObjetivo: (deLocal ? partido.data.homeScore : partido.data.awayScore) ?? 0,
      golesRival: (deLocal ? partido.data.awayScore : partido.data.homeScore) ?? 0,
      formacion: disposicion.formacion,
      aMano: disposicion.aMano,
      titulares,
    });

    return creados;
  }

  /**
   * Primero lo que publica el proveedor; si no alcanza para dibujar, la disposición escrita a mano.
   *
   * La de a mano tiene que hablar exactamente de los once que él confirma: si corrige la alineación
   * y la lista queda vieja, el reto se omite en vez de dibujar a alguien que no jugó.
   */
  private casillasDelOnce(
    reto: RetoDeclarado,
    startXi: ProviderLineupPlayer[],
    formacionDelProveedor: string | null,
  ): Disposicion | null {
    const refs = startXi.map((j) => j.playerRef);
    if (refs.some((ref) => ref === null)) return null;
    const jugadores = refs as string[];

    if (formacionDelProveedor !== null) {
      const suyas = new Map<string, string>();
      for (const j of startXi) if (j.playerRef && j.grid) suyas.set(j.playerRef, j.grid);
      if (suyas.size === startXi.length) {
        return { casillas: suyas, formacion: formacionDelProveedor, aMano: false };
      }

      /* Con formación pero sin casillas se ordena por la fila, igual que la cancha del resto del sitio. */
      const porFormacion = casillasManuales({ formacion: formacionDelProveedor, jugadores });
      if (porFormacion) {
        return { casillas: porFormacion, formacion: formacionDelProveedor, aMano: false };
      }
    }

    const manual = DISPOSICIONES_MANUALES[reto.clave];
    if (!manual) return null;
    const delProveedor = new Set(jugadores);
    const cubre =
      manual.jugadores.length === delProveedor.size &&
      manual.jugadores.every((ref) => delProveedor.has(ref));
    if (!cubre) return null;

    const casillas = casillasManuales(manual);
    return casillas && { casillas, formacion: manual.formacion, aMano: true };
  }

  /** Los que no existen se crean: sin ellos el buscador no los encontraría y el reto sería injugable. */
  private async asegurarFutbolistas(startXi: ProviderLineupPlayer[]): Promise<number> {
    const refs = startXi.map((j) => j.playerRef).filter((r): r is string => r !== null);
    const conocidos = await this.refs.resolveMany(this.provider.name, 'player', refs);
    const faltan = refs.filter((ref) => !conocidos.has(ref));
    if (faltan.length === 0) return 0;

    /* La ficha completa y no el nombre de la alineación: ahí el proveedor manda "A. Iniesta". */
    const fichas = await this.provider.getPlayerProfiles(faltan);
    const porRef = new Map(fichas.map((f) => [f.providerRef, f]));
    const semillas = faltan.map((ref) => {
      const ficha = porRef.get(ref);
      if (ficha) return ficha;
      const enLaAlineacion = startXi.find((j) => j.playerRef === ref);
      return {
        providerRef: ref,
        data: {
          name: enLaAlineacion?.name ?? ref,
          fullName: null,
          birthDate: null,
          nationality: null,
          heightCm: null,
          position: null,
          photoUrl: `https://media.api-sports.io/football/players/${ref}.png`,
        },
      };
    });

    await this.jugadores.resolveMany(semillas);
    return faltan.length;
  }

  private async guardar(
    reto: RetoDeclarado,
    datos: {
      fixtureRef: string;
      jugadoEn: Date;
      objetivoRef: string;
      rivalRef: string;
      deLocal: boolean;
      golesObjetivo: number;
      golesRival: number;
      formacion: string;
      aMano: boolean;
      titulares: Array<{ playerId: string; grid: string; puesto: string | null; dorsal: number | null }>;
    },
  ): Promise<void> {
    const objetivoTeamId = await this.refs.resolve(this.provider.name, 'team', datos.objetivoRef);
    const fila = {
      catalogo: reto.catalogo,
      dificultad: reto.dificultad,
      fixtureRef: datos.fixtureRef,
      competencia: reto.competencia,
      competenciaLogoUrl: logoDeCompetencia(reto.competenciaRef),
      temporada: temporadaMostrada(reto),
      fase: reto.fase,
      jugadoEn: datos.jugadoEn,
      objetivoNombre: reto.objetivo === 'local' ? reto.localNombre : reto.visitaNombre,
      objetivoEscudoUrl: escudoDeEquipo(datos.objetivoRef),
      objetivoTeamId,
      rivalNombre: reto.objetivo === 'local' ? reto.visitaNombre : reto.localNombre,
      rivalEscudoUrl: escudoDeEquipo(datos.rivalRef),
      deLocal: datos.deLocal,
      golesObjetivo: datos.golesObjetivo,
      golesRival: datos.golesRival,
      nota: reto.nota,
      formacion: datos.formacion,
      aMano: datos.aMano,
    };

    /* El once se reemplaza entero: son once filas y compararlas cuesta más que rehacerlas. */
    await this.prisma.$transaction(async (tx) => {
      const guardado = await tx.retoDelOnce.upsert({
        where: { clave: reto.clave },
        create: { clave: reto.clave, ...fila },
        update: fila,
        select: { id: true },
      });
      await tx.titularDelReto.deleteMany({ where: { retoId: guardado.id } });
      await tx.titularDelReto.createMany({
        data: datos.titulares.map((t) => ({ retoId: guardado.id, ...t })),
      });
    });
  }
}
