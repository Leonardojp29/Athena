import { caminoAlTitulo, ANUAL, APERTURA, CLAUSURA } from './reglamento-liga1.js';
import { calcularTabla } from './tabla.js';
import type { DatosDeLaCalculadora, Pronosticos, ReglasLiga, Tabla } from './tipos.js';

/**
 * Cuántas veces termina cada cosa, si el resto del torneo se juega muchas veces.
 *
 * Esto no es un pronóstico de Athena: es contar finales sobre el escenario que cargó el lector.
 * Los partidos que él fijó y los que ya se jugaron no se sortean; solo se sortea lo que queda
 * verdaderamente abierto, y el rótulo de la pantalla lo dice con todas las letras.
 *
 * El modelo es el mínimo que respeta el fútbol: cada equipo tiene un ataque y una defensa
 * medidos en la propia temporada, los goles salen de una Poisson y el local rinde un poco más
 * —también medido, no supuesto—. No hay lesiones, ni calendario, ni estado de ánimo, y eso se
 * documenta en vez de disimularse.
 *
 * La semilla sale del escenario, así que dos personas con el mismo enlace ven exactamente los
 * mismos porcentajes. Un porcentaje que baila entre recargas no se puede citar.
 */

export interface Probabilidad {
  equipoId: string;
  titulo: number;
  libertadores: number;
  sudamericana: number;
  descenso: number;
}

const CUPOS_LIBERTADORES = 4;
const CUPOS_SUDAMERICANA = 8;
const PRIMER_DESCENDIDO = 17;
const SIMULACIONES = 5_000;

