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
  TRAMOS_POR_RITMO,
  type Atributos,
  type Carrera,
  type Futbolista,
  type Personalidad,
  type Pie,
  type Puesto,
  type Ritmo,
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
  ritmo: Ritmo;
  semilla: number;
  /** El año en que arranca la carrera; lo pone la interfaz con el año real. */
  anio: number;
}

/*
 * Reparto inicial por puesto: cada uno arranca fuerte en lo suyo y flojo en lo ajeno. Son medias
 * sobre las que después tira la campana, así dos delanteros nunca son iguales.
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

function repartirAtributos(azar: Azar, puesto: Puesto): Atributos {
  const base = BASE[puesto];
  const salida = {} as Atributos;
  for (const clave of Object.keys(base) as Array<keyof Atributos>) {
    salida[clave] = Math.round(limitar(campana(azar, base[clave], 9), 20, 82));
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
 * El techo. Casi siempre queda entre 8 y 20 puntos sobre el arranque, pero una de cada doce veces se
 * dispara: es el pibe que nadie vio venir, y que exista de verdad es lo que hace que valga la pena
 * empezar otra carrera.
 */
function repartirPotencial(azar: Azar, ovrInicial: number): number {
  const salto = chance(azar, 1 / 12) ? entre(azar, 24, 34) : entre(azar, 8, 20);
  return Math.round(limitar(ovrInicial + salto, ovrInicial + 4, 95));
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
  const atributos = repartirAtributos(azar, datos.puesto);
  const ovr = calcularOvr(atributos, datos.puesto);
  const potencial = repartirPotencial(azar, ovr);
  const edad = entre(azar, 16, 18);

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
    ritmo: datos.ritmo,
    ligaDeOrigen: datos.ligaSlug,
    etapa: 'debut',
    futbolista,
    vida: { ...VIDA_INICIAL },
    relaciones,
    clubActual: null,
    clubDeOrigen: null,
    contrato: null,
    rol: 'promesa',
    anio: datos.anio,
    tramo: 0,
    enCurso: null,
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

export const tramosDe = (ritmo: Ritmo): number => TRAMOS_POR_RITMO[ritmo];

/**
 * La curva de la edad, en puntos de OVR por temporada.
 *
 * Hasta los 21 se crece rápido si hay minutos; entre 25 y 29 se afina; a los 31 empieza la bajada y
 * a los 34 es franca. Los minutos mandan más que la edad: un pibe en el banco no crece, y eso hace
 * que "aceptar el club grande para ser suplente" sea una decisión con costo real, no una obviedad.
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
  if (edad <= 21) base = 3.4;
  else if (edad <= 24) base = 2.4;
  else if (edad <= 28) base = 1.2;
  else if (edad <= 30) base = 0.3;
  else if (edad <= 32) base = -1;
  else if (edad <= 34) base = -2.2;
  else base = -3.4;

  if (base > 0) {
    /* Cerca del techo, cada punto cuesta el doble. */
    const acercamiento = limitar(margen / 12, 0, 1);
    const bruto = base * porMinutos * porOficio * acercamiento + campana(azar, 0, 0.7);
    return limitar(bruto, -1, margen);
  }

  /* La bajada se amortigua con oficio y se acelera con lesiones. */
  const castigo = 1 - (profesionalismo / 100) * 0.4 + lesiones * 0.15;
  return base * castigo + campana(azar, 0, 0.5);
}
