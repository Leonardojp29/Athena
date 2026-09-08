/**
 * Los momentos jugables.
 *
 * Son pocos a propósito. Si cada partido fuera jugable, ninguno sería importante: el juego cuenta una
 * carrera, no noventa minutos. Estos cuatro aparecen cuando algo está en juego —un penal en el 89, un
 * mano a mano en una final— y por eso se recuerdan.
 *
 * Acá se decide **todo**: el desenlace, dónde voló el arquero y qué se cuenta. La pantalla no resuelve
 * nada, solo anima lo que este archivo ya dictó. Antes había dos resoluciones en paralelo —una en el
 * canvas y otra acá— y podían contradecirse: la pantalla decía "¡La atajó!" y la crónica decía que
 * había entrado. Con una sola fuente eso es imposible por construcción.
 *
 * La jugada se resuelve en dos toques: a qué zona del arco y cómo la pegas. La segunda elección es la
 * que importa, porque se juega contra la lectura del arquero, que el jugador no conoce: colocada le
 * gana al que se queda y pierde con el que adivina, potente no le da tiempo a nadie pero se va afuera,
 * y picarla humilla al que se tira y es un papelón contra el que no se mueve.
 */
import { chance, limitar, type Azar } from './azar.js';
import type { Atributos, ClaseDeMomento, ContextoDeMomento } from './estado.js';

/** Izquierda, centro, derecha. Sirve para la zona y para el vuelo del arquero. */
export type Lado = -1 | 0 | 1;

export type Zona = 'izq-alta' | 'centro-alta' | 'der-alta' | 'izq-baja' | 'centro-baja' | 'der-baja';

export type Remate = 'colocada' | 'potente' | 'picarla';

/** Cómo terminó la jugada. Es lo que la pantalla dibuja y lo que el relato cuenta: el mismo dato. */
export type Desenlace = 'gol' | 'atajada' | 'palo' | 'afuera' | 'barrera';

/** Lo que la interfaz manda: dos toques y nada más. */
export interface Intencion {
  zona: Zona;
  remate: Remate;
}

/** El veredicto que la pantalla tiene que animar. */
export interface Jugada {
  clase: ClaseDeMomento;
  zona: Zona;
  remate: Remate;
  desenlace: Desenlace;
  /** A qué lado voló el arquero. En la atajada, a qué lado voló el jugador. */
  arquero: Lado;
}

export interface ResultadoDeMomento {
  exito: boolean;
  /** El desenlace y `exito` nunca pueden discrepar: un test lo vigila. */
  desenlace: Desenlace;
  arquero: Lado;
  /** Qué pasó, en una línea, para narrarlo. */
  relato: string;
  /** Cómo se sintió: la interfaz elige la celebración o el silencio. */
  tono: 'gol' | 'atajada' | 'fallo' | 'neutro';
  efectos: {
    confianza: number;
    carinoDeLaHinchada: number;
    forma: number;
    estres: number;
    reputacion?: number;
  };
  /** Si el momento suma un gol o una asistencia a la temporada. */
  suma?: { goles?: number; asistencias?: number };
}

export const ZONAS: Record<Zona, { lado: Lado; alta: boolean }> = {
  'izq-alta': { lado: -1, alta: true },
  'centro-alta': { lado: 0, alta: true },
  'der-alta': { lado: 1, alta: true },
  'izq-baja': { lado: -1, alta: false },
  'centro-baja': { lado: 0, alta: false },
  'der-baja': { lado: 1, alta: false },
};

export const REMATES: Remate[] = ['colocada', 'potente', 'picarla'];