/** Un generador con semilla: los tests son deterministas y el enlace compartido, reproducible. */
export function mulberry32(semilla: number): () => number {
  let estado = semilla >>> 0;
  return () => {
    estado = (estado + 0x6d2b79f5) >>> 0;
    let t = estado;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function semillaDe(texto: string): number {
  let hash = 2166136261;
  for (let i = 0; i < texto.length; i += 1) {
    hash ^= texto.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

/** Poisson por inversión: con medias de uno o dos goles es más rápido que cualquier alternativa. */
function poisson(media: number, azar: () => number): number {
  const limite = Math.exp(-media);
  let k = 0;
  let producto = azar();
  while (producto > limite && k < 12) {
    k += 1;
    producto *= azar();
  }
  return k;
}

interface Fuerza {
  ataque: number;
  defensa: number;
}

interface Modelo {
  fuerzas: Map<string, Fuerza>;
  mediaLocal: number;
  mediaVisita: number;
}

const JUGADO = new Set(['finished', 'in_play', 'paused']);

/**
 * Ataque y defensa de cada equipo contra el promedio de la liga, más la ventaja de local, todo
 * sacado de los partidos que ya se jugaron esta misma temporada.
 */
export function medirFuerzas(datos: DatosDeLaCalculadora): Modelo {
  const jugados = datos.partidos.filter(
    (p) => JUGADO.has(p.estado) && p.golesLocal !== null && p.golesVisita !== null,
  );

  const fuerzas = new Map<string, Fuerza>(
    datos.equipos.map((e) => [e.id, { ataque: 1, defensa: 1 }]),
  );
  if (jugados.length === 0) return { fuerzas, mediaLocal: 1.3, mediaVisita: 1.1 };

  const mediaLocal = jugados.reduce((t, p) => t + (p.golesLocal ?? 0), 0) / jugados.length;
  const mediaVisita = jugados.reduce((t, p) => t + (p.golesVisita ?? 0), 0) / jugados.length;
  const mediaGeneral = (mediaLocal + mediaVisita) / 2;

  const cuenta = new Map(
    datos.equipos.map((e) => [e.id, { favor: 0, contra: 0, partidos: 0 }]),
  );
  for (const partido of jugados) {
    const local = cuenta.get(partido.local);
    const visita = cuenta.get(partido.visita);
    if (!local || !visita) continue;
    local.favor += partido.golesLocal ?? 0;
    local.contra += partido.golesVisita ?? 0;
    local.partidos += 1;
    visita.favor += partido.golesVisita ?? 0;
    visita.contra += partido.golesLocal ?? 0;
    visita.partidos += 1;
  }

  for (const [id, c] of cuenta) {
    if (c.partidos === 0 || mediaGeneral === 0) continue;
    /* Acotado: un equipo con tres partidos no puede valer el triple que la liga. */
    const ataque = Math.min(2.5, Math.max(0.4, c.favor / c.partidos / mediaGeneral));
    const defensa = Math.min(2.5, Math.max(0.4, c.contra / c.partidos / mediaGeneral));
    fuerzas.set(id, { ataque, defensa });
  }

  return { fuerzas, mediaLocal, mediaVisita };
}

function sortearMarcador(
  modelo: Modelo,
  local: string,
  visita: string,
  azar: () => number,
): [number, number] {
  const fl = modelo.fuerzas.get(local) ?? { ataque: 1, defensa: 1 };
  const fv = modelo.fuerzas.get(visita) ?? { ataque: 1, defensa: 1 };
  return [
    poisson(modelo.mediaLocal * fl.ataque * fv.defensa, azar),
    poisson(modelo.mediaVisita * fv.ataque * fl.defensa, azar),
  ];
}

/** Un cruce a ida y vuelta; el empate global se va a los penales, que son una moneda. */
function ganadorDelCruce(
  modelo: Modelo,
  local: string,
  visita: string,
  azar: () => number,
): string {
  const ida = sortearMarcador(modelo, local, visita, azar);
  const vuelta = sortearMarcador(modelo, visita, local, azar);
  const globalLocal = ida[0] + vuelta[1];
  const globalVisita = ida[1] + vuelta[0];
  if (globalLocal !== globalVisita) return globalLocal > globalVisita ? local : visita;
  return azar() < 0.5 ? local : visita;
}

export function simular(
  datos: DatosDeLaCalculadora,
  pronosticos: Pronosticos,
  reglas: ReglasLiga,
  opciones: { simulaciones?: number; semilla?: number } = {},
): Probabilidad[] {
  const total = opciones.simulaciones ?? SIMULACIONES;
  const azar = mulberry32(opciones.semilla ?? 0);
  const modelo = medirFuerzas(datos);

  const abiertos = datos.partidos.filter(
    (p) => !JUGADO.has(p.estado) && !pronosticos.has(p.id) && p.estado === 'scheduled',
  );

  const cuenta = new Map(
    datos.equipos.map((e) => [
      e.id,
      { titulo: 0, libertadores: 0, sudamericana: 0, descenso: 0 },
    ]),
  );

  const definicion = (clave: string) => {
    const encontrada = reglas.tablas.find((t) => t.clave === clave);
    if (!encontrada) throw new Error(`falta la tabla ${clave}`);
    return encontrada;
  };
  const defApertura = definicion(APERTURA);
  const defClausura = definicion(CLAUSURA);
  const defAnual = definicion(ANUAL);

  const sorteados = new Map<string, readonly [number, number]>();
  const escenario: Map<string, readonly [number, number]> = new Map(pronosticos);

  for (let vuelta = 0; vuelta < total; vuelta += 1) {
    sorteados.clear();
    for (const partido of abiertos) {
      sorteados.set(partido.id, sortearMarcador(modelo, partido.local, partido.visita, azar));
    }
    const conSorteo = new Map(escenario);
    for (const [id, marcador] of sorteados) conSorteo.set(id, marcador);

    const apertura = calcularTabla(
      defApertura,
      datos.equipos,
      datos.partidos,
      conSorteo,
      datos.ordenOficial,
    );
    const clausura = calcularTabla(
      defClausura,
      datos.equipos,
      datos.partidos,
      conSorteo,
      datos.ordenOficial,
    );
    const anual = calcularTabla(
      defAnual,
      datos.equipos,
      datos.partidos,
      conSorteo,
      datos.ordenOficial,
    );

    anotarCupos(anual, cuenta);

    const camino = caminoAlTitulo(apertura, clausura, anual);
    const campeon = camino === null ? null : resolverCampeon(camino, modelo, azar);
    if (campeon) {
      const c = cuenta.get(campeon);
      if (c) c.titulo += 1;
    }
  }

  return datos.equipos.map((equipo) => {
    const c = cuenta.get(equipo.id) ?? {
      titulo: 0,
      libertadores: 0,
      sudamericana: 0,
      descenso: 0,
    };
    return {
      equipoId: equipo.id,
      titulo: c.titulo / total,
      libertadores: c.libertadores / total,
      sudamericana: c.sudamericana / total,
      descenso: c.descenso / total,
    };
  });
}

function anotarCupos(
  anual: Tabla,
  cuenta: Map<string, { libertadores: number; sudamericana: number; descenso: number }>,
): void {
  for (const fila of anual.filas) {
    const c = cuenta.get(fila.equipo.id);
    if (!c) continue;
    if (fila.posicion <= CUPOS_LIBERTADORES) c.libertadores += 1;
    else if (fila.posicion <= CUPOS_SUDAMERICANA) c.sudamericana += 1;
    if (fila.posicion >= PRIMER_DESCENDIDO) c.descenso += 1;
  }
}

function resolverCampeon(
  camino: ReturnType<typeof caminoAlTitulo> & object,
  modelo: Modelo,
  azar: () => number,
): string | null {
  if (camino.campeon) return camino.campeon;

  const ganadores = new Map<string, string>();
  for (const cruce of camino.cruces) {
    if (cruce.ronda !== 'semifinal') continue;
    ganadores.set(cruce.local, ganadorDelCruce(modelo, cruce.local, cruce.visita, azar));
  }

  const final = camino.cruces.find((c) => c.ronda === 'final');
  if (!final) return null;

  /* En el árbol con una sola semifinal, el rival de la final es su ganador. */
  const local = ganadores.get(final.local) ?? final.local;
  const visita = ganadores.get(final.visita) ?? final.visita;
  return ganadorDelCruce(modelo, local, visita, azar);
}
