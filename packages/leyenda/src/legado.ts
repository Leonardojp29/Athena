/**
 * El legado: lo que el juego dice de tu carrera cuando termina.
 *
 * Nada de esto está escrito de antemano. El prime se busca, el arquetipo se deduce, la mejor y la peor
 * decisión salen del balance real que dejó cada una. Si el veredicto estuviera cableado, la frase
 * final sería del juego; así, es de la carrera.
 */
import type { Carrera, Nivel, Recuerdo, Temporada, Trofeo } from './estado.js';
import { NOMBRE_DE_NIVEL } from './estado.js';

export interface Prime {
  desde: number;
  hasta: number;
  partidos: number;
  goles: number;
  asistencias: number;
  trofeos: number;
  notaMedia: number;
  ovrMaximo: number;
}

/**
 * El prime no es el año de mayor OVR: es la mejor **ventana** de la carrera. Se prueban ventanas de
 * tres a cinco temporadas y gana la que suma más fútbol —goles, asistencias, títulos, notas— porque
 * eso es lo que uno recuerda de un jugador, no su pico en una tabla.
 */
export function buscarPrime(temporadas: Temporada[]): Prime | null {
  if (temporadas.length === 0) return null;
  let mejor: { puntaje: number; desde: number; hasta: number } | null = null;

  /* Ventanas de dos y tres capítulos: con doce filas, cinco sería casi media carrera. */
  for (const largo of [3, 2]) {
    for (let i = 0; i + largo <= temporadas.length; i++) {
      const ventana = temporadas.slice(i, i + largo);
      const puntaje = ventana.reduce(
        (suma, t) =>
          suma +
          t.goles * 2 +
          t.asistencias * 1.5 +
          t.trofeos.length * 14 +
          (t.notaMedia - 6.4) * 25 +
          t.partidos * 0.2,
        0,
      );
      /* Ventanas largas ganan por acumulación: se normaliza por temporada para que compitan de igual a igual. */
      const porTemporada = puntaje / largo;
      if (!mejor || porTemporada > mejor.puntaje) {
        mejor = { puntaje: porTemporada, desde: i, hasta: i + largo - 1 };
      }
    }
  }
  /* Con menos de tres temporadas, el prime es la carrera entera. */
  const rango = mejor ?? { puntaje: 0, desde: 0, hasta: temporadas.length - 1 };
  const ventana = temporadas.slice(rango.desde, rango.hasta + 1);
  const partidos = ventana.reduce((s, t) => s + t.partidos, 0);

  return {
    desde: ventana[0]?.edad ?? 0,
    /* El último capítulo de la ventana cubre dos años: el prime llega hasta el final del bienio. */
    hasta: (ventana.at(-1)?.edad ?? 0) + 1,
    partidos,
    goles: ventana.reduce((s, t) => s + t.goles, 0),
    asistencias: ventana.reduce((s, t) => s + t.asistencias, 0),
    trofeos: ventana.reduce((s, t) => s + t.trofeos.length, 0),
    notaMedia:
      partidos === 0
        ? 0
        : Math.round((ventana.reduce((s, t) => s + t.notaMedia * t.partidos, 0) / partidos) * 10) / 10,
    ovrMaximo: Math.max(...ventana.map((t) => t.ovrFin)),
  };
}

export interface Arquetipo {
  id: string;
  titulo: string;
  descripcion: string;
}

/**
 * El ADN de la carrera. Se evalúa en orden: el primero que encaja manda, así los arquetipos raros no
 * quedan tapados por los genéricos. Cada uno pregunta por hechos, no por intenciones.
 */
