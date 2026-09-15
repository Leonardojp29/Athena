import { createHash } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import type {
  FootballDataProvider,
  ProviderLineup,
  ProviderMatch,
  ProviderMatchEvent,
  ProviderRef,
} from '@athena/domain';
import { PrismaService } from '../../shared/prisma.service.js';
import { FOOTBALL_DATA_PROVIDER } from '../providers/provider.tokens.js';
import { calzaNombre } from './nombres.js';
import {
  emblemaDelEquipo,
  equipoDeLaOpcion,
  PREGUNTAS_DE_60,
  type PreguntaDeclarada,
} from './preguntas-60.config.js';

export type EstadoDeLaPregunta =
  | 'ok'
  | 'ok-a-mano'
  | 'no-cuadra'
  | 'sin-partido'
  | 'sin-foto'
  | 'sin-datos';

export interface Veredicto {
  pregunta: PreguntaDeclarada;
  estado: EstadoDeLaPregunta;
  fixtureRef: string | null;
  /** Lo que el proveedor dice, cuando no coincide con lo que dice el catálogo. */
  nota: string | null;
  /** El ref del futbolista de la foto, en las preguntas que la llevan. */
  fotoRef: string | null;
  /** Una imagen por opción, en el orden del catálogo. Nulo cuando no se pudo armar el juego entero. */
  imagenes: string[] | null;
  porQueSinImagenes: string | null;
}

/* Lo que devuelve cada comprobación: si la pregunta es cierta. Las caras se resuelven aparte. */
type Comprobacion = Omit<Veredicto, 'imagenes' | 'porQueSinImagenes'>;

/** Los tipos de evento que cuentan como gol. El autogol no se le atribuye al que lo mete. */
const GOLES = new Set(['goal', 'penalty_goal']);

/*
 * La silueta gris que el proveedor sirve para todo futbolista sin retrato.
 *
 * Medido: la comparten cuatro de cada veinte fichas tomadas al azar. No alcanza con exigir que las
 * cuatro imágenes de una pregunta sean distintas —una sola silueta entre tres caras de verdad ya
 * señala la respuesta con el dedo—, así que se la reconoce por su huella y se la rechaza.
 */
const SILUETA_GENERICA = '36b77a4cbb148a934845ea569155cd023083fd77';

/**
 * Comprueba las 50 preguntas de 60 Segundos contra el proveedor, sin escribir nada.
 *
 * Los nombres se resuelven **dentro de su contexto** —los veintitantos de un acta— y no contra los
 * cuarenta y seis mil de la base, que es el problema de homónimos que ya costó caro en el buscador
 * de Adivina el XI.
 *
 * Todo se memoiza por temporada: cincuenta preguntas sobre pocas competencias son pocos pedidos
 * reales al proveedor.
 */
@Injectable()
export class Auditar60Service {
  private readonly temporadas = new Map<string, ProviderRef<ProviderMatch>[]>();
  private readonly eventos = new Map<string, ProviderMatchEvent[]>();
  private readonly alineaciones = new Map<string, ProviderLineup[]>();
  private readonly huellas = new Map<string, string>();
  private readonly fichas = new Map<string, { ref: string; nombre: string } | null>();

  constructor(
    private readonly prisma: PrismaService,
    @Inject(FOOTBALL_DATA_PROVIDER) private readonly provider: FootballDataProvider,
  ) {}

  async revisarTodas(claves: string[] = []): Promise<Veredicto[]> {
    const preguntas =
      claves.length > 0 ? PREGUNTAS_DE_60.filter((p) => claves.includes(p.clave)) : PREGUNTAS_DE_60;

    const veredictos: Veredicto[] = [];
    for (const pregunta of preguntas) veredictos.push(await this.revisar(pregunta));
    return veredictos;
  }

