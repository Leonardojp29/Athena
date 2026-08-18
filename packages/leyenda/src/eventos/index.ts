import { EVENTOS_DE_FUTBOL } from './futbol.js';
import { EVENTOS_DE_PRENSA } from './prensa.js';
import { EVENTOS_DE_VIDA } from './vida.js';
import type { Evento } from './motor.js';

/** El catálogo entero. Agregar un archivo acá es todo lo que hace falta para sumar contenido. */
export const CATALOGO: Evento[] = [...EVENTOS_DE_FUTBOL, ...EVENTOS_DE_PRENSA, ...EVENTOS_DE_VIDA];

export * from './motor.js';
export { EVENTOS_DE_FUTBOL, EVENTOS_DE_PRENSA, EVENTOS_DE_VIDA };