export function calcularAdn(carrera: Carrera): Arquetipo {
  const t = carrera.temporadas;
  const clubes = new Set(t.map((x) => x.clubSlug));
  const trofeos = carrera.trofeos.length;
  const premios = carrera.trofeos.filter((x) => x.clase === 'individual').length;
  const goles = t.reduce((s, x) => s + x.goles, 0);
  const ovrMaximo = Math.max(carrera.ovr, ...t.map((x) => x.ovrFin), 0);
  const etiquetas = new Set(carrera.recuerdos.flatMap((r) => r.etiquetas));
  const volvioACasa =
    carrera.clubDeOrigen !== null &&
    t.length > 3 &&
    t.at(-1)?.clubSlug === carrera.clubDeOrigen.slug &&
    clubes.size > 1;

  if (clubes.size === 1 && t.length >= 8) {
    return {
      id: 'heroe-de-un-solo-club',
      titulo: 'El héroe de un solo club',
      descripcion:
        'Una vida, una camiseta. Pudiste irte cuando quisiste y no te fuiste nunca: en ese estadio tu nombre no se discute.',
    };
  }
  /* Volver es fácil; volver **después de haberla roto afuera** es la historia que vale contarse. */
  const continentes = new Set(t.map((x) => x.ligaSlug));
  if (volvioACasa && trofeos >= 4 && continentes.size >= 3) {
    return {
      id: 'el-que-volvio',
      titulo: 'El que volvió',
      descripcion:
        'Te fuiste, ganaste lejos de casa y volviste a terminar donde empezaste. La última vuelta olímpica fue en tu barrio.',
    };
  }
  if (ovrMaximo >= 90 && trofeos >= 8 && premios >= 1) {
    return {
      id: 'inmortal',
      titulo: 'El inmortal',
      descripcion:
        'Números que no se explican, vitrina que no cabe. De los que se nombran cuando se discute quién fue el mejor.',
    };
  }
  if (etiquetas.has('polemica:grande') && ovrMaximo >= 84) {
    return {
      id: 'superestrella-caotica',
      titulo: 'La superestrella caótica',
      descripcion:
        'Enorme adentro, incendio afuera. Te amaron y te odiaron a veces en la misma semana, y nunca fue aburrido.',
    };
  }
  if (carrera.futbolista.potencial - ovrMaximo >= 12) {
    return {
      id: 'genio-desperdiciado',
      titulo: 'El genio desperdiciado',
      descripcion:
        'Tenías todo. Los que te vieron entrenar todavía cuentan lo que podías hacer con una pelota, y la vitrina no los acompaña.',
    };
  }
  if (clubes.size >= 5) {
    return {
      id: 'mercenario',
      titulo: 'El mercenario',
      descripcion:
        'Seis camisetas o más, ninguna tatuada. Fuiste donde te valoraron y no te disculpaste nunca por eso.',
    };
  }
  if (etiquetas.has('leyenda:hinchada') || (trofeos <= 2 && (carrera.vida.carinoDeLaHinchada ?? 0) >= 80)) {
    return {
      id: 'idolo-de-culto',
      titulo: 'El ídolo de culto',
      descripcion:
        'No ganaste todo, pero en tu tribuna todavía se canta tu nombre. Hay estatuas menos vivas que eso.',
    };
  }
  if (goles >= 200) {
    return {
      id: 'goleador-eterno',
      titulo: 'El goleador eterno',
      descripcion: 'Doscientos gritos o más. Cada arquero de tu generación te tiene en la memoria.',
    };
  }
  if (t.length >= 10 && carrera.futbolista.personalidad.profesionalismo >= 65) {
    return {
      id: 'profesional',
      titulo: 'El profesional',
      descripcion:
        'Quince temporadas sin un escándalo, sin una excusa y casi sin faltar. La carrera más difícil de todas.',
    };
  }
  if (etiquetas.has('lesion:apurada') && t.length >= 6) {
    return {
      id: 'resucitado',
      titulo: 'El resucitado',
      descripcion:
        'Te dieron por terminado y volviste. Lo que hiciste después de la lesión vale doble, y lo sabes.',
    };
  }
  if (volvioACasa) {
    return {
      id: 'nunca-se-fue-del-todo',
      titulo: 'Nunca se fue del todo',
      descripcion:
        'Diste la vuelta al mundo y terminaste en la camiseta de siempre. No ganaste todo, pero volviste, y en tu barrio eso pesa más.',
    };
  }
  return {
    id: 'jugador-de-oficio',
    titulo: 'El jugador de oficio',
    descripcion:
      'Sin escándalos ni portadas: una carrera hecha de domingos, kilómetros y respeto de vestuario.',
  };
}

