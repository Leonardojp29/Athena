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

/**
 * Cuánto quema un evento.
 *
 * La rareza dice cada cuánto sale; el picante dice **cuándo puede salir**. Son cosas distintas y
 * mezclarlas era el problema: a los dieciocho el juego ofrecía un rondo y un doble turno mientras la
 * cadena de las apuestas —que puede terminar en inhabilitación de por vida— también era alcanzable, y
 * de los veinticuatro a los treinta y seis no cambiaba nada.
 *
 * 1 es la vida de un chico que recién llegó: el vestuario, el primer sueldo, la concentración, la
 * pichanga del domingo. 2 es un profesional con nombre: la farándula, el representante, el ampay, la
 * huelga. 3 es lo que solo le pasa a alguien con plata y con prensa encima: el maletín, el casino, la
 * carpeta del periodista, las cuatro de la mañana en la carretera.
 */
export type Picante = 1 | 2 | 3;

/**
 * De qué fútbol habla un evento.
 *
 * Un evento sin ámbito sale en cualquier parte, porque la pelea en el vestuario, las apuestas, la
 * lesión y el técnico son iguales en todos lados. Los que sí lo declaran solo salen ahí, y eso es lo
 * que evita que el juego te pregunte por el mundialito del barrio mientras juegas en Alemania: eran
 * veinticuatro eventos de sesenta y uno con color peruano disparándose en cualquier liga del mundo.
 *
 * La clasificación es la misma con la que `personajes/` ya elige los nombres de cada región, así que
 * no se inventa dos veces.
 */
export type Ambito = 'andino' | 'rioplatense' | 'brasileno' | 'europeo';

const PAISES_POR_AMBITO: Record<Ambito, string[]> = {
  andino: ['PE', 'BO', 'EC'],
  rioplatense: ['AR', 'UY', 'CL', 'PY'],
  brasileno: ['BR'],
  europeo: [],
};

/** En qué ámbito juega hoy. Sin club, en ninguno: los eventos con ámbito no salen. */
export function ambitoDe(club: { paisCodigo: string | null; continente: string } | null): Ambito | null {
  if (!club) return null;
  for (const [ambito, paises] of Object.entries(PAISES_POR_AMBITO) as Array<[Ambito, string[]]>) {
    if (club.paisCodigo && paises.includes(club.paisCodigo)) return ambito;
  }
  return club.continente === 'europa' ? 'europeo' : null;
}

/**
 * Desde qué capítulo se destraba cada nivel. Doce capítulos, de los 16 a los 38.
 *
 * El nivel 2 abre en el capítulo 2 —a los veinte— y no en el tercero: con el nivel 1 solo, el pozo
 * de los primeros capítulos era de once eventos y las primeras preguntas de cada carrera terminaban
 * siendo casi las mismas. A los veinte, el ampay y la farándula ya tienen todo el sentido.
 */
export const CAPITULO_DE_PICANTE: Record<Picante, number> = { 1: 0, 2: 2, 3: 6 };

export const picanteDe = (evento: Evento): Picante => evento.picante ?? 1;

/** ¿Este evento ya puede pasar a esta altura de la carrera? */
export const alcanzaElPicante = (evento: Evento, capitulo: number): boolean =>
  capitulo >= CAPITULO_DE_PICANTE[picanteDe(evento)];

/**
 * Cuánto pesa cada rareza.
 *
 * La escala era mucho más empinada —100 contra 45, 18, 6, 2 y 0,4— y eso hacía que dos carreras
 * distintas se parecieran demasiado: con una sola pregunta por capítulo se sortean once o doce
 * eventos de setenta y seis, y con esos pesos los comunes se llevaban casi todos los turnos. El
 * jugador lo notó jugando la segunda carrera: "siento que hay varias repetidas de la primera".
 *
 * Aplanada, el pozo efectivo se acerca al catálogo entero: dos carreras seguidas comparten uno o dos
 * eventos en lugar de media docena. Lo raro sigue siendo raro, pero raro es raro, no invisible.
 */
export const PESO_DE_RAREZA: Record<Rareza, number> = {
  comun: 100,
  infrecuente: 78,
  raro: 52,
  epico: 30,
  legendario: 14,
  mitico: 4,
};

