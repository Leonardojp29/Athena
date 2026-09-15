import { createHash } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import type { FootballDataProvider, ProviderMatch, ProviderRef } from '@athena/domain';
import { PrismaService } from '../../shared/prisma.service.js';
import { FOOTBALL_DATA_PROVIDER } from '../providers/provider.tokens.js';
import { calzaNombre } from './nombres.js';
import { RETOS_DEL_IMPOSTOR, type RetoDelImpostorDeclarado } from './retos-impostor.config.js';

export type EstadoDelReto =
  | 'ok'
  | 'ok-a-mano'
  | 'ok-con-reparo'
  | 'impostor-cumple'
  | 'falta-alguno'
  | 'foto-repetida'
  | 'sin-partido';

/** Un futbolista del reto, ya resuelto contra el proveedor. */
export interface Resuelto {
  buscado: string;
  ref: string;
  nombre: string;
  /** Cumple la condición: fue titular, o figura en el plantel del torneo. */
  cumple: boolean;
  /** Estaba disponible sin cumplirla: suplente, o del plantel pero fuera del torneo. */
  disponible: boolean;
  enAthena: boolean;
  fotoReal: boolean;
}

export interface Veredicto {
  reto: RetoDelImpostorDeclarado;
  estado: EstadoDelReto;
  fixtureRef: string | null;
  contexto: string | null;
  seis: Resuelto[];
  porCrear: number;
  nota: string | null;
}

/**
 * Comprueba los retos de El Impostor contra el proveedor, sin escribir nada.
 *
 * Cada nombre se resuelve **dentro de su reto** —contra los veintitrés de una alineación o los
 * treinta de un plantel—, que es donde "Guerrero" es uno solo. Resolverlos contra los cuarenta y
 * seis mil de la base sería el problema de homónimos que ya costó caro en el otro juego.
 */
@Injectable()
export class AuditarImpostorService {
  private readonly temporadas = new Map<string, ProviderRef<ProviderMatch>[]>();
  private readonly planteles = new Map<string, Array<{ ref: string; nombre: string }>>();
  private readonly huellas = new Map<string, string>();

  constructor(
    private readonly prisma: PrismaService,
    @Inject(FOOTBALL_DATA_PROVIDER) private readonly provider: FootballDataProvider,
  ) {}

  async revisarTodos(claves: string[] = []): Promise<Veredicto[]> {
    const retos =
      claves.length > 0
        ? RETOS_DEL_IMPOSTOR.filter((r) => claves.includes(r.clave))
        : RETOS_DEL_IMPOSTOR;
    const veredictos: Veredicto[] = [];
    for (const reto of retos) veredictos.push(await this.revisar(reto));
    return veredictos;
  }

  async revisar(reto: RetoDelImpostorDeclarado): Promise<Veredicto> {
    const base = { reto, fixtureRef: null, contexto: null, seis: [], porCrear: 0, nota: null };

    const resuelto = await this.resolver(reto);
    if (!resuelto) return { ...base, estado: 'sin-partido' };

    const { seis, fixtureRef, contexto } = resuelto;
    const conDatos = { ...base, fixtureRef, contexto, seis };

    /*
     * Solo los cinco correctos tienen que aparecer. Que el impostor no figure en ninguna lista es
     * justamente la respuesta del reto —no estuvo—, no un fallo de resolución.
     */
    const faltan = seis.slice(0, 5).filter((s) => s.ref === '');
    if (faltan.length > 0) {
      return { ...conDatos, estado: 'falta-alguno', nota: `sin resolver: ${faltan.map((f) => f.buscado).join(', ')}` };
    }

    await this.marcarAthena(seis);
    const porCrear = seis.filter((s) => !s.enAthena).length;

    const sinFoto = seis.filter((s) => s.ref !== '' && !s.fotoReal);
    if (sinFoto.length > 0) {
      return { ...conDatos, porCrear, estado: 'foto-repetida', nota: `sin foto propia: ${sinFoto.map((f) => f.nombre).join(', ')}` };
    }

    const impostor = seis[seis.length - 1] as Resuelto;
    if (impostor.cumple) {
      return { ...conDatos, porCrear, estado: 'impostor-cumple', nota: `${impostor.nombre} sí cumple la condición` };
    }

    const correctos = seis.slice(0, 5);
    const incumplen = correctos.filter((c) => !c.cumple);
    if (incumplen.length > 0) {
      return { ...conDatos, porCrear, estado: 'impostor-cumple', nota: `no cumplen: ${incumplen.map((c) => c.nombre).join(', ')}` };
    }

    if (reto.validacion.tipo === 'editorial') {
      return { ...conDatos, porCrear, estado: 'ok-a-mano', nota: reto.validacion.motivo };
    }

    /* El impostor plausible es el que estaba ahí y no cumplía el detalle; si ni siquiera estaba, la ronda es más fácil. */
    if (!impostor.disponible) {
      return { ...conDatos, porCrear, estado: 'ok-con-reparo', nota: `${impostor.nombre} no figura en el plantel` };
    }

    return { ...conDatos, porCrear, estado: 'ok' };
  }

