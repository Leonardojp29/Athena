import { Inject, Injectable, Logger } from '@nestjs/common';
import type { FootballDataProvider } from '@athena/domain';
import { PrismaService } from '../../shared/prisma.service.js';
import { FOOTBALL_DATA_PROVIDER } from '../providers/provider.tokens.js';
import { ExternalReferenceService } from '../sync/external-reference.service.js';
import { PlayerResolverService } from '../sync/player-resolver.service.js';
import { AuditarImpostorService, type Veredicto } from './auditar-impostor.service.js';
import { calzaNombre } from './nombres.js';
import { RETOS_DEL_IMPOSTOR, type RetoDelImpostorDeclarado } from './retos-impostor.config.js';

/** Los estados con los que un reto puede entrar al catálogo. El resto queda bloqueado. */
const ENTRAN = new Set(['ok', 'ok-con-reparo', 'ok-a-mano']);

export interface ResultadoDeLaImportacion {
  guardados: number;
  bloqueados: Array<{ clave: string; motivo: string }>;
  futbolistasCreados: number;
}

/**
 * Trae los retos de El Impostor a la base, con sus seis cartas resueltas.
 *
 * Una partida no vuelve a consultar al proveedor: acá queda todo lo que necesita. Es idempotente
 * por clave, así que corregir un reto en el config y volver a correrlo solo rehace ese.
 */
@Injectable()
export class ImportarImpostorService {
  private readonly logger = new Logger(ImportarImpostorService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditoria: AuditarImpostorService,
    private readonly refs: ExternalReferenceService,
    private readonly jugadores: PlayerResolverService,
    @Inject(FOOTBALL_DATA_PROVIDER) private readonly provider: FootballDataProvider,
  ) {}

  async importar(claves: string[] = []): Promise<ResultadoDeLaImportacion> {
    const veredictos = await this.auditoria.revisarTodos(
      claves.length > 0 ? claves : RETOS_DEL_IMPOSTOR.map((r) => r.clave),
    );

    let guardados = 0;
    let futbolistasCreados = 0;
    const bloqueados: Array<{ clave: string; motivo: string }> = [];

    for (const v of veredictos) {
      if (!ENTRAN.has(v.estado)) {
        bloqueados.push({ clave: v.reto.clave, motivo: v.nota ?? v.estado });
        this.logger.warn(`${v.reto.clave} bloqueado: ${v.nota ?? v.estado}`);
        continue;
      }
      const escrito = await this.guardar(v);
      futbolistasCreados += escrito.creados;
      if (escrito.guardado) guardados++;
      else bloqueados.push({ clave: v.reto.clave, motivo: escrito.motivo ?? 'no se pudo armar' });
    }

    return { guardados, bloqueados, futbolistasCreados };
  }

  private async guardar(
    v: Veredicto,
  ): Promise<{ guardado: boolean; creados: number; motivo?: string }> {
    /*
     * Al impostor que no estaba en el plantel —lesionado, suspendido, todavía en otro club— no se le
     * puede sacar el id de una lista donde no figura, así que se busca aparte. Va por fama, que es
     * lo que distingue a Mario Götze de Felix Götze; para los cinco correctos sigue mandando el
     * contexto, donde la ambigüedad sí importa.
     */
    const impostor = v.seis[5];
    if (impostor && impostor.ref === '') {
      const suelto = await this.resolverSuelto(impostor.buscado);
      if (!suelto) return { guardado: false, creados: 0, motivo: `no se pudo identificar a ${impostor.buscado}` };
      impostor.ref = suelto.ref;
      impostor.nombre = suelto.nombre;
    }

    const refs = v.seis.map((s) => s.ref).filter(Boolean);
    const creados = await this.asegurarFutbolistas(refs, v);
    const porRef = await this.refs.resolveMany(this.provider.name, 'player', refs);

    const opciones = v.seis.flatMap((s, i) => {
      const playerId = porRef.get(s.ref);
      if (!playerId) return [];
      return [{ playerId, providerRef: s.ref, esImpostor: i === 5 }];
    });
    /* Seis cartas y un solo impostor, o el reto no entra: una ronda a medias no es una ronda. */
    if (opciones.length !== 6 || opciones.filter((o) => o.esImpostor).length !== 1) {
      return { guardado: false, creados, motivo: `quedaron ${opciones.length} opciones` };
    }

    await this.prisma.$transaction(async (tx) => {
      const fila = {
        dificultad: v.reto.dificultad,
        categoria: v.reto.categoria,
        enunciado: v.reto.enunciado,
        reveal: v.reto.reveal,
        validadoAMano: v.estado === 'ok-a-mano',
        contexto: contextoDe(v.reto),
      };
      const guardado = await tx.retoDelImpostor.upsert({
        where: { clave: v.reto.clave },
        create: { clave: v.reto.clave, ...fila },
        update: fila,
        select: { id: true },
      });
      await tx.opcionDelImpostor.deleteMany({ where: { retoId: guardado.id } });
      await tx.opcionDelImpostor.createMany({
        data: opciones.map((o) => ({ retoId: guardado.id, ...o })),
      });
    });

    return { guardado: true, creados };
  }