  async revisar(pregunta: PreguntaDeclarada): Promise<Veredicto> {
    const vacio = {
      pregunta,
      fixtureRef: null,
      nota: null,
      fotoRef: null,
    };
    let base: Comprobacion;
    try {
      const v = pregunta.validacion;
      if (v.tipo === 'editorial') base = { ...vacio, estado: 'ok-a-mano', nota: v.motivo };
      else if (v.tipo === 'foto') base = await this.revisarFoto(pregunta, v.jugador);
      else if (v.tipo === 'trayectoria')
        base = await this.revisarTrayectoria(pregunta, v.jugador, v.clubesRef);
      else if (v.tipo === 'campeon') base = await this.revisarCampeon(pregunta, v);
      else base = await this.revisarPartido(pregunta, v);
    } catch (error) {
      base = { ...vacio, estado: 'sin-datos', nota: (error as Error).message.slice(0, 120) };
    }

    const caras = await this.carasDeLasOpciones(pregunta);
    return { ...base, imagenes: caras.imagenes, porQueSinImagenes: caras.porQue };
  }

  /**
   * Una cara por opción: la foto del futbolista, el escudo del club o la bandera del país.
   *
   * **O las llevan todas o no las lleva ninguna.** Una pregunta con tres retratos y un cuadro vacío
   * señala la respuesta con el dedo, así que en cuanto una falla se devuelven todas a texto. Por lo
   * mismo se exige que las fotos sean distintas entre sí: el proveedor sirve la misma silueta gris
   * para los futbolistas sin retrato, y dos opciones idénticas son otra pista regalada.
   */
  private async carasDeLasOpciones(
    pregunta: PreguntaDeclarada,
  ): Promise<{ imagenes: string[] | null; porQue: string | null }> {
    if (!pregunta.opcionesDe) return { imagenes: null, porQue: null };

    if (pregunta.opcionesDe === 'equipo') {
      const refs = pregunta.opciones.map((o) => equipoDeLaOpcion(o));
      const sinNombre = pregunta.opciones.filter((_, i) => refs[i] === null);
      if (sinNombre.length > 0) {
        return { imagenes: null, porQue: `sin id de equipo: ${sinNombre.join(', ')}` };
      }
      return { imagenes: refs.map((ref) => emblemaDelEquipo(ref as string)), porQue: null };
    }

    const fichas = await Promise.all(pregunta.opciones.map((o) => this.enAthena(o)));
    const faltan = pregunta.opciones.filter((_, i) => fichas[i] === null);
    if (faltan.length > 0) return { imagenes: null, porQue: `no están en Athena: ${faltan.join(', ')}` };

    const huellas = await Promise.all(fichas.map((f) => this.huellaDeFoto((f as { ref: string }).ref)));
    const sinFoto = pregunta.opciones.filter(
      (_, i) => huellas[i] === null || huellas[i] === SILUETA_GENERICA,
    );
    if (sinFoto.length > 0) return { imagenes: null, porQue: `sin foto propia: ${sinFoto.join(', ')}` };
    if (new Set(huellas).size !== huellas.length) {
      return { imagenes: null, porQue: 'dos opciones comparten la misma imagen' };
    }

    return {
      imagenes: fichas.map((f) => fotoDelFutbolista((f as { ref: string }).ref)),
      porQue: null,
    };
  }

  /* ── El futbolista de la foto ──────────────────────────────────────────────────────────── */

  private async revisarFoto(pregunta: PreguntaDeclarada, jugador: string): Promise<Comprobacion> {
    const base = { pregunta, fixtureRef: null, fotoRef: null as string | null };
    const hallado = await this.enAthena(jugador);
    if (!hallado) return { ...base, estado: 'sin-foto', nota: `${jugador} no está en Athena` };

    const huella = await this.huellaDeFoto(hallado.ref);
    if (!huella || huella === SILUETA_GENERICA) {
      return { ...base, estado: 'sin-foto', nota: `${hallado.nombre} no tiene foto propia` };
    }
    return { ...base, estado: 'ok', fotoRef: hallado.ref, nota: hallado.nombre };
  }

  /* ── La trayectoria, que sale de la base y no del proveedor ────────────────────────────── */