/** El mismo gesto se llama distinto según el momento: no es lo mismo picarla que amagar. */
export function rotuloDeRemate(clase: ClaseDeMomento, remate: Remate): { texto: string; pista: string } {
  if (clase === 'atajada') {
    if (remate === 'colocada') return { texto: 'Esperar', pista: 'Te quedas y reaccionas. Lo seguro.' };
    if (remate === 'potente') return { texto: 'Volar', pista: 'Te estiras. Cubres más arco, llegas más tarde.' };
    return { texto: 'Adelantarte', pista: 'Te tiras antes de que patee. Si aciertas, es tuya.' };
  }
  if (clase === 'mano-a-mano') {
    if (remate === 'colocada') return { texto: 'Definir ya', pista: 'Antes de que cierre el ángulo.' };
    if (remate === 'potente') return { texto: 'Cruzarla fuerte', pista: 'Al segundo palo, sin pensarlo.' };
    return { texto: 'Amagar', pista: 'Esperas que se tire y la pasas. Si no se tira, te la come.' };
  }
  if (remate === 'colocada') return { texto: 'Colocada', pista: 'Precisión. Muere si el arquero adivina el palo.' };
  if (remate === 'potente') return { texto: 'Potente', pista: 'No le da tiempo a nadie. Se puede ir afuera.' };
  return { texto: 'Picarla', pista: 'El lujo. Humilla al que se tira, papelón contra el que se queda.' };
}

/**
 * La dificultad del arquero rival crece con la escena. Un penal en una final ante ochenta mil personas
 * no es el mismo penal que en un amistoso, y el juego tiene que hacerlo sentir.
 */
const dificultadDe = (contexto: ContextoDeMomento): number => limitar(0.35 + contexto.presion * 0.3, 0.3, 0.75);

/** Un arquero se tira casi siempre. Quedarse parado es la minoría, y es lo que castiga a quien la pica. */
function lecturaDelArquero(azar: Azar): Lado {
  const tirada = azar.siguiente();
  if (tirada < 0.39) return -1;
  if (tirada < 0.78) return 1;
  return 0;
}

/**
 * El cuadro que resuelve cualquier remate.
 *
 * Dos tiradas y en este orden: primero si le erraste al arco —eso el arquero no lo toca— y después si
 * llegó. Importa el orden, porque reventarla por encima del travesaño es una historia donde el arquero
 * no existe.
 */
function resolverRemate(
  azar: Azar,
  intencion: Intencion,
  contexto: ContextoDeMomento,
  base: { fallo: number; atajada: number },
  oficio: number,
  templado: number,
): { desenlace: Desenlace; arquero: Lado; adivino: boolean } {
  const zona = ZONAS[intencion.zona];
  const arquero = lecturaDelArquero(azar);
  const adivino = arquero === zona.lado;

  let fallo = base.fallo * (1.35 - oficio * 0.6) * (1.12 - templado * 0.22);
  if (intencion.remate === 'potente') fallo *= zona.alta ? 2.1 : 1.5;
  if (intencion.remate === 'colocada') fallo *= 0.7;
  if (intencion.remate === 'picarla') fallo *= 1.4;
  if (zona.alta) fallo *= 1.3;

  let alcance = adivino ? 2.2 : 0.5;
  if (intencion.remate === 'potente') alcance *= 0.65;
  if (intencion.remate === 'picarla') alcance = arquero === 0 ? 5.2 : 0.16;
  if (zona.alta) alcance *= 0.62;

  const atajada = base.atajada * alcance * (0.85 + dificultadDe(contexto) * 0.4);

  if (chance(azar, limitar(fallo, 0.01, 0.6))) {
    const alPalo = chance(azar, 0.35);
    return { desenlace: alPalo ? 'palo' : 'afuera', arquero, adivino };
  }
  if (chance(azar, limitar(atajada, 0.02, 0.85))) return { desenlace: 'atajada', arquero, adivino };
  return { desenlace: 'gol', arquero, adivino };
}

const GOL = {
  confianza: 12,
  carinoDeLaHinchada: 10,
  forma: 7,
  estres: -6,
  reputacion: 3,
} as const;

const FALLO = { confianza: -11, carinoDeLaHinchada: -5, forma: -5, estres: 10 } as const;

const oficioDe = (atributos: Atributos): number =>
  (atributos.tiro * 0.6 + atributos.regate * 0.2 + atributos.pase * 0.2) / 100;

