/**
 * El motor de eventos.
 *
 * Los eventos son **datos**, no código: agregar uno nuevo al catálogo no toca este archivo. Cada
 * evento declara cuándo puede aparecer (condiciones), cuánto pesa frente a los demás, cada cuánto
 * puede repetirse, qué opciones ofrece y qué deja en la memoria. El motor solo filtra, pesa y elige.
 *
 * Las condiciones son un objeto tipado y se evalúan con código: nunca `eval` ni expresiones en
 * texto. Se pagan dos líneas más al escribir un evento y a cambio el compilador atrapa los errores
 * antes de que lleguen a una partida.
 */
import { pesado, type Azar } from '../azar.js';
import type { Carrera, Rol, TipoRecuerdo } from '../estado.js';

export type Categoria =
  | 'futbol'
  | 'profesional'
  | 'prensa'
  | 'social'
  | 'relaciones'
  | 'dinero'
  | 'caos'
  | 'legado';

export type Rareza = 'comun' | 'infrecuente' | 'raro' | 'epico' | 'legendario' | 'mitico';

/** Cuánto pesa cada rareza. Lo mítico tiene que ser mítico de verdad. */
export const PESO_DE_RAREZA: Record<Rareza, number> = {
  comun: 100,
  infrecuente: 45,
  raro: 18,
  epico: 6,
  legendario: 2,
  mitico: 0.4,
};

export interface Condiciones {
  edadMin?: number;
  edadMax?: number;
  ovrMin?: number;
  ovrMax?: number;
  /** Rol exacto que hace falta. */
  roles?: Rol[];
  /** Temporadas jugadas como mínimo (0 = puede pasar en la primera). */
  temporadasMin?: number;
  famaMin?: number;
  famaMax?: number;
  dineroMin?: number;
  estresMin?: number;
  /** Rasgos de personalidad: mínimo y máximo, 0-100. */
  personalidad?: Partial<Record<keyof Carrera['futbolista']['personalidad'], [number, number]>>;
  /** Exige que la memoria tenga TODAS estas etiquetas. */
  conEtiquetas?: string[];
  /** Excluye el evento si la memoria tiene CUALQUIERA de estas. */
  sinEtiquetas?: string[];
  /** Sirve para los eventos que dependen del club: 'grande' es fuerza >= 72. */
  clubFuerzaMin?: number;
  clubFuerzaMax?: number;
  /** Solo si ya jugó en más de un club, para los eventos de regreso y de mercenario. */
  clubesMin?: number;
  /** Solo con contrato a punto de vencer. */
  contratoPorVencer?: boolean;
  /** Solo si viene de una temporada con nota alta o baja. */
  notaMin?: number;
  notaMax?: number;
}

/** El efecto de una opción sobre el estado. Todo es relativo: sumas y restas, nunca asignaciones. */
export interface Efectos {
  vida?: Partial<Record<keyof Carrera['vida'], number>>;
  atributos?: Partial<Record<keyof Carrera['futbolista']['atributos'], number>>;
  personalidad?: Partial<Record<keyof Carrera['futbolista']['personalidad'], number>>;
  relaciones?: Partial<
    Record<keyof Carrera['relaciones'], Partial<{ confianza: number; respeto: number; rencor: number }>>
  >;
  /** Etiquetas que quedan en la memoria: son lo que hace que el juego recuerde. */
  etiquetas?: string[];
  /** Un titular de prensa, con su tono. */
  titular?: { texto: string; tono: 'elogio' | 'duda' | 'polemica' | 'neutro' };
  /** Cuánto ayudó o costó esta decisión: alimenta la mejor y la peor de la carrera. */
  balance?: number;
  /** Un evento que se dispara en la próxima oportunidad. */
  luego?: string;
}

export interface Opcion {
  id: string;
  texto: string;
  /** El detalle que aparece bajo la opción: lo que el jugador sabe antes de decidir. */
  pista?: string;
  efectos: Efectos;
  /** El texto que se muestra cuando ya eligió: la consecuencia narrada. */
  resultado: string;
}

export interface Evento {
  id: string;
  categoria: Categoria;
  rareza: Rareza;
  /** Cómo lo cuenta el juego. `{nombre}`, `{club}`, `{rival}`, `{dt}`, `{liga}` se reemplazan. */
  titulo: string;
  texto: string;
  tipoDeRecuerdo: TipoRecuerdo;
  condiciones?: Condiciones;
  /** Temporadas que tienen que pasar para que pueda repetirse. 0 = una sola vez en la carrera. */
  cooldown?: number;
  /** Peso extra sobre el de su rareza, para los eventos que deberían salir seguido en su contexto. */
  peso?: number;
  opciones: Opcion[];
}