  private async revisarTrayectoria(
    pregunta: PreguntaDeclarada,
    jugador: string,
    clubesRef: readonly string[],
  ): Promise<Comprobacion> {
    const base = { pregunta, fixtureRef: null, fotoRef: null };
    const hallado = await this.enAthena(jugador);
    if (!hallado) return { ...base, estado: 'sin-datos', nota: `${jugador} no está en Athena` };

    /*
     * `getTransfers` del proveedor va por equipo y no por jugador, así que la trayectoria sale de la
     * tabla `transfers` de Athena, que ya tiene sesenta y seis mil filas y no cuesta cuota.
     */
    const pasos = await this.prisma.$queryRaw<Array<{ ref: string }>>`
      SELECT r.provider_ref AS ref
      FROM transfers t
      JOIN players p ON p.id = t.player_id
      JOIN external_references pr
        ON pr.entity_type = 'player' AND pr.entity_id = p.id AND pr.provider = 'api-football'
      JOIN external_references r
        ON r.entity_type = 'team' AND r.provider = 'api-football'
       AND r.entity_id IN (t.entra_a_team_id, t.sale_de_team_id)
      WHERE pr.provider_ref = ${hallado.ref}`;

    const visitados = new Set(pasos.map((x) => x.ref));
    const faltan = clubesRef.filter((c) => !visitados.has(c));
    if (faltan.length > 0) {
      return {
        ...base,
        estado: 'sin-datos',
        nota: `${hallado.nombre}: sin fichaje registrado para ${faltan.join(', ')}`,
      };
    }
    return { ...base, estado: 'ok', nota: `${hallado.nombre}, ${clubesRef.length} clubes` };
  }

  /* ── El campeón ───────────────────────────────────────────────────────────────────────── */

  private async revisarCampeon(
    pregunta: PreguntaDeclarada,
    v: Extract<PreguntaDeclarada['validacion'], { tipo: 'campeon' }>,
  ): Promise<Comprobacion> {
    const base = { pregunta, fotoRef: null };
    const partidos = await this.partidosDe(v.competenciaRef, v.temporada);
    if (partidos.length === 0) {
      return { ...base, estado: 'sin-partido', fixtureRef: null, nota: 'la temporada no trae partidos' };
    }

    /* El último partido jugado de la temporada es la final; el campeón es quien no perdió ahí. */
    const jugados = partidos
      .filter((p) => p.data.homeScore !== null && p.data.awayScore !== null)
      .sort((a, b) => b.data.kickoffUtc.localeCompare(a.data.kickoffUtc));
    const final = jugados[0];
    if (!final) {
      return { ...base, estado: 'sin-partido', fixtureRef: null, nota: 'ningún partido con marcador' };
    }

    const { homeTeamRef, awayTeamRef, homeScore, awayScore } = final.data;
    const jugo = homeTeamRef === v.campeonRef || awayTeamRef === v.campeonRef;
    const perdio =
      (homeTeamRef === v.campeonRef && (homeScore ?? 0) < (awayScore ?? 0)) ||
      (awayTeamRef === v.campeonRef && (awayScore ?? 0) < (homeScore ?? 0));

    if (!jugo) {
      return {
        ...base,
        estado: 'no-cuadra',
        fixtureRef: final.providerRef,
        nota: `el último partido fue ${homeTeamRef} ${homeScore}-${awayScore} ${awayTeamRef}, sin el campeón declarado`,
      };
    }
    if (perdio) {
      return {
        ...base,
        estado: 'no-cuadra',
        fixtureRef: final.providerRef,
        nota: `perdió el último partido ${homeScore}-${awayScore}`,
      };
    }
    return {
      ...base,
      estado: 'ok',
      fixtureRef: final.providerRef,
      nota: `${final.data.round ?? 'final'} · ${homeScore}-${awayScore}`,
    };
  }

  /* ── Lo que pasó en un partido ────────────────────────────────────────────────────────── */

