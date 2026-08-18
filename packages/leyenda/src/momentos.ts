/**
 * Los momentos jugables.
 *
 * Son pocos a propósito. Si cada partido fuera jugable, ninguno sería importante: el juego cuenta una
 * carrera, no noventa minutos. Estos cuatro aparecen cuando algo está en juego —un penal en el 89, un
 * mano a mano en una final— y por eso se recuerdan.
 *
 * La resolución vive acá, en el motor, y no en la interfaz. La interfaz manda **lo que hizo el
 * jugador** (dónde apuntó, cuánta potencia, con qué timing) y el motor decide con los atributos, la
 * presión y el azar semillado. Así el resultado es reproducible, testeable e imposible de falsear
 * desde el navegador.
 */
import { chance, limitar, type Azar } from './azar.js';
import type { Atributos, ClaseDeMomento, ContextoDeMomento } from './estado.js';

/** Lo que la interfaz manda: la intención del jugador, normalizada. */
export interface Intencion {
  /** -1 (izquierda) a 1 (derecha). */
  direccion: number;
  /** 0 (raso) a 1 (arriba). */
  altura: number;
  /** 0 a 1. Más potencia, menos precisión. */
  potencia: number;
  /** Qué tan al centro de la ventana cayó: 1 es perfecto, 0 es tarde o temprano. */
  timing: number;
  /** Para los momentos de opción: qué eligió. */
  eleccion?: string;
}

