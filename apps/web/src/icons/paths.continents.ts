import type { IconDef } from './paths';

/*
 * Iconos de continente: la silueta del continente, como se ve en un mapamundi.
 *
 * Antes eran globos con un meridiano corrido, y el problema fue evidente en cuanto se pusieron
 * uno debajo del otro: seis círculos casi idénticos no distinguen nada. Ahora cada uno es su
 * contorno, simplificado a la docena de vértices que sobreviven a 14px —el ancho del norte y el
 * pico del sur en Sudamérica, el Cuerno en África, las penínsulas de Europa, la India en Asia—.
 *
 * Los contornos son a mano y a propósito: no pretenden ser cartografía, sino leerse de un vistazo
 * al tamaño en el que se usan. Están normalizados para llenar la misma caja, así que ninguno
 * parece más importante que otro.
 */
const REGISTRO = {
  norteamerica: {
    body: '<path d="M5.11 6.64L7.79 4.35L11.23 3.2L15.06 3.58L18.89 4.73L17.74 7.41L15.44 8.56L15.06 11.62L13.53 10.47L12.77 13.15L14.3 16.59L15.44 20.8L13.53 17.74L12 13.53L10.09 10.85L7.41 8.94Z" fill="currentColor" stroke="none"/>',
  },
  sudamerica: {
    body: '<path d="M9.36 3.55L14.29 3.2L16.4 4.96L15.7 7.78L14.29 10.24L13.58 13.41L12.88 17.28L11.82 20.8L10.77 16.93L9.71 12.35L7.6 8.13L7.95 4.96Z" fill="currentColor" stroke="none"/>',
  },
  europa: {
    body: '<path d="M3.2 13.32L4.96 10.24L6.28 5.84L8.48 8.92L10.24 5.4L13.76 6.72L17.28 5.4L20.36 8.04L18.16 11.56L20.8 14.2L16.84 15.96L13.76 14.2L14.2 18.6L11.56 16.4L8.92 18.16L7.16 14.64L4.08 15.96Z" fill="currentColor" stroke="none"/>',
  },
  africa: {
    body: '<path d="M3.97 4.73L8.56 3.2L12.77 3.2L16.97 3.97L15.83 6.64L20.42 7.41L16.59 9.7L14.68 13.15L13.15 16.97L11.62 20.8L10.09 15.83L8.17 11.23L5.88 7.79L3.58 6.26Z" fill="currentColor" stroke="none"/>',
  },
  asia: {
    body: '<path d="M3.2 8.75L5.88 6.07L10.47 4.92L14.68 5.3L18.89 6.45L20.8 8.75L18.89 11.04L16.21 10.66L14.68 12.96L13.34 19.08L12 12.96L10.09 11.04L7.03 11.81Z" fill="currentColor" stroke="none"/>',
  },
  oceania: {
    body: '<path d="M3.59 5.94L9.46 3.98L15.32 5.16L18.45 8.68L16.11 13.37L10.63 14.93L5.94 12.2L3.2 9.07ZM19.63 16.11L20.8 18.45L19.24 20.02Z" fill="currentColor" stroke="none"/>',
  },
  /* Internacional no es un continente: es el planeta entero, y ahí el globo sí es el dibujo. */
  mundial: {
    body: '<circle cx="12" cy="12" r="8.5"/><path d="M12 3.5v17"/><path d="M4 12h16"/><path d="M8.5 4.6c-1.7 2.2-2.4 4.7-2.4 7.4s.7 5.2 2.4 7.4"/><path d="M15.5 4.6c1.7 2.2 2.4 4.7 2.4 7.4s-.7 5.2-2.4 7.4"/>',
  },
} as const satisfies Record<string, IconDef>;

export type ContinentIconName = keyof typeof REGISTRO;
export const CONTINENT_ICONS: Record<ContinentIconName, IconDef> = REGISTRO;

/** El aro del globo alrededor de la silueta. A tamaño chico estorba más de lo que aporta. */
export const ARO_GLOBO = '<circle cx="12" cy="12" r="11.2" opacity="0.22"/>';