/**
 * La otra mitad de la carrera.
 *
 * Un futbolista no es solo los goles: es la fama que juntó, la reputación que le quedó, las veces que
 * fue portada y las que salió a explicar algo. Todo eso el motor ya lo movía —los escándalos y las
 * fiestas cambian el rol del bienio siguiente— pero no se veía en ninguna parte, y una vida que no se
 * mide es una vida que el jugador no sabe que tuvo.
 */
export interface FueraDeLaCancha {
  fama: number;
  reputacion: number;
  /** Cuánto te persigue la cámara, 0-100. */
  exposicion: number;
  /** Lo que la tribuna siente por ti, 0-100. */
  hinchada: number;
  portadas: number;
  escandalos: number;
  romances: number;
  /** El titular más fuerte que te dedicaron, con su tono. */
  portadaMasFuerte: { texto: string; tono: string } | null;
  /** Una línea que resume cómo te recuerdan fuera de la cancha. */
  veredicto: string;
}

export function fueraDeLaCancha(carrera: Carrera): FueraDeLaCancha {
  const { vida, titulares, recuerdos } = carrera;
  const escandalos = recuerdos.filter((r) => ['polemica', 'caos', 'conflicto'].includes(r.tipo)).length;
  const romances = recuerdos.filter((r) => r.tipo === 'romance').length;
  const polemicas = titulares.filter((t) => t.tono === 'polemica');
  const elogios = titulares.filter((t) => t.tono === 'elogio');

  /* El titular que más pesa: primero la polémica más reciente, y si no hubo, el mejor elogio. */
  const portadaMasFuerte = polemicas.at(-1) ?? elogios.at(-1) ?? titulares.at(-1) ?? null;

  return {
    fama: Math.round(vida.fama),
    reputacion: Math.round(vida.reputacion),
    exposicion: Math.round(vida.exposicion),
    hinchada: Math.round(vida.carinoDeLaHinchada),
    portadas: titulares.length,
    escandalos,
    romances,
    portadaMasFuerte: portadaMasFuerte ? { texto: portadaMasFuerte.texto, tono: portadaMasFuerte.tono } : null,
    veredicto: veredictoDeLaVida({ ...vida, escandalos, polemicas: polemicas.length, elogios: elogios.length }),
  };
}

function veredictoDeLaVida(datos: {
  fama: number;
  reputacion: number;
  carinoDeLaHinchada: number;
  escandalos: number;
  polemicas: number;
  elogios: number;
}): string {
  /*
   * El orden importa: primero lo que más define, después lo que matiza. Un jugador con cuatro
   * escándalos y la fama por las nubes no es "el que hizo poco ruido" por mucho que la tribuna lo
   * quiera, y ese era justo el veredicto que salía antes.
   */
  if (datos.escandalos >= 4 && datos.fama >= 60) {
    return 'Vendiste más diarios fuera de la cancha que dentro. Nadie se aburrió contigo.';
  }
  if (datos.escandalos >= 3 && datos.reputacion < 45) {
    return 'Te acuerdas de las portadas mejor que de los goles, y no porque fueran buenas.';
  }
  if (datos.polemicas > datos.elogios && datos.polemicas >= 3) {
    return 'La prensa te tuvo de tapa por lo que decías, no por lo que hacías.';
  }
  if (datos.reputacion >= 70 && datos.escandalos <= 1) {
    return 'Ni una portada incómoda en toda tu carrera. En este oficio eso es casi un título.';
  }
  if (datos.carinoDeLaHinchada >= 75 && datos.escandalos <= 2) {
    return 'Afuera hiciste poco ruido y adentro te quisieron igual: en la tribuna todavía te cantan.';
  }
  if (datos.fama <= 35) {
    return 'Jugaste al fútbol y te fuiste a tu casa. Hay carreras enteras de las que nadie escribió nada.';
  }
  return 'Ni santo ni escándalo: una vida de futbolista con sus portadas justas.';
}

