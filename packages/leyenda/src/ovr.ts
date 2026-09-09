/**
 * El número de la carta.
 *
 * El OVR no es el promedio de los seis atributos: cada puesto pesa lo suyo, porque un delantero con
 * 90 de tiro y 40 de defensa es un crack y un central con esos mismos números es un problema. Los
 * pesos suman 1 en cada puesto, así el OVR queda en la misma escala para todos y las cartas se
 * pueden comparar entre sí, que es de lo que vive una colección.
 */
import type { Atributos, Nivel, Puesto } from './estado.js';
import { NIVELES } from './estado.js';

type Pesos = Record<keyof Atributos, number>;

const PESOS: Record<Puesto, Pesos> = {
  /* El arquero lee los mismos casilleros con otro nombre: ritmo=reflejos, tiro=estirada,
     pase=saque, regate=manos, defensa=posicionamiento, fisico=elasticidad. */
  POR: { ritmo: 0.2, tiro: 0.2, pase: 0.1, regate: 0.15, defensa: 0.2, fisico: 0.15 },
  DFC: { ritmo: 0.1, tiro: 0.03, pase: 0.12, regate: 0.05, defensa: 0.45, fisico: 0.25 },
  LAT: { ritmo: 0.25, tiro: 0.05, pase: 0.18, regate: 0.14, defensa: 0.24, fisico: 0.14 },
  MC: { ritmo: 0.1, tiro: 0.1, pase: 0.32, regate: 0.18, defensa: 0.18, fisico: 0.12 },
  MO: { ritmo: 0.14, tiro: 0.18, pase: 0.28, regate: 0.28, defensa: 0.04, fisico: 0.08 },
  EXT: { ritmo: 0.28, tiro: 0.16, pase: 0.14, regate: 0.32, defensa: 0.02, fisico: 0.08 },
  DC: { ritmo: 0.18, tiro: 0.38, pase: 0.08, regate: 0.18, defensa: 0.02, fisico: 0.16 },
};

/** Los rótulos de la carta. El arquero tiene los suyos. */
export const ROTULOS_DE_CAMPO: Array<{ clave: keyof Atributos; corto: string; largo: string }> = [
  { clave: 'ritmo', corto: 'RIT', largo: 'Ritmo' },
  { clave: 'tiro', corto: 'TIR', largo: 'Tiro' },
  { clave: 'pase', corto: 'PAS', largo: 'Pase' },
  { clave: 'regate', corto: 'REG', largo: 'Regate' },
  { clave: 'defensa', corto: 'DEF', largo: 'Defensa' },
  { clave: 'fisico', corto: 'FÍS', largo: 'Físico' },
];

export const ROTULOS_DE_ARQUERO: Array<{ clave: keyof Atributos; corto: string; largo: string }> = [
  { clave: 'ritmo', corto: 'REF', largo: 'Reflejos' },
  { clave: 'tiro', corto: 'EST', largo: 'Estirada' },
  { clave: 'pase', corto: 'SAQ', largo: 'Saque' },
  { clave: 'regate', corto: 'MAN', largo: 'Manos' },
  { clave: 'defensa', corto: 'POS', largo: 'Posición' },
  { clave: 'fisico', corto: 'ELA', largo: 'Elasticidad' },
];

export const rotulosDe = (puesto: Puesto) => (puesto === 'POR' ? ROTULOS_DE_ARQUERO : ROTULOS_DE_CAMPO);

export function calcularOvr(atributos: Atributos, puesto: Puesto): number {
  const pesos = PESOS[puesto];
  let suma = 0;
  for (const clave of Object.keys(pesos) as Array<keyof Atributos>) {
    suma += atributos[clave] * pesos[clave];
  }
  return Math.round(suma);
}

/*
 * Los cortes de nivel. No son parejos a propósito: subir de profesional a élite cuesta seis puntos
 * y de ícono a inmortal cuesta cuatro, pero llegar a 92 es rarísimo. Las dos categorías de arriba
 * además exigen carrera, no solo número (ver `nivelDe`).
 */
const CORTES: Array<{ nivel: Nivel; desde: number }> = [
  { nivel: 'inmortal', desde: 93 },
  { nivel: 'icono', desde: 89 },
  { nivel: 'clase-mundial', desde: 84 },
  { nivel: 'elite', desde: 78 },
  { nivel: 'profesional', desde: 71 },
  { nivel: 'promesa', desde: 64 },
  { nivel: 'cantera', desde: 0 },
];

/** Hasta esta edad se puede ser cantera o promesa. Después, el piso es profesional. */
const EDAD_DE_JUVENIL = 23;

/**
 * El nivel de la carta. Ícono e inmortal piden además una carrera detrás —títulos y premios—:
 * un número alto en una temporada buena no convierte a nadie en ícono, y esa es justamente la
 * diferencia entre un crack y una leyenda.
 *
 * Y los dos materiales de abajo exigen juventud. El declive por edad resta hasta seis puntos y medio
 * por bienio, así que sin este piso la carta desandaba la escalera: medido, el 63% de las carreras
 * terminaba etiquetada como **cantera** a los 38 años. Un capitán con trescientos partidos y tres
 * títulos no es una promesa de nada. El declive se ve donde tiene que verse —el número, los
 * atributos, el valor de mercado— y no en un rótulo que dice que el veterano acaba de llegar.
 */
export function nivelDe(ovr: number, logros: { trofeos: number; premios: number }, edad: number): Nivel {
  const porNumero = CORTES.find((c) => ovr >= c.desde)?.nivel ?? 'cantera';
  if (porNumero === 'inmortal' && (logros.premios < 2 || logros.trofeos < 6)) return 'icono';
  if (porNumero === 'icono' && logros.trofeos < 2) return 'clase-mundial';
  if (edad > EDAD_DE_JUVENIL && (porNumero === 'cantera' || porNumero === 'promesa')) return 'profesional';
  return porNumero;
}

/**
 * El material que le corresponde a la carta hoy, que nunca es peor que el que ya alcanzó.
 *
 * Si fuiste élite, sos élite. El material cuenta lo que llegaste a ser y por eso solo sube: es la
 * misma idea que `nivelMaximo` en el legado, aplicada a la carta en vivo.
 */
export function nivelAlcanzado(
  ovr: number,
  logros: { trofeos: number; premios: number },
  edad: number,
  anterior: Nivel,
): Nivel {
  const ahora = nivelDe(ovr, logros, edad);
  return indiceDeNivel(ahora) > indiceDeNivel(anterior) ? ahora : anterior;
}

export const indiceDeNivel = (nivel: Nivel): number => NIVELES.indexOf(nivel);

/**
 * El valor de mercado, en millones. Crece con el cubo del OVR sobre 60 —el mercado paga los últimos
 * puntos muchísimo más caros que los primeros, y eso es lo que hace que un salto de 84 a 88 se
 * sienta— y se corrige por edad: a los 33 el mismo jugador vale un tercio.
 */
export function valorDeMercado(ovr: number, edad: number, potencial: number): number {
  if (ovr < 55) return 0.2;
  const base = Math.pow((ovr - 50) / 12, 3);
  const porEdad = edad <= 21 ? 1.35 : edad <= 26 ? 1.15 : edad <= 29 ? 1 : edad <= 32 ? 0.6 : 0.28;
  /* Una promesa con techo alto vale más que su presente: es lo que se está comprando. */
  const porTecho = edad <= 23 ? 1 + Math.max(0, potencial - ovr) / 60 : 1;
  return Math.max(0.2, Math.round(base * porEdad * porTecho * 10) / 10);
}
