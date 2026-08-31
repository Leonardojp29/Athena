/**
 * El nacimiento de una carrera.
 *
 * El jugador llena poco a propósito: nombre, dorsal, puesto, pie, país y liga. Todo lo demás —los
 * atributos, el techo, el carácter— lo reparte el juego, porque un futbolista de 16 años tampoco
 * elige con qué nació. El techo queda oculto: no hay número de potencial en pantalla, se descubre
 * jugando, que es de donde sale la tensión de las primeras temporadas.
 */
import { campana, chance, crearAzar, entre, limitar, type Azar } from './azar.js';
import {
  EDAD_INICIAL,
  type Atributos,
  type Carrera,
  type Futbolista,
  type Personalidad,
  type Pie,
  type Puesto,
  type Vida,
  type Vinculo,
  VINCULOS,
} from './estado.js';
import { calcularOvr, nivelDe, valorDeMercado } from './ovr.js';

export interface DatosDeCreacion {
  nombre: string;
  dorsal: number;
  puesto: Puesto;
  pie: Pie;
  pais: string;
  paisCodigo: string | null;
  bandera: string | null;
  ligaSlug: string;
  semilla: number;
  /** El año en que arranca la carrera; lo pone la interfaz con el año real. */
  anio: number;
}

/**
 * La escuela futbolística: cuánto arranca por delante un juvenil según de dónde salió.
 *
 * Es la lógica que usan los juegos del género y es honesta con el fútbol real: un pibe de la cantera
 * del Madrid, del Ajax o de Flamengo llega a primera con más oficio, mejor alimentación y diez años
 * de competencia mejor que uno de una liga chica. No es una jerarquía de personas: es el nivel de la
 * industria que lo formó, y en el juego se traduce en dónde arranca la aguja.
 *
 * Un peruano empieza cerca de 62 y un brasileño cerca de 72; el techo de los dos es 99, pero el
 * camino del primero es más largo, y esa es justamente la historia que vale la pena jugar.
 */
const ESCUELA: Record<string, number> = {
  /* Las cinco grandes y las canteras que exportan al mundo. */
  ES: 12, GB: 12, 'GB-ENG': 12, BR: 12, DE: 11, FR: 11, IT: 10, AR: 10, NL: 10, PT: 10,
  /* Segunda línea europea y sudamericana: buenas canteras, menos escaparate. */
  BE: 8, HR: 8, RS: 8, UY: 8, CO: 7, MX: 7, DK: 7, AT: 7, CH: 7, SE: 6, NO: 6, PL: 6,
  /* Ligas en desarrollo. */
  CL: 5, PY: 5, EC: 4, US: 5, JP: 5, KR: 5, MA: 5, SN: 5, CI: 5, NG: 5, EG: 4,
  PE: 3, BO: 2, VE: 3, CA: 3, SA: 3,
};

const ESCUELA_POR_OMISION = 4;

/** Cuánto arranca por delante un juvenil de este país. */
const escuelaDe = (paisCodigo: string | null): number =>
  paisCodigo ? (ESCUELA[paisCodigo] ?? ESCUELA_POR_OMISION) : ESCUELA_POR_OMISION;

/*
 * Reparto inicial por puesto: cada uno arranca fuerte en lo suyo y flojo en lo ajeno. Son medias
 * sobre las que después tira la campana, así dos delanteros nunca son iguales.
 *
 * Los números son de un chico de dieciséis que ya entrena con el plantel: da una media cerca de 58
 * antes de sumar la escuela de su país.
 */
const BASE: Record<Puesto, Atributos> = {
  POR: { ritmo: 60, tiro: 58, pase: 46, regate: 55, defensa: 57, fisico: 58 },
  DFC: { ritmo: 50, tiro: 30, pase: 47, regate: 38, defensa: 62, fisico: 62 },
  LAT: { ritmo: 62, tiro: 36, pase: 52, regate: 50, defensa: 56, fisico: 54 },
  MC: { ritmo: 52, tiro: 45, pase: 62, regate: 54, defensa: 54, fisico: 52 },
  MO: { ritmo: 56, tiro: 55, pase: 61, regate: 62, defensa: 34, fisico: 46 },
  EXT: { ritmo: 66, tiro: 52, pase: 50, regate: 64, defensa: 30, fisico: 45 },
  DC: { ritmo: 58, tiro: 64, pase: 42, regate: 54, defensa: 28, fisico: 56 },
};

function repartirAtributos(azar: Azar, puesto: Puesto, escuela: number): Atributos {
  const base = BASE[puesto];
  const salida = {} as Atributos;
  for (const clave of Object.keys(base) as Array<keyof Atributos>) {
    salida[clave] = Math.round(limitar(campana(azar, base[clave] + escuela, 9), 20, 86));
  }
  return salida;
}

/**
 * El carácter. Se reparte plano, sin sesgos por puesto ni por país: la idea del juego es que la
 * personalidad no sea una consecuencia de nada, sino una carta que te toca y con la que jugás.
 */
function repartirPersonalidad(azar: Azar): Personalidad {
  const rasgo = () => Math.round(limitar(campana(azar, 50, 28), 5, 95));
  return {
    ambicion: rasgo(),
    disciplina: rasgo(),
    ego: rasgo(),
    carisma: rasgo(),
    lealtad: rasgo(),
    temperamento: rasgo(),
    riesgo: rasgo(),
    profesionalismo: rasgo(),
    vidaSocial: rasgo(),
    sensibilidadMediatica: rasgo(),
  };
}