export interface Veredicto {
  prime: Prime | null;
  adn: Arquetipo;
  mejorDecision: Recuerdo | null;
  peorDecision: Recuerdo | null;
  momentoDecisivo: Recuerdo | Trofeo | null;
  totales: {
    temporadas: number;
    partidos: number;
    goles: number;
    asistencias: number;
    trofeos: number;
    premios: number;
    clubes: number;
    ovrMaximo: number;
    valorMaximo: number;
    seleccion: { convocatorias: number; goles: number };
  };
  /** El nivel más alto al que llegó la carta: la etiqueta de la carrera. */
  nivelMaximo: Nivel;
  /** Una línea para compartir. */
  frase: string;
}

/** La mejor y la peor decisión salen del balance que cada una dejó, no de una lista. */
function extremos(recuerdos: Recuerdo[]): { mejor: Recuerdo | null; peor: Recuerdo | null } {
  const conBalance = recuerdos.filter((r) => typeof r.balance === 'number' && r.tipo === 'decision');
  if (conBalance.length === 0) return { mejor: null, peor: null };
  const ordenados = [...conBalance].sort((a, b) => (b.balance ?? 0) - (a.balance ?? 0));
  const mejor = ordenados[0] ?? null;
  const peor = ordenados.at(-1) ?? null;
  return { mejor, peor: peor && peor !== mejor ? peor : null };
}

export function calcularVeredicto(carrera: Carrera): Veredicto {
  const t = carrera.temporadas;
  const partidos = t.reduce((s, x) => s + x.partidos, 0);
  const goles = t.reduce((s, x) => s + x.goles, 0);
  const asistencias = t.reduce((s, x) => s + x.asistencias, 0);
  const premios = carrera.trofeos.filter((x) => x.clase === 'individual').length;
  const adn = calcularAdn(carrera);
  const { mejor, peor } = extremos(carrera.recuerdos);
  const nivelMaximo = t.reduce<Nivel>(
    (alto, x) => (nivelIndice(x.nivel) > nivelIndice(alto) ? x.nivel : alto),
    carrera.nivel,
  );

  /* El momento decisivo: el trofeo más importante, y si no ganó nada, el recuerdo de mayor balance. */
  const trofeoMayor = [...carrera.trofeos].sort(
    (a, b) => jerarquia(b.clase) - jerarquia(a.clase) || b.temporada - a.temporada,
  )[0];

  return {
    prime: buscarPrime(t),
    adn,
    mejorDecision: mejor,
    peorDecision: peor,
    momentoDecisivo: trofeoMayor ?? mejor ?? null,
    totales: {
      temporadas: t.length,
      partidos,
      goles,
      asistencias,
      trofeos: carrera.trofeos.filter((x) => x.clase !== 'individual').length,
      premios,
      clubes: new Set(t.map((x) => x.clubSlug)).size,
      ovrMaximo: Math.max(carrera.ovr, ...t.map((x) => x.ovrFin), 0),
      valorMaximo: Math.max(carrera.valor, ...t.map((x) => x.valor), 0),
      seleccion: {
        convocatorias: t.reduce((s, x) => s + x.seleccion.convocatorias, 0),
        goles: t.reduce((s, x) => s + x.seleccion.goles, 0),
      },
    },
    nivelMaximo,
    frase: frasePara(adn, carrera, { goles, trofeos: carrera.trofeos.length, nivelMaximo }),
  };
}

const nivelIndice = (nivel: Nivel): number =>
  ['cantera', 'promesa', 'profesional', 'elite', 'clase-mundial', 'icono', 'inmortal'].indexOf(nivel);

const jerarquia = (clase: Trofeo['clase']): number =>
  ({ seleccion: 5, continental: 4, liga: 3, copa: 2, individual: 1 })[clase] ?? 0;

function frasePara(
  adn: Arquetipo,
  carrera: Carrera,
  datos: { goles: number; trofeos: number; nivelMaximo: Nivel },
): string {
  const nombre = carrera.futbolista.nombre.split(' ').at(-1) ?? carrera.futbolista.nombre;
  const anios = carrera.temporadas.length;
  return `${nombre}: ${anios} temporadas, ${datos.goles} goles, ${datos.trofeos} títulos. ${NOMBRE_DE_NIVEL[datos.nivelMaximo]}. ${adn.titulo}.`;
}