const etiquetasDe = (carrera: Carrera): Set<string> => {
  const set = new Set<string>();
  for (const recuerdo of carrera.recuerdos) {
    for (const etiqueta of recuerdo.etiquetas) set.add(etiqueta);
  }
  return set;
};

export function cumple(evento: Evento, carrera: Carrera, etiquetas: Set<string>): boolean {
  const c = evento.condiciones;
  if (!c) return true;
  const { futbolista, vida, ovr, rol } = carrera;

  if (c.edadMin !== undefined && futbolista.edad < c.edadMin) return false;
  if (c.edadMax !== undefined && futbolista.edad > c.edadMax) return false;
  if (c.ovrMin !== undefined && ovr < c.ovrMin) return false;
  if (c.ovrMax !== undefined && ovr > c.ovrMax) return false;
  if (c.roles && !c.roles.includes(rol)) return false;
  if (c.temporadasMin !== undefined && carrera.temporadas.length < c.temporadasMin) return false;
  if (c.famaMin !== undefined && vida.fama < c.famaMin) return false;
  if (c.famaMax !== undefined && vida.fama > c.famaMax) return false;
  if (c.dineroMin !== undefined && vida.dinero < c.dineroMin) return false;
  if (c.estresMin !== undefined && vida.estres < c.estresMin) return false;
  if (c.clubesMin !== undefined && carrera.clubes.length < c.clubesMin) return false;

  if (c.clubFuerzaMin !== undefined && (carrera.clubActual?.fuerza ?? 0) < c.clubFuerzaMin) return false;
  if (c.clubFuerzaMax !== undefined && (carrera.clubActual?.fuerza ?? 100) > c.clubFuerzaMax) return false;

  if (c.contratoPorVencer && (carrera.contrato?.hasta ?? 9999) > carrera.anio + 1) return false;

  const nota = carrera.temporadas.at(-1)?.notaMedia ?? carrera.enCurso?.notaMedia ?? 6.5;
  if (c.notaMin !== undefined && nota < c.notaMin) return false;
  if (c.notaMax !== undefined && nota > c.notaMax) return false;

  if (c.personalidad) {
    for (const [rasgo, rango] of Object.entries(c.personalidad)) {
      if (!rango) continue;
      const valor = futbolista.personalidad[rasgo as keyof typeof futbolista.personalidad];
      if (valor < rango[0] || valor > rango[1]) return false;
    }
  }

  if (c.conEtiquetas?.some((e) => !etiquetas.has(e))) return false;
  if (c.sinEtiquetas?.some((e) => etiquetas.has(e))) return false;
  return true;
}

/** ¿Ya salió hace poco? Sin cooldown declarado, un evento no se repite nunca. */
function disponible(evento: Evento, carrera: Carrera): boolean {
  const visto = carrera.vistos[evento.id];
  if (visto === undefined) return true;
  const cooldown = evento.cooldown ?? 0;
  if (cooldown === 0) return false;
  return carrera.anio - visto >= cooldown;
}

export interface OpcionesDeSorteo {
  /** Categorías permitidas en este punto de la temporada. */
  categorias?: Categoria[];
  /** Un evento pedido explícitamente (el `luego` de otra decisión). */
  forzado?: string | null;
}

export function elegirEvento(
  azar: Azar,
  carrera: Carrera,
  catalogo: Evento[],
  opciones: OpcionesDeSorteo = {},
): Evento | null {
  if (opciones.forzado) {
    const forzado = catalogo.find((e) => e.id === opciones.forzado);
    if (forzado) return forzado;
  }
  const etiquetas = etiquetasDe(carrera);
  const posibles = catalogo.filter(
    (e) =>
      (!opciones.categorias || opciones.categorias.includes(e.categoria)) &&
      disponible(e, carrera) &&
      cumple(e, carrera, etiquetas),
  );
  return pesado(
    azar,
    posibles.map((e) => ({ item: e, peso: (e.peso ?? 1) * PESO_DE_RAREZA[e.rareza] })),
  );
}

/** Reemplaza los huecos del texto con los nombres de esta carrera. */
export function redactar(
  texto: string,
  datos: { nombre: string; club: string; rival: string; dt: string; liga: string; pais: string },
): string {
  return texto
    .replaceAll('{nombre}', datos.nombre)
    .replaceAll('{apellido}', datos.nombre.split(' ').at(-1) ?? datos.nombre)
    .replaceAll('{club}', datos.club)
    .replaceAll('{rival}', datos.rival)
    .replaceAll('{dt}', datos.dt)
    .replaceAll('{liga}', datos.liga)
    .replaceAll('{pais}', datos.pais);
}