  private async revisarPartido(
    pregunta: PreguntaDeclarada,
    v: Extract<PreguntaDeclarada['validacion'], { tipo: 'partido' }>,
  ): Promise<Comprobacion> {
    const base = { pregunta, fotoRef: null };
    const partido = await this.localizar(v);
    if (!partido) {
      return { ...base, estado: 'sin-partido', fixtureRef: null, nota: 'no aparece en la temporada' };
    }
    const fixtureRef = partido.providerRef;

    if (v.comprueba === 'marcador') return { ...base, estado: 'ok', fixtureRef, nota: null };

    if (v.comprueba === 'tecnico') {
      const lineups = await this.lineupsDe(fixtureRef);
      const suyo = lineups.find((l) => l.teamRef === (v.equipoRef ?? v.localRef));
      const dt = suyo?.coachName ?? '';
      const calza = calzaNombre(v.quien ?? '', [{ ref: '', nombre: dt }]) !== null;
      return calza
        ? { ...base, estado: 'ok', fixtureRef, nota: dt }
        : { ...base, estado: 'no-cuadra', fixtureRef, nota: `el proveedor dice «${dt || 'sin técnico'}»` };
    }

    if (v.comprueba === 'titularidad') return this.revisarTitularidad(pregunta, v, fixtureRef);
    if (v.comprueba === 'capitan') return this.revisarCapitan(pregunta, v, fixtureRef);
    return this.revisarGoleador(pregunta, v, fixtureRef);
  }

  private async revisarGoleador(
    pregunta: PreguntaDeclarada,
    v: Extract<PreguntaDeclarada['validacion'], { tipo: 'partido' }>,
    fixtureRef: string,
  ): Promise<Comprobacion> {
    const base = { pregunta, fixtureRef, fotoRef: null };
    const eventos = await this.eventosDe(fixtureRef);
    const penales = eventos.filter((e) => e.kind === 'missed_penalty');
    const goles = eventos
      .filter((e) => GOLES.has(e.kind))
      .sort((a, b) => (a.minute ?? 0) - (b.minute ?? 0));

    if (v.comprueba === 'penal-fallado') {
      /*
       * Ningún penal fallado en el acta no quiere decir que el catálogo mienta: quiere decir que el
       * proveedor no lo publica. El de Cueva ante Dinamarca es exactamente ese caso, y confundir
       * «no tengo el dato» con «esto está mal» haría que la auditoría no sirva para nada.
       */
      if (penales.length === 0) {
        return { ...base, estado: 'sin-datos', nota: 'el acta no registra penales fallados' };
      }
      const nombres = await this.nombresDe(penales.map((e) => e.playerRef));
      const calza = calzaNombre(v.quien ?? '', nombres) !== null;
      return calza
        ? { ...base, estado: 'ok', nota: nombres.map((n) => n.nombre).join(', ') }
        : { ...base, estado: 'no-cuadra', nota: `lo falló ${nombres.map((n) => n.nombre).join(', ')}` };
    }

    if (goles.length === 0) {
      return { ...base, estado: 'sin-datos', nota: 'el proveedor no publica eventos de este partido' };
    }

    const nombres = await this.nombresDe(goles.map((e) => e.playerRef));
    const dice = nombres.map((n) => n.nombre).join(', ');

    if (v.orden !== undefined) {
      const enEsaPosicion = nombres[v.orden - 1];
      const calza =
        enEsaPosicion !== undefined &&
        calzaNombre(v.quien ?? '', [enEsaPosicion]) !== null;
      return calza
        ? { ...base, estado: 'ok', nota: `gol ${v.orden}: ${enEsaPosicion?.nombre ?? ''}` }
        : { ...base, estado: 'no-cuadra', nota: `el gol ${v.orden} fue de ${enEsaPosicion?.nombre ?? '—'} (${dice})` };
    }

    const suyos = nombres.filter((n) => calzaNombre(v.quien ?? '', [n]) !== null);
    if (suyos.length === 0) {
      return { ...base, estado: 'no-cuadra', nota: `marcaron ${dice}` };
    }
    if (v.veces !== undefined && suyos.length !== v.veces) {
      return { ...base, estado: 'no-cuadra', nota: `marcó ${suyos.length} y el catálogo dice ${v.veces}` };
    }
    return { ...base, estado: 'ok', nota: dice };
  }