/**
 * El penal.
 *
 * El momento más probable del juego, y tiene que serlo: en la cancha entra cuatro de cada cinco. Lo
 * que se juega no es si entra, es cómo, y contra qué arquero. Esquinar arriba deja al arquero sin
 * respuesta; ir al medio es una lotería contra el que no se mueve.
 */
export function resolverPenal(
  azar: Azar,
  intencion: Intencion,
  atributos: Atributos,
  contexto: ContextoDeMomento,
  confianza: number,
): ResultadoDeMomento {
  const templado = limitar(confianza / 100, 0.3, 1);
  const { desenlace, arquero, adivino } = resolverRemate(
    azar,
    intencion,
    contexto,
    { fallo: 0.055, atajada: 0.155 },
    oficioDe(atributos),
    templado,
  );
  const alta = ZONAS[intencion.zona].alta;

  if (desenlace === 'gol') {
    const relato =
      intencion.remate === 'picarla'
        ? 'Se la picaste al medio con el arquero volando. El estadio no lo podía creer.'
        : alta
          ? 'Arriba, contra el ángulo. El arquero llegó a mirarla nada más.'
          : 'Cruzada, firme, pegada al palo. Adentro.';
    return {
      exito: true,
      desenlace,
      arquero,
      relato,
      tono: 'gol',
      efectos: intencion.remate === 'picarla' ? { ...GOL, confianza: 15, reputacion: 5 } : GOL,
      suma: { goles: 1 },
    };
  }

  if (desenlace === 'atajada') {
    const relato =
      intencion.remate === 'picarla'
        ? 'Quisiste picarla y el arquero no se movió. La tomó con las dos manos y te miró.'
        : adivino
          ? 'Adivinó el palo y la sacó con la punta de los dedos.'
          : 'Le pegaste al alcance de su mano. La rechazó como pudo, pero la rechazó.';
    return { exito: false, desenlace, arquero, relato, tono: 'fallo', efectos: FALLO };
  }

  const relato =
    desenlace === 'palo'
      ? alta
        ? 'Al travesaño. El ruido del palo se escuchó en toda la tribuna.'
        : 'Al palo. La pelota volvió al área y se la llevaron ellos.'
      : intencion.remate === 'potente'
        ? 'La reventaste por encima del arco. No la tocó nadie.'
        : 'Se te fue apenas al lado del palo.';
  return { exito: false, desenlace, arquero, relato, tono: 'fallo', efectos: { ...FALLO, confianza: -10 } };
}

/**
 * El mano a mano. Más difícil que el penal porque el arquero te sale encima y el arco se cierra: acá
 * el arquero no espera en la línea, achica.
 */
export function resolverManoAMano(
  azar: Azar,
  intencion: Intencion,
  atributos: Atributos,
  contexto: ContextoDeMomento,
  confianza: number,
): ResultadoDeMomento {
  const templado = limitar(confianza / 100, 0.3, 1);
  const oficio = (atributos.tiro * 0.45 + atributos.regate * 0.4 + atributos.ritmo * 0.15) / 100;
  const { desenlace, arquero, adivino } = resolverRemate(
    azar,
    intencion,
    contexto,
    { fallo: 0.16, atajada: 0.4 },
    oficio,
    templado,
  );

  if (desenlace === 'gol') {
    const relato =
      intencion.remate === 'picarla'
        ? 'Lo esperaste, se tiró, y se la pasaste por encima. Gol de los que se repiten toda la semana.'
        : intencion.remate === 'potente'
          ? 'Cruzada al segundo palo, sin adornos. Gol.'
          : 'La abriste antes de que cerrara el ángulo. Adentro.';
    return {
      exito: true,
      desenlace,
      arquero,
      relato,
      tono: 'gol',
      efectos: intencion.remate === 'picarla' ? { ...GOL, confianza: 16, carinoDeLaHinchada: 14, reputacion: 5 } : GOL,
      suma: { goles: 1 },
    };
  }

  if (desenlace === 'atajada') {
    const relato =
      intencion.remate === 'picarla'
        ? 'Amagaste una vez de más y el arquero te ganó la pelota con el cuerpo.'
        : adivino
          ? 'Se tiró a ese palo antes que tú y la tapó con las piernas.'
          : 'Le pegaste al cuerpo del arquero, que ya venía achicando.';
    return {
      exito: false,
      desenlace,
      arquero,
      relato,
      tono: 'fallo',
      efectos: intencion.remate === 'picarla' ? { ...FALLO, confianza: -14, carinoDeLaHinchada: -10 } : FALLO,
    };
  }

  return {
    exito: false,
    desenlace,
    arquero,
    relato:
      desenlace === 'palo'
        ? 'Al palo, con el arquero vencido. De esas que se sueñan de noche.'
        : 'Te quedaste sin arco y la tiraste afuera. La tribuna hizo un ruido feo.',
    tono: 'fallo',
    efectos: { ...FALLO, confianza: -9 },
  };
}