export interface ResultadoDeMomento {
  exito: boolean;
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

/**
 * La dificultad del arquero rival crece con la escena. Un penal en una final ante ochenta mil personas
 * no es el mismo penal que en un amistoso, y el juego tiene que hacerlo sentir.
 */
const dificultadDe = (contexto: ContextoDeMomento): number => limitar(0.35 + contexto.presion * 0.3, 0.3, 0.75);

/**
 * El penal.
 *
 * Tres cosas importan y en este orden: el timing (si le pegás mal, no hay dirección que te salve), la
 * potencia bien elegida —muy suave la ataja, muy fuerte se va afuera— y esquinar. Los atributos
 * corren el margen de error, no deciden el resultado: un crack falla penales y un defensor los mete.
 */
export function resolverPenal(
  azar: Azar,
  intencion: Intencion,
  atributos: Atributos,
  contexto: ContextoDeMomento,
  confianza: number,
): ResultadoDeMomento {
  const { direccion, altura, potencia, timing } = intencion;
  const oficio = (atributos.tiro * 0.6 + atributos.regate * 0.2 + atributos.pase * 0.2) / 100;
  const templado = limitar(confianza / 100, 0.3, 1);

  /* Pegarle mal es la forma más común de fallar un penal. */
  const golpe = timing * 0.7 + oficio * 0.3;
  if (golpe < 0.32 || (golpe < 0.45 && chance(azar, 0.5))) {
    return {
      exito: false,
      relato: 'Le pegaste mal, sin comba ni fuerza. El arquero la tomó sin moverse.',
      tono: 'fallo',
      efectos: { confianza: -12, carinoDeLaHinchada: -6, forma: -5, estres: 10 },
    };
  }

  /* Mucha potencia con mal timing manda la pelota a la tribuna. */
  const controlNecesario = potencia * 0.9;
  const control = timing * 0.6 + oficio * 0.4 + templado * 0.1;
  if (control < controlNecesario - 0.12) {
    return {
      exito: false,
      relato: potencia > 0.85 ? 'La reventaste por encima del travesaño.' : 'Se te fue apenas al lado del palo.',
      tono: 'fallo',
      efectos: { confianza: -10, carinoDeLaHinchada: -5, forma: -4, estres: 9 },
    };
  }

  /*
   * Esquinar paga: cerca del palo y arriba, el arquero no llega. Al medio es una lotería contra un
   * arquero que se queda parado.
   */
  const esquina = Math.abs(direccion) * 0.6 + altura * 0.4;
  const alcanceDelArquero = dificultadDe(contexto) * (1 - esquina * 0.75);
  const atajada = chance(azar, limitar(alcanceDelArquero, 0.03, 0.6));

  if (atajada) {
    return {
      exito: false,
      relato:
        esquina < 0.3
          ? 'Fue al medio y el arquero no se movió: la tomó con las dos manos.'
          : 'Adivinó el palo y la sacó con la punta de los dedos.',
      tono: 'fallo',
      efectos: { confianza: -11, carinoDeLaHinchada: -5, forma: -5, estres: 10 },
    };
  }

  return {
    exito: true,
    relato:
      esquina > 0.72
        ? 'La clavaste contra el palo. El arquero ni la vio pasar.'
        : 'Cruzada, firme, imposible. Adentro.',
    tono: 'gol',
    efectos: { confianza: 12, carinoDeLaHinchada: 10, forma: 7, estres: -6, reputacion: 3 },
    suma: { goles: 1 },
  };
}

/**
 * El mano a mano. Tres caminos con perfiles distintos: definir cruzado es lo seguro, picarla es lo
 * bello y arriesgado, encarar depende del regate. No hay una opción óptima; hay una que le queda a tu
 * jugador.
 */
export function resolverManoAMano(
  azar: Azar,
  intencion: Intencion,
  atributos: Atributos,
  contexto: ContextoDeMomento,
  confianza: number,
): ResultadoDeMomento {
  const dificultad = dificultadDe(contexto);
  const templado = limitar(confianza / 100, 0.3, 1);
  /* Dudar cuesta: la ventana de decisión corre y el arquero se te viene encima. */
  const apuro = limitar(intencion.timing, 0, 1);

  const eleccion = intencion.eleccion ?? 'cruzado';
  let probabilidad: number;
  let relatoExito: string;
  let relatoFallo: string;

  if (eleccion === 'picarla') {
    probabilidad = (atributos.regate * 0.5 + atributos.tiro * 0.3) / 100 - dificultad * 0.45;
    relatoExito = 'Se la picaste por encima. El estadio hizo un ruido que no se olvida.';
    relatoFallo = 'Quisiste picarla y el arquero la manoteó sin moverse del lugar. Silencio.';
  } else if (eleccion === 'encarar') {
    probabilidad = (atributos.regate * 0.65 + atributos.ritmo * 0.2) / 100 - dificultad * 0.35;
    relatoExito = 'Lo esperaste, se lo tiraste al costado y la empujaste al arco vacío.';
    relatoFallo = 'Amagaste una vez de más y el arquero te ganó la pelota con el cuerpo.';
  } else {
    probabilidad = (atributos.tiro * 0.6 + atributos.pase * 0.15) / 100 - dificultad * 0.3;
    relatoExito = 'Cruzada al segundo palo, sin adornos. Gol.';
    relatoFallo = 'Le pegaste al cuerpo del arquero, que ya venía cerrando el ángulo.';
  }

  probabilidad = limitar(probabilidad * (0.75 + apuro * 0.35) * (0.85 + templado * 0.25), 0.05, 0.94);

  if (chance(azar, probabilidad)) {
    return {
      exito: true,
      relato: relatoExito,
      tono: 'gol',
      efectos: {
        confianza: eleccion === 'picarla' ? 16 : 11,
        carinoDeLaHinchada: eleccion === 'picarla' ? 14 : 9,
        forma: 7,
        estres: -5,
        reputacion: eleccion === 'picarla' ? 5 : 2,
      },
      suma: { goles: 1 },
    };
  }

  return {
    exito: false,
    relato: relatoFallo,
    tono: 'fallo',
    efectos: {
      confianza: eleccion === 'picarla' ? -14 : -9,
      carinoDeLaHinchada: eleccion === 'picarla' ? -10 : -5,
      forma: -4,
      estres: 8,
    },
  };
}

/**
 * El tiro libre. Acá manda la geometría: hay que pasar la barrera y bajarla dentro del arco, y el
 * margen es angosto. Es el momento donde el atributo pesa más, porque pegarle a una pelota quieta es
 * pura técnica.
 */
export function resolverTiroLibre(
  azar: Azar,
  intencion: Intencion,
  atributos: Atributos,
  contexto: ContextoDeMomento,
): ResultadoDeMomento {
  const { direccion, altura, potencia, timing } = intencion;
  const tecnica = (atributos.tiro * 0.55 + atributos.pase * 0.3 + atributos.regate * 0.15) / 100;

  /* Por debajo de la barrera no pasa. */
  if (altura < 0.28) {
    return {
      exito: false,
      relato: 'Le pegaste raso y la barrera la rechazó de cabeza.',
      tono: 'fallo',
      efectos: { confianza: -6, carinoDeLaHinchada: -2, forma: -2, estres: 5 },
    };
  }
  /* Y muy arriba con mucha fuerza se va a la tribuna. */
  if (altura > 0.82 && potencia > 0.7) {
    return {
      exito: false,
      relato: 'Se fue a la tercera bandeja. En la tribuna la festejaron igual, con ironía.',
      tono: 'fallo',
      efectos: { confianza: -7, carinoDeLaHinchada: -3, forma: -2, estres: 6 },
    };
  }

  const ventanaIdeal = 1 - Math.abs(altura - 0.52) * 1.8;
  const puntería = limitar(ventanaIdeal * 0.45 + timing * 0.3 + tecnica * 0.45 - potencia * 0.15, 0, 1);
  const angulo = Math.abs(direccion) * 0.5;
  const probabilidad = limitar(puntería * 0.7 + angulo * 0.15 - dificultadDe(contexto) * 0.3, 0.03, 0.55);

  if (chance(azar, probabilidad)) {
    return {
      exito: true,
      relato:
        angulo > 0.35
          ? 'Por arriba de la barrera y a la cepa del palo. Golazo de tiro libre.'
          : 'Con comba, buscando el ángulo, y entró pegada al travesaño.',
      tono: 'gol',
      efectos: { confianza: 13, carinoDeLaHinchada: 12, forma: 7, estres: -6, reputacion: 4 },
      suma: { goles: 1 },
    };
  }

  const cerca = probabilidad > 0.3;
  return {
    exito: false,
    relato: cerca
      ? 'Pasó la barrera y se fue lamiendo el palo. El arquero ya estaba vencido.'
      : 'El arquero la esperó cómodo en el centro del arco.',
    tono: 'fallo',
    efectos: { confianza: cerca ? -4 : -7, carinoDeLaHinchada: -2, forma: -2, estres: 5 },
  };
}

/**
 * La atajada, para el arquero. No hay dónde apuntar: hay que **leer**. Anticipar gana si acertás el
 * palo y pierde si no; esperar es el promedio seguro; volar cubre más arco pero exige timing perfecto.
 */
export function resolverAtajada(
  azar: Azar,
  intencion: Intencion,
  atributos: Atributos,
  contexto: ContextoDeMomento,
): ResultadoDeMomento {
  const eleccion = intencion.eleccion ?? 'esperar';
  /* En el arquero, los casilleros se leen distinto: tiro=estirada, regate=manos, ritmo=reflejos. */
  const reflejos = atributos.ritmo / 100;
  const estirada = atributos.tiro / 100;
  const manos = atributos.regate / 100;
  const lectura = atributos.defensa / 100;

  /* El rival pega bien: el punto de partida es en contra, como en la vida. */
  const calidadDelTiro = limitar(0.55 + contexto.presion * 0.2, 0.5, 0.85);

  let probabilidad: number;
  let relatoExito: string;
  let relatoFallo: string;

  if (eleccion === 'anticipar') {
    /* Adivinar el palo antes de que patee: si acertás, la sacás casi siempre. */
    const acerto = chance(azar, 0.45 + lectura * 0.3);
    probabilidad = acerto ? 0.8 * (0.6 + estirada * 0.5) : 0.06;
    relatoExito = 'Te tiraste antes de que patee y adivinaste el palo. La saliste a buscar y la sacaste.';
    relatoFallo = 'Te tiraste antes y la mandó al otro palo. Quedaste en el piso mirando la red.';
  } else if (eleccion === 'volar') {
    probabilidad = (estirada * 0.5 + reflejos * 0.35) * intencion.timing * 1.15 - calidadDelTiro * 0.35;
    relatoExito = 'Volaste y la sacaste con una mano al córner. La tribuna se levantó.';
    relatoFallo = 'Volaste tarde y la pelota ya estaba adentro cuando estirabas el brazo.';
  } else {
    probabilidad = (reflejos * 0.45 + manos * 0.3 + lectura * 0.2) - calidadDelTiro * 0.3;
    relatoExito = 'Esperaste hasta el último momento y la atajaste con el cuerpo.';
    relatoFallo = 'Esperaste y le pegó cruzado: no llegaste ni a moverte.';
  }

  probabilidad = limitar(probabilidad, 0.04, 0.9);

  if (chance(azar, probabilidad)) {
    return {
      exito: true,
      relato: relatoExito,
      tono: 'atajada',
      efectos: {
        confianza: 14,
        carinoDeLaHinchada: 12,
        forma: 8,
        estres: -7,
        reputacion: eleccion === 'volar' ? 5 : 3,
      },
    };
  }

  return {
    exito: false,
    relato: relatoFallo,
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