  private async revisarTitularidad(
    pregunta: PreguntaDeclarada,
    v: Extract<PreguntaDeclarada['validacion'], { tipo: 'partido' }>,
    fixtureRef: string,
  ): Promise<Comprobacion> {
    const base = { pregunta, fixtureRef, fotoRef: null };
    const lineups = await this.lineupsDe(fixtureRef);
    /* Por `teamRef` y no por «el local»: mirar el local traía la alineación del rival. */
    const suyo = lineups.find((l) => l.teamRef === (v.equipoRef ?? v.localRef));
    if (!suyo || suyo.startXi.length < 11) {
      return { ...base, estado: 'sin-datos', nota: 'el proveedor no publica el once' };
    }

    const titulares = suyo.startXi.map((j) => ({ ref: j.playerRef ?? '', nombre: j.name }));
    const banco = suyo.substitutes.map((j) => ({ ref: j.playerRef ?? '', nombre: j.name }));

    const elQueNo = calzaNombre(v.quien ?? '', titulares);
    if (elQueNo !== null) {
      return { ...base, estado: 'no-cuadra', nota: `${elQueNo.nombre} SÍ fue titular` };
    }
    if (calzaNombre(v.quien ?? '', banco) === null) {
      return { ...base, estado: 'no-cuadra', nota: `${v.quien} no figura ni en el once ni en el banco` };
    }

    const noTitulares = (v.losOtros ?? []).filter((otro) => calzaNombre(otro, titulares) === null);
    if (noTitulares.length > 0) {
      return {
        ...base,
        estado: 'no-cuadra',
        nota: `tampoco fueron titulares: ${noTitulares.join(', ')}`,
      };
    }
    return { ...base, estado: 'ok', nota: `${v.quien} al banco, los otros tres titulares` };
  }

  private async revisarCapitan(
    pregunta: PreguntaDeclarada,
    v: Extract<PreguntaDeclarada['validacion'], { tipo: 'partido' }>,
    fixtureRef: string,
  ): Promise<Comprobacion> {
    const base = { pregunta, fixtureRef, fotoRef: null };
    const notas = await this.provider.getMatchPlayerStatistics(fixtureRef);
    const capitanes = notas.filter((n) => n.captain && n.teamRef === (v.equipoRef ?? v.localRef));
    if (capitanes.length === 0) {
      return { ...base, estado: 'sin-datos', nota: 'el proveedor no marca capitán' };
    }
    const nombres = await this.nombresDe(capitanes.map((c) => c.playerRef));
    const calza = calzaNombre(v.quien ?? '', nombres) !== null;
    return calza
      ? { ...base, estado: 'ok', nota: nombres.map((n) => n.nombre).join(', ') }
      : { ...base, estado: 'no-cuadra', nota: `el capitán fue ${nombres.map((n) => n.nombre).join(', ')}` };
  }

  /* ── Lo compartido ────────────────────────────────────────────────────────────────────── */

  /** Dentro de la temporada, los dos equipos identifican el partido; se prueban las dos orientaciones. */
  private async localizar(
    v: Extract<PreguntaDeclarada['validacion'], { tipo: 'partido' }>,
  ): Promise<ProviderRef<ProviderMatch> | null> {
    const partidos = await this.partidosDe(v.competenciaRef, v.temporada);
    const candidatos = partidos.filter((p) => {
      const derecho = p.data.homeTeamRef === v.localRef && p.data.awayTeamRef === v.visitaRef;
      const alReves = p.data.homeTeamRef === v.visitaRef && p.data.awayTeamRef === v.localRef;
      return derecho || alReves;
    });
    if (candidatos.length <= 1 || !v.marcador) return candidatos[0] ?? null;

    /* Se cruzaron más de una vez —ida y vuelta—: el marcador dice cuál de las dos es. */
    const [golesLocal, golesVisita] = v.marcador;
    return (
      candidatos.find((p) => {
        const derecho = p.data.homeTeamRef === v.localRef;
        return derecho
          ? p.data.homeScore === golesLocal && p.data.awayScore === golesVisita
          : p.data.homeScore === golesVisita && p.data.awayScore === golesLocal;
      }) ?? null
    );
  }

  private async partidosDe(
    competenciaRef: string,
    temporada: number,
  ): Promise<ProviderRef<ProviderMatch>[]> {
    const llave = `${competenciaRef}:${temporada}`;
    let partidos = this.temporadas.get(llave);
    if (!partidos) {
      partidos = await this.provider.getMatches(competenciaRef, temporada);
      this.temporadas.set(llave, partidos);
    }
    return partidos;
  }