export interface Condiciones {
  edadMin?: number;
  edadMax?: number;
  ovrMin?: number;
  ovrMax?: number;
  /** Rol exacto que hace falta. */
  roles?: Rol[];
  /** Capítulos jugados como mínimo (0 = puede pasar en el primero). Doce es la carrera entera. */
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
  /**
   * Rangos sobre los diez diales de la vida: `{ estres: [70, 100] }` es "solo si está fundido".
   * Es la puerta de los eventos reactivos —el escándalo llega cuando la fama está alta y el
   * profesionalismo bajo, no porque sí— y por eso son rangos y no umbrales sueltos.
   */
  vida?: Partial<Record<keyof Carrera['vida'], [number, number]>>;
  /** Dónde tiene sentido este evento. Sin declararlo, en cualquier parte. */
  ambito?: Ambito[];
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
  /**
   * La factura que llega después.
   *
   * Apostar a los veinticuatro no se paga a los veinticuatro: se paga cuando la investigación toca
   * la puerta. El evento queda agendado en `carrera.pendientes` y entra sí o sí en el capítulo que
   * le toca, sin depender de que el sorteo vuelva a elegirlo.
   */
  luego?: { eventoId: string; enCapitulos: number };
  /**
   * Te quedas sin club, de verdad.
   *
   * Sin esto un evento podía contar que te rescindían el contrato y dejarte jugando ahí: el texto
   * decía que te habían echado y dos pantallas después pateabas un penal con esa camiseta. Lo que
   * narra una rescisión tiene que producirla, y el capítulo corta lo que le quedaba para abrir el
   * mercado, que es lo que pasa en la vida real.
   */
  dejaElClub?: boolean;
  /** Termina la carrera acá mismo. Solo al final de una cadena que el jugador alimentó. */
  final?: { motivo: MotivoDeFinal; texto: string };
}

/** Por qué se acabó una carrera antes de tiempo. */
export type MotivoDeFinal = 'lesion' | 'sancion' | 'accidente';

/**
 * La apuesta de una opción: puede salir bien o puede salir mal.
 *
 * Es lo que separa decidir de elegir. Sin esto, el resultado de un evento está escrito antes de que
 * el jugador toque nada y ninguna decisión puede sorprenderlo. La pista avisa **el tipo** de riesgo,
 * nunca el resultado: saber que algo puede terminar mal es información; saber que va a terminar mal
 * es un spoiler.
 */
export interface Riesgo {
  /** Probabilidad de que salga bien, 0-1. */
  prob: number;
  bien: Efectos;
  mal: Efectos;
  relatoBien: string;
  relatoMal: string;
}

export interface Opcion {
  id: string;
  texto: string;
  /** El detalle que aparece bajo la opción: lo que el jugador sabe antes de decidir. */
  pista?: string;
  /** Lo que pasa siempre, salga como salga. */
  efectos: Efectos;
  /** Y lo que se juega a los dados encima de eso. */
  riesgo?: Riesgo;
  /** El texto que se muestra cuando ya eligió: la consecuencia narrada. */
  resultado: string;
}

/**
 * La regla del catálogo: cuatro opciones, siempre.
 *
 * Con dos o tres, la decisión se lee de un vistazo y el jugador aprende cuál es "la buena". Con
 * cuatro entran las cuatro voces que hacen interesante una decisión —la prudente, la profesional,
 * la ambiciosa y la que te va a meter en un problema— y ninguna partida se parece a la anterior.
 */
export const OPCIONES_POR_EVENTO = 4;

export interface Evento {
  id: string;
  categoria: Categoria;
  rareza: Rareza;
  /** Cuánto quema. Sin declararlo, un evento es de nivel 1 y puede salir desde el principio. */
  picante?: Picante;
  /** Cómo lo cuenta el juego. `{nombre}`, `{club}`, `{rival}`, `{dt}`, `{liga}` se reemplazan. */
  titulo: string;
  texto: string;
  tipoDeRecuerdo: TipoRecuerdo;
  condiciones?: Condiciones;
  /** Años que tienen que pasar para que pueda repetirse. 0 = una sola vez en la carrera. */
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

  if (c.ambito) {
    const ambito = ambitoDe(carrera.clubActual);
    if (!ambito || !c.ambito.includes(ambito)) return false;
  }

  if (c.clubFuerzaMin !== undefined && (carrera.clubActual?.fuerza ?? 0) < c.clubFuerzaMin) return false;
  if (c.clubFuerzaMax !== undefined && (carrera.clubActual?.fuerza ?? 100) > c.clubFuerzaMax) return false;

  if (c.contratoPorVencer && (carrera.contrato?.hasta ?? 9999) > carrera.anio + 1) return false;