/**
 * El techo.
 *
 * Casi siempre queda entre 12 y 24 puntos sobre el arranque, pero una de cada diez veces se dispara:
 * es el pibe que nadie vio venir, el que sale de una liga chica y termina en Europa. Que eso exista
 * de verdad —y no como un guiño— es lo que hace que valga la pena empezar otra carrera.
 *
 * El 99 es alcanzable y casi imposible: hace falta el techo más alto del sorteo, doce capítulos de
 * minutos y una carrera de títulos. Tiene que ser así: si el máximo se toca seguido, deja de valer.
 */
function repartirPotencial(azar: Azar, ovrInicial: number): number {
  const salto = chance(azar, 1 / 10) ? entre(azar, 26, 38) : entre(azar, 12, 24);
  return Math.round(limitar(ovrInicial + salto, ovrInicial + 6, 99));
}

const VIDA_INICIAL: Vida = {
  dinero: 0.05,
  fama: 6,
  reputacion: 50,
  exposicion: 8,
  confianza: 55,
  estres: 15,
  felicidad: 72,
  carinoDeLaHinchada: 50,
  forma: 62,
  condicion: 92,
};

export function crearCarrera(datos: DatosDeCreacion): Carrera {
  const azar = crearAzar(datos.semilla);
  const atributos = repartirAtributos(azar, datos.puesto, escuelaDe(datos.paisCodigo));
  const ovr = calcularOvr(atributos, datos.puesto);
  const potencial = repartirPotencial(azar, ovr);
  /* Todos debutan a los 16: la línea de la carrera es una escalera fija de doce peldaños. */
  const edad = EDAD_INICIAL;

  const futbolista: Futbolista = {
    nombre: datos.nombre.trim(),
    dorsal: datos.dorsal,
    puesto: datos.puesto,
    pie: datos.pie,
    pais: datos.pais,
    paisCodigo: datos.paisCodigo,
    bandera: datos.bandera,
    edad,
    atributos,
    potencial,
    personalidad: repartirPersonalidad(azar),
  };

  const relaciones = {} as Record<Vinculo, { confianza: number; respeto: number; rencor: number }>;
  for (const vinculo of VINCULOS) {
    relaciones[vinculo] = { confianza: 50, respeto: 45, rencor: 0 };
  }
  /* Nadie empieza con pareja: si aparece, aparece jugando. */
  relaciones.pareja = { confianza: 0, respeto: 0, rencor: 0 };

  return {
    version: 1,
    semilla: datos.semilla,
    azar: azar.estado(),
    ligaDeOrigen: datos.ligaSlug,
    etapa: 'mercado',
    capitulo: 0,
    futbolista,
    vida: { ...VIDA_INICIAL },
    relaciones,
    clubActual: null,
    clubDeOrigen: null,
    contrato: null,
    rol: 'promesa',
    anio: datos.anio,
    temporadas: [],
    trofeos: [],
    recuerdos: [],
    titulares: [],
    vistos: {},
    ofertas: [],
    pendiente: null,
    retiro: null,
    clubes: [],
    ovr,
    nivel: nivelDe(ovr, { trofeos: 0, premios: 0 }),
    valor: valorDeMercado(ovr, edad, potencial),
  };
}

/**
 * La curva de la edad, en puntos de OVR **por bienio**.
 *
 * Hasta los 21 se crece rápido si hay minutos; entre 25 y 29 se afina; a los 31 empieza la bajada y
 * a los 34 es franca. Los minutos mandan más que la edad: un pibe en el banco no crece, y eso hace
 * que "aceptar el club grande para ser suplente" sea una decisión con costo real, no una obviedad.
 *
 * Los valores base son por dos años, que es la unidad del juego. Ese salto —de 50 a 59 en un
 * capítulo— es lo que hace que el progreso se **sienta**: subir de a dos puntos por temporada era
 * invisible en pantalla.
 */
export function crecimiento(
  azar: Azar,
  params: {
    edad: number;
    ovr: number;
    potencial: number;
    minutos: number;
    profesionalismo: number;
    lesiones: number;
  },
): number {
  const { edad, ovr, potencial, minutos, profesionalismo, lesiones } = params;
  const margen = potencial - ovr;
  const porMinutos = limitar(minutos / 2200, 0.15, 1.15);
  const porOficio = 0.75 + (profesionalismo / 100) * 0.5;

  let base: number;
  if (edad <= 19) base = 8.5;
  else if (edad <= 23) base = 6;
  else if (edad <= 27) base = 3.2;
  else if (edad <= 29) base = 1.2;
  else if (edad <= 31) base = -1.5;
  else if (edad <= 33) base = -4;
  else base = -6.5;

  if (base > 0) {
    /* Cerca del techo, cada punto cuesta el doble. */
    const acercamiento = limitar(margen / 14, 0, 1);
    const bruto = base * porMinutos * porOficio * acercamiento + campana(azar, 0, 1.2);
    return limitar(bruto, -2, margen);
  }

  /* La bajada se amortigua con oficio y se acelera con lesiones. */
  const castigo = 1 - (profesionalismo / 100) * 0.4 + lesiones * 0.12;
  return base * castigo + campana(azar, 0, 0.9);
}