  private async resolver(
    reto: RetoDelImpostorDeclarado,
  ): Promise<{ seis: Resuelto[]; fixtureRef: string | null; contexto: string | null } | null> {
    const nombres = [...reto.correctos, reto.impostor];

    if (reto.validacion.tipo === 'editorial') {
      /* Sin partido que consultar, los seis se resuelven contra Athena y se dan por cumplidos. */
      const seis = await this.desdeAthena(nombres);
      return { seis, fixtureRef: null, contexto: reto.validacion.motivo };
    }

    if (reto.validacion.tipo === 'plantel') {
      const { equipoRef, temporada, competenciaRef } = reto.validacion;
      const llave = `${equipoRef}:${temporada}:${competenciaRef ?? ''}`;
      let plantel = this.planteles.get(llave);
      if (!plantel) {
        const fichas = await this.provider.getTeamSeasonPlayers(equipoRef, temporada, competenciaRef);
        plantel = fichas.map((f) => ({ ref: f.providerRef, nombre: f.data.name }));
        this.planteles.set(llave, plantel);
      }
      const seis = nombres.map((n, i) => this.desdeLista(n, plantel as Array<{ ref: string; nombre: string }>, [], i < 5));
      return { seis, fixtureRef: null, contexto: `plantel ${equipoRef} · ${temporada}` };
    }

    const partido = await this.localizar(reto.validacion);
    if (!partido) return null;

    const alineaciones = await this.provider.getMatchLineups(partido.providerRef);
    /*
     * El equipo se identifica por su ref y no por "el local": en cancha neutral el catálogo escribe
     * primero al que uno recuerda como local y el acta dice otra cosa, así que mirar `homeTeamRef`
     * traía la alineación del rival y ninguno de los seis aparecía.
     */
    const teamRef =
      reto.validacion.objetivo === 'local' ? reto.validacion.localRef : reto.validacion.visitaRef;
    const mia = alineaciones.find((a) => a.teamRef === teamRef);
    if (!mia || mia.startXi.length < 11) return null;

    const titulares = mia.startXi.flatMap((j) => (j.playerRef ? [{ ref: j.playerRef, nombre: j.name }] : []));
    const banco = mia.substitutes.flatMap((j) => (j.playerRef ? [{ ref: j.playerRef, nombre: j.name }] : []));
    const seis = nombres.map((n) => this.desdeLista(n, titulares, banco, true));
    return {
      seis,
      fixtureRef: partido.providerRef,
      contexto: `${partido.data.kickoffUtc.slice(0, 10)} · ${partido.data.round ?? ''}`.trim(),
    };
  }