  /** Busca a un futbolista fuera del contexto del reto: primero en Athena, por fama, y si no en el proveedor. */
  private async resolverSuelto(nombre: string): Promise<{ ref: string; nombre: string } | null> {
    const filas = await this.prisma.$queryRaw<Array<{ ref: string; name: string }>>`
      SELECT r.provider_ref AS ref, p.name
      FROM players p
      JOIN external_references r
        ON r.entity_type = 'player' AND r.entity_id = p.id AND r.provider = 'api-football'
      WHERE immutable_unaccent(lower(p.name)) LIKE immutable_unaccent(lower(${'%' + nombre + '%'}))
         OR immutable_unaccent(lower(coalesce(p.full_name, ''))) LIKE immutable_unaccent(lower(${'%' + nombre + '%'}))
      ORDER BY p.relevancia DESC LIMIT 1`;
    const f = filas[0];
    if (f) return { ref: f.ref, nombre: f.name };

    /* Y si tampoco está en Athena —un retirado, casi siempre—, se pregunta al proveedor. */
    const apellido = nombre.split(' ').pop() ?? nombre;
    const fichas = await this.provider.searchPlayers(apellido);
    const calza = calzaNombre(
      nombre,
      fichas.map((x) => ({ ref: x.providerRef, nombre: x.data.name })),
    );
    return calza;
  }

  /** Los que no existen se crean con su ficha completa: en la carta se lee el nombre, no una inicial. */
  private async asegurarFutbolistas(refs: string[], v: Veredicto): Promise<number> {
    const conocidos = await this.refs.resolveMany(this.provider.name, 'player', refs);
    const faltan = refs.filter((ref) => !conocidos.has(ref));
    if (faltan.length === 0) return 0;

    const fichas = await this.provider.getPlayerProfiles(faltan);
    const porRef = new Map(fichas.map((f) => [f.providerRef, f]));
    const semillas = faltan.map((ref) => {
      const ficha = porRef.get(ref);
      if (ficha) return ficha;
      const enElReto = v.seis.find((s) => s.ref === ref);
      return {
        providerRef: ref,
        data: {
          name: enElReto?.nombre ?? ref,
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
}

/**
 * La escena del reto, para que el sorteo no ponga seguidos dos que la comparten.
 *
 * Un partido es la misma escena mirado desde cualquiera de los dos lados: IMP-024 pregunta por el
 * XI de Brasil y IMP-030 por el de Bélgica del mismo cruce, y no comparten una sola carta. Por eso
 * el par de equipos se ordena antes de juntarlo.
 */
function contextoDe(reto: RetoDelImpostorDeclarado): string {
  const v = reto.validacion;
  if (v.tipo === 'once') {
    const [uno, otro] = [v.localRef, v.visitaRef].sort();
    return `partido:${uno}-${otro}:${v.temporada}`;
  }
  if (v.tipo === 'plantel') return `plantel:${v.equipoRef}:${v.temporada}`;
  /* Lo editorial no tiene escena comprobable: cada uno es su propia escena y nunca choca. */
  return `editorial:${reto.clave}`;
}