/**
 * El tiro libre. Acá manda la geometría: hay que pasar la barrera y bajarla dentro del arco. Es el
 * momento donde el atributo pesa más, porque pegarle a una pelota quieta es pura técnica, y el único
 * donde la barrera puede rechazarla antes de que el arquero exista.
 */
export function resolverTiroLibre(
  azar: Azar,
  intencion: Intencion,
  atributos: Atributos,
  contexto: ContextoDeMomento,
): ResultadoDeMomento {
  const tecnica = (atributos.tiro * 0.55 + atributos.pase * 0.3 + atributos.regate * 0.15) / 100;
  const zona = ZONAS[intencion.zona];

  /* Raso y al medio es donde está la barrera. La pantalla la tapa, pero el motor no confía en eso. */
  if (!zona.alta && zona.lado === 0) {
    return {
      exito: false,
      desenlace: 'barrera',
      arquero: 0,
      relato: 'Le pegaste raso y al medio: la barrera la rechazó de cabeza.',
      tono: 'fallo',
      efectos: { confianza: -6, carinoDeLaHinchada: -2, forma: -2, estres: 5 },
    };
  }

  const { desenlace, arquero, adivino } = resolverRemate(
    azar,
    intencion,
    contexto,
    { fallo: 0.3, atajada: 0.42 },
    tecnica,
    0.7,
  );

  if (desenlace === 'gol') {
    return {
      exito: true,
      desenlace,
      arquero,
      relato: zona.alta
        ? 'Por encima de la barrera y a la cepa del palo. Golazo de tiro libre.'
        : 'Con comba, por el hueco de la barrera, y entró pegada al palo.',
      tono: 'gol',
      efectos: { ...GOL, confianza: 13, carinoDeLaHinchada: 12, reputacion: 4 },
      suma: { goles: 1 },
    };
  }

  if (desenlace === 'atajada') {
    return {
      exito: false,
      desenlace,
      arquero,
      relato: adivino
        ? 'El arquero salió con todo hacia ese palo y la manoteó al córner.'
        : 'Pasó la barrera pero le llegó cómoda al arquero, que la abrazó en el centro del arco.',
      tono: 'fallo',
      efectos: { confianza: -5, carinoDeLaHinchada: -2, forma: -2, estres: 5 },
    };
  }

  return {
    exito: false,
    desenlace,
    arquero,
    relato:
      desenlace === 'palo'
        ? 'Pegó en el palo y salió. El arquero ya estaba vencido.'
        : 'Se fue por encima del arco. En la tribuna la festejaron con ironía.',
    tono: 'fallo',
    efectos: { confianza: -7, carinoDeLaHinchada: -3, forma: -2, estres: 6 },
  };
}

/**
 * La atajada, para el arquero. No hay dónde apuntar: hay que **leer**. Adelantarte gana si aciertas el
 * palo y es un ridículo si no; esperar es el promedio seguro; volar cubre más arco pero llegas tarde.
 *
 * La zona que eliges es a dónde te tiras y el remate es cuándo. El rival patea a algún lado y no lo
 * sabes: por eso acá el desenlace se cuenta al revés, `atajada` es tu éxito y `gol` tu fracaso.
 */
