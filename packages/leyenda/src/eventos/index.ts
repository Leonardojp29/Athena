import { EVENTOS_DE_CAOS } from './caos.js';
import { EVENTOS_DE_DINERO } from './dinero.js';
import { EVENTOS_DE_FARANDULA } from './farandula.js';
import { EVENTOS_DE_FUTBOL } from './futbol.js';
import { EVENTOS_DEL_PERU } from './peru.js';
import { EVENTOS_DEL_MUNDO } from './mundo.js';
import { EVENTOS_DE_PRENSA } from './prensa.js';
import { EVENTOS_DE_SALSEO } from './salseo.js';
import { EVENTOS_DE_SALSEO_FUERTE } from './salseoFuerte.js';
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
  ...EVENTOS_DE_SALSEO,
  ...EVENTOS_DEL_PERU,
  ...EVENTOS_DE_SALSEO_FUERTE,
  ...EVENTOS_DEL_MUNDO,
];

export * from './motor.js';
export {
  EVENTOS_DE_CAOS,
  EVENTOS_DE_DINERO,
  EVENTOS_DE_FARANDULA,
  EVENTOS_DE_FUTBOL,
  EVENTOS_DEL_PERU,
  EVENTOS_DE_PRENSA,
  EVENTOS_DE_SALSEO,
  EVENTOS_DE_SALSEO_FUERTE,
  EVENTOS_DEL_MUNDO,
  EVENTOS_DE_SELECCION,
  EVENTOS_DE_VIDA,
  EVENTOS_SOCIALES,
};