  /** Dentro de la temporada, los dos equipos y el marcador identifican el partido; se prueban las dos orientaciones. */
  private async localizar(
    v: Extract<RetoDelImpostorDeclarado['validacion'], { tipo: 'once' }>,
  ): Promise<ProviderRef<ProviderMatch> | null> {
    const llave = `${v.competenciaRef}:${v.temporada}`;
    let partidos = this.temporadas.get(llave);
    if (!partidos) {
      partidos = await this.provider.getMatches(v.competenciaRef, v.temporada);
      this.temporadas.set(llave, partidos);
    }
    const [golesLocal, golesVisita] = v.marcador;
    return (
      partidos.find((p) => {
        const derecho = p.data.homeTeamRef === v.localRef && p.data.awayTeamRef === v.visitaRef;
        const alReves = p.data.homeTeamRef === v.visitaRef && p.data.awayTeamRef === v.localRef;
        if (derecho) return p.data.homeScore === golesLocal && p.data.awayScore === golesVisita;
        if (alReves) return p.data.homeScore === golesVisita && p.data.awayScore === golesLocal;
        return false;
      }) ?? null
    );
  }

  private desdeLista(
    buscado: string,
    cumplen: Array<{ ref: string; nombre: string }>,
    disponibles: Array<{ ref: string; nombre: string }>,
    _esCorrecto: boolean,
  ): Resuelto {
    const enCumplen = calzaNombre(buscado, cumplen);
    const enDisponibles = calzaNombre(buscado, disponibles);
    const hallado = enCumplen ?? enDisponibles;
    return {
      buscado,
      ref: hallado?.ref ?? '',
      nombre: hallado?.nombre ?? buscado,
      cumple: enCumplen !== null,
      disponible: enDisponibles !== null,
      enAthena: false,
      fotoReal: false,
    };
  }

  private async desdeAthena(nombres: string[]): Promise<Resuelto[]> {
    const resueltos: Resuelto[] = [];
    for (const [i, nombre] of nombres.entries()) {
      const filas = await this.prisma.$queryRaw<Array<{ ref: string; name: string }>>`
        SELECT r.provider_ref AS ref, p.name
        FROM players p
        JOIN external_references r
          ON r.entity_type = 'player' AND r.entity_id = p.id AND r.provider = 'api-football'
        WHERE immutable_unaccent(lower(p.name)) LIKE immutable_unaccent(lower(${'%' + nombre + '%'}))
        ORDER BY p.relevancia DESC LIMIT 1`;
      const f = filas[0];
      resueltos.push({
        buscado: nombre,
        ref: f?.ref ?? '',
        nombre: f?.name ?? nombre,
        /* Sin partido que consultar, la condición la respalda el editor. */
        cumple: i < 5,
        disponible: true,
        enAthena: f !== undefined,
        fotoReal: false,
      });
    }
    return resueltos;
  }

  /** Marca quién ya está en Athena y comprueba que su foto sea propia y no la silueta del proveedor. */
  private async marcarAthena(seis: Resuelto[]): Promise<void> {
    const refs = seis.map((s) => s.ref).filter(Boolean);
    const filas = await this.prisma.externalReference.findMany({
      where: { provider: this.provider.name, entityType: 'player', providerRef: { in: refs } },
      select: { providerRef: true },
    });
    const conocidos = new Set(filas.map((f) => f.providerRef));

    const vistas = new Map<string, string>();
    for (const s of seis) {
      s.enAthena = conocidos.has(s.ref);
      const huella = await this.huellaDeFoto(s.ref);
      /* Dos cartas con la misma imagen delatan la ronda: la repetida cuenta como sin foto. */
      s.fotoReal = huella !== null && !vistas.has(huella);
      if (huella !== null) vistas.set(huella, s.ref);
    }
  }

  private async huellaDeFoto(ref: string): Promise<string | null> {
    const recordada = this.huellas.get(ref);
    if (recordada !== undefined) return recordada === '' ? null : recordada;
    try {
      const res = await fetch(`https://media.api-sports.io/football/players/${ref}.png`);
      if (!res.ok) {
        this.huellas.set(ref, '');
        return null;
      }
      const cuerpo = Buffer.from(await res.arrayBuffer());
      const huella = createHash('sha1').update(cuerpo).digest('hex');
      this.huellas.set(ref, huella);
      return huella;
    } catch {
      this.huellas.set(ref, '');
      return null;
    }
  }
}