  /* La nota del último bienio jugado: es lo que el club y la prensa tienen a mano para juzgarte. */
  const nota = carrera.temporadas.at(-1)?.notaMedia ?? 6.5;
  if (c.notaMin !== undefined && nota < c.notaMin) return false;
  if (c.notaMax !== undefined && nota > c.notaMax) return false;

  if (c.personalidad) {
    for (const [rasgo, rango] of Object.entries(c.personalidad)) {
      if (!rango) continue;
      const valor = futbolista.personalidad[rasgo as keyof typeof futbolista.personalidad];
      if (valor < rango[0] || valor > rango[1]) return false;
    }
  }

  if (c.vida) {
    for (const [dial, rango] of Object.entries(c.vida)) {
      if (!rango) continue;
      const valor = vida[dial as keyof typeof vida];
      if (valor < rango[0] || valor > rango[1]) return false;
    }
  }

  if (c.conEtiquetas?.some((e) => !etiquetas.has(e))) return false;
  if (c.sinEtiquetas?.some((e) => etiquetas.has(e))) return false;
  return true;
}

/** ¿Ya salió hace poco? Sin cooldown declarado, un evento no se repite nunca. */
/**
 * ¿Ya salió en esta carrera?
 *
 * Una pregunta no se repite **nunca** dentro de la misma carrera, y esa es la regla. Antes el
 * `cooldown` estaba en años y un capítulo son dos, así que un `cooldown: 4` volvía a los dos
 * capítulos: medido, el 63% de las carreras repetía por lo menos una pregunta. Con setenta y seis
 * eventos escritos y once por carrera no hay ninguna razón para que eso pase.
 *
 * El `cooldown` de cada evento sigue declarado y sigue significando algo: es el orden en que la
 * última red (`ignorarCooldown`) elige a quién repetir si algún día el pozo se vacía de verdad.
 */
function disponible(evento: Evento, carrera: Carrera): boolean {
  return carrera.vistos[evento.id] === undefined;
}

export interface OpcionesDeSorteo {
  /** Categorías permitidas en este punto de la temporada. */
  categorias?: Categoria[];
  /** Un evento pedido explícitamente (el `luego` de otra decisión). */
  forzado?: string | null;
  /** Última red: antes de dejar al jugador sin pregunta, se repite uno que ya vio. */
  ignorarCooldown?: boolean;
}

export function elegirEvento(
  azar: Azar,
  carrera: Carrera,
  catalogo: Evento[],
  opciones: OpcionesDeSorteo = {},
): Evento | null {
  /*
   * Un evento agendado entra sí o sí, y a propósito **no** pasa por el filtro del picante: la factura
   * de lo que hiciste llega cuando le toca, no cuando la carrera esté lo bastante madura para
   * recibirla. Lo que gradúa el escándalo es dónde **empieza** una cadena, no dónde termina.
   */
  if (opciones.forzado) {
    const forzado = catalogo.find((e) => e.id === opciones.forzado);
    if (forzado) return forzado;
  }
  const etiquetas = etiquetasDe(carrera);
  const posibles = catalogo.filter(
    (e) =>
      (!opciones.categorias || opciones.categorias.includes(e.categoria)) &&
      alcanzaElPicante(e, carrera.capitulo) &&
      (opciones.ignorarCooldown || disponible(e, carrera)) &&
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
  datos: {
    nombre: string;
    club: string;
    rival: string;
    dt: string;
    liga: string;
    pais: string;
    /** El país donde juega hoy, que no es lo mismo que su nacionalidad. */
    paisDelClub?: string;
    figura?: string;
    periodista?: string;
    companero?: string;
  },
): string {
  return texto
    .replaceAll('{nombre}', datos.nombre)
    .replaceAll('{apellido}', datos.nombre.split(' ').at(-1) ?? datos.nombre)
    .replaceAll('{club}', datos.club)
    .replaceAll('{rival}', datos.rival)
    .replaceAll('{dt}', datos.dt)
    .replaceAll('{liga}', datos.liga)
    .replaceAll('{pais}', datos.pais)
    .replaceAll('{paisDelClub}', datos.paisDelClub ?? datos.pais)
    .replaceAll('{figura}', datos.figura ?? 'una figura de la televisión')
    .replaceAll('{periodista}', datos.periodista ?? 'un periodista')
    .replaceAll('{companero}', datos.companero ?? 'un compañero');
}
