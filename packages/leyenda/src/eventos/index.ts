import { EVENTOS_DE_CAOS } from './caos.js';
import { EVENTOS_DE_DINERO } from './dinero.js';
import { EVENTOS_DE_FARANDULA } from './farandula.js';
import { EVENTOS_DE_FUTBOL } from './futbol.js';
import { EVENTOS_DE_PRENSA } from './prensa.js';
import { EVENTOS_DE_SELECCION } from './seleccion.js';
import { EVENTOS_SOCIALES } from './social.js';
import { EVENTOS_DE_VIDA } from './vida.js';
import type { Evento } from './motor.js';

/** El catálogo entero. Agregar un archivo acá es todo lo que hace falta para sumar contenido. */
export const CATALOGO: Evento[] = [
  ...EVENTOS_DE_FUTBOL,
  ...EVENTOS_DE_PRENSA,
  ...EVENTOS_DE_VIDA,
  ...EVENTOS_SOCIALES,
  ...EVENTOS_DE_DINERO,
  ...EVENTOS_DE_CAOS,
  ...EVENTOS_DE_SELECCION,
  ...EVENTOS_DE_FARANDULA,
];

export * from './motor.js';
export {
  EVENTOS_DE_CAOS,
  EVENTOS_DE_DINERO,
  EVENTOS_DE_FARANDULA,
  EVENTOS_DE_FUTBOL,
  EVENTOS_DE_PRENSA,
  EVENTOS_DE_SELECCION,
  EVENTOS_DE_VIDA,
  EVENTOS_SOCIALES,
};