  private async eventosDe(fixtureRef: string): Promise<ProviderMatchEvent[]> {
    let eventos = this.eventos.get(fixtureRef);
    if (!eventos) {
      eventos = await this.provider.getMatchEvents(fixtureRef);
      this.eventos.set(fixtureRef, eventos);
    }
    return eventos;
  }

  private async lineupsDe(fixtureRef: string): Promise<ProviderLineup[]> {
    let lineups = this.alineaciones.get(fixtureRef);
    if (!lineups) {
      lineups = await this.provider.getMatchLineups(fixtureRef);
      this.alineaciones.set(fixtureRef, lineups);
    }
    return lineups;
  }

  /** Los eventos traen el id del futbolista, no su nombre: se pide la ficha de los que hagan falta. */
  private async nombresDe(refs: Array<string | null>): Promise<Array<{ ref: string; nombre: string }>> {
    const pedidos = refs.filter((r): r is string => Boolean(r));
    if (pedidos.length === 0) return [];
    const fichas = await this.provider.getPlayerProfiles([...new Set(pedidos)]);
    const porRef = new Map(fichas.map((f) => [f.providerRef, f.data.name]));
    return pedidos.map((ref) => ({ ref, nombre: porRef.get(ref) ?? ref }));
  }

  /**
   * El futbolista de un nombre suelto, dentro de las cuarenta y seis mil fichas de Athena.
   *
   * Se exige que **cada palabra** del nombre pedido aparezca en la ficha, y se resuelve en la
   * consulta en vez de traer candidatos y filtrarlos acá. Es la diferencia entre encontrar a
   * Fernando Torres y no encontrarlo: de «Torres» hay ciento dos fichas y la suya es la número
   * noventa y seis por fama, así que cualquier tope razonable de candidatos la dejaba fuera.
   *
   * Pedir todas las palabras es lo que separa «Dani Carvajal» —que Athena guarda como «Daniel
   * Carvajal»— de «Ronaldo Nazário», que si se buscara solo por apellido caería en Bruno Nazário.
   * Para ponerle cara a una opción, una cara equivocada es mucho peor que ninguna.
   */
  private async enAthena(nombre: string): Promise<{ ref: string; nombre: string } | null> {
    const recordado = this.fichas.get(nombre);
    if (recordado !== undefined) return recordado;

    const palabras = sinTildes(nombre).split(/\s+/).filter(Boolean);
    const donde = palabras
      .map((_, i) => `immutable_unaccent(lower(p.name || ' ' || coalesce(p.full_name, ''))) LIKE $${i + 1}`)
      .join(' AND ');
    const filas = await this.prisma.$queryRawUnsafe<Array<{ ref: string; name: string }>>(
      `SELECT r.provider_ref AS ref, p.name
       FROM players p
       JOIN external_references r
         ON r.entity_type = 'player' AND r.entity_id = p.id AND r.provider = 'api-football'
       WHERE ${donde}
       ORDER BY p.relevancia DESC LIMIT 1`,
      ...palabras.map((x) => `%${x}%`),
    );

    const fila = filas[0];
    const ficha = fila ? { ref: fila.ref, nombre: fila.name } : null;
    this.fichas.set(nombre, ficha);
    return ficha;
  }

  /** La huella de la foto: el proveedor sirve la misma silueta para todos los que no tienen retrato. */
  private async huellaDeFoto(ref: string): Promise<string | null> {
    const recordada = this.huellas.get(ref);
    if (recordada !== undefined) return recordada === '' ? null : recordada;

    try {
      const res = await fetch(`https://media.api-sports.io/football/players/${ref}.png`);
      if (!res.ok) {
        this.huellas.set(ref, '');
        return null;
      }
      const huella = createHash('sha1').update(Buffer.from(await res.arrayBuffer())).digest('hex');
      this.huellas.set(ref, huella);
      return huella;
    } catch {
      this.huellas.set(ref, '');
      return null;
    }
  }
}

/** La foto la sirve el proveedor por id: no hace falta guardarla ni pedirla. */
const fotoDelFutbolista = (ref: string): string =>
  `https://media.api-sports.io/football/players/${ref}.png`;

const sinTildes = (texto: string): string =>
  texto.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