export function resolverAtajada(
  azar: Azar,
  intencion: Intencion,
  atributos: Atributos,
  contexto: ContextoDeMomento,
): ResultadoDeMomento {
  const reflejos = atributos.ritmo / 100;
  const estirada = atributos.tiro / 100;
  const manos = atributos.regate / 100;
  const lectura = atributos.defensa / 100;
  const calidadDelTiro = limitar(0.55 + contexto.presion * 0.2, 0.5, 0.85);

  const tuLado = ZONAS[intencion.zona].lado;
  const alta = ZONAS[intencion.zona].alta;
  const remate = lecturaDelArquero(azar);
  const acerto = remate === tuLado;

  let probabilidad: number;
  if (intencion.remate === 'picarla') {
    /* Adelantarte: o la sacas o quedas en el piso mirando la red. */
    probabilidad = acerto ? 0.82 * (0.62 + estirada * 0.45) : 0.05;
  } else if (intencion.remate === 'potente') {
    probabilidad = (estirada * 0.55 + reflejos * 0.4) * (acerto ? 1.3 : 0.6) - calidadDelTiro * 0.16;
  } else {
    probabilidad = reflejos * 0.5 + manos * 0.32 + lectura * 0.22 - calidadDelTiro * 0.2;
    if (acerto) probabilidad += 0.14;
  }
  if (alta) probabilidad *= 0.88;

  const ataja = chance(azar, limitar(probabilidad, 0.04, 0.9));

  if (ataja) {
    const relato =
      intencion.remate === 'picarla'
        ? 'Te tiraste antes de que patee y adivinaste el palo. La saliste a buscar y la sacaste.'
        : intencion.remate === 'potente'
          ? 'Volaste y la sacaste con una mano al córner. La tribuna se levantó.'
          : 'Esperaste hasta el último momento y la atajaste con el cuerpo.';
    return {
      exito: true,
      desenlace: 'atajada',
      arquero: remate,
      relato,
      tono: 'atajada',
      efectos: {
        confianza: 14,
        carinoDeLaHinchada: 12,
        forma: 8,
        estres: -7,
        reputacion: intencion.remate === 'potente' ? 5 : 3,
      },
    };
  }

  const relato =
    intencion.remate === 'picarla'
      ? 'Te tiraste antes y la mandó al otro palo. Quedaste en el piso mirando la red.'
      : intencion.remate === 'potente'
        ? 'Volaste tarde y la pelota ya estaba adentro cuando estirabas el brazo.'
        : 'Esperaste y le pegó cruzado: no llegaste ni a moverte.';
  return {
    exito: false,
    desenlace: 'gol',
    arquero: remate,
    relato,
    tono: 'fallo',
    efectos: { confianza: -10, carinoDeLaHinchada: -4, forma: -5, estres: 9 },
  };
}

export function resolverMomento(
  azar: Azar,
  momento: ClaseDeMomento,
  intencion: Intencion,
  atributos: Atributos,
  contexto: ContextoDeMomento,
  confianza: number,
): ResultadoDeMomento {
  switch (momento) {
    case 'penal':
      return resolverPenal(azar, intencion, atributos, contexto, confianza);
    case 'mano-a-mano':
      return resolverManoAMano(azar, intencion, atributos, contexto, confianza);
    case 'tiro-libre':
      return resolverTiroLibre(azar, intencion, atributos, contexto);
    case 'atajada':
      return resolverAtajada(azar, intencion, atributos, contexto);
  }
}

/** Qué momento le toca a cada puesto. El arquero solo ataja; el resto patea lo que corresponde. */
export function momentoParaPuesto(azar: Azar, puesto: string): ClaseDeMomento {
  if (puesto === 'POR') return 'atajada';
  if (puesto === 'DC' || puesto === 'EXT') return chance(azar, 0.55) ? 'mano-a-mano' : 'penal';
  if (puesto === 'MO' || puesto === 'MC') return chance(azar, 0.55) ? 'tiro-libre' : 'penal';
  return chance(azar, 0.5) ? 'penal' : 'tiro-libre';
}
