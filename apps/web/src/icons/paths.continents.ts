import type { IconDef } from './paths';

/*
 * Iconos de continente. No son mapas: un contorno de Sudamérica a 16px es una mancha
 * ilegible, y el piso de calidad prohíbe el SVG que imita una ilustración. Son marcas
 * geométricas —un globo con el meridiano donde corresponde— que sí funcionan a ese tamaño y
 * se distinguen entre sí de un vistazo.
 */
const REGISTRO = {
  /* Globo con el meridiano corrido al oeste y el paralelo bajo: hemisferio sur, occidente. */
  sudamerica: {
    body: '<circle cx="12" cy="12" r="8.5"/><path d="M8.5 4.2c-1.6 2.2-2.2 4.9-2.2 7.8s.6 5.6 2.2 7.8"/><path d="M4 15h16"/>',
  },
  /* Meridiano al este y paralelo alto: hemisferio norte, oriente. */
  europa: {
    body: '<circle cx="12" cy="12" r="8.5"/><path d="M15.5 4.2c1.6 2.2 2.2 4.9 2.2 7.8s-.6 5.6-2.2 7.8"/><path d="M4 9h16"/>',
  },
  norteamerica: {
    body: '<circle cx="12" cy="12" r="8.5"/><path d="M8.5 4.2c-1.6 2.2-2.2 4.9-2.2 7.8s.6 5.6 2.2 7.8"/><path d="M4 9h16"/>',
  },
  africa: {
    body: '<circle cx="12" cy="12" r="8.5"/><path d="M12 3.5v17"/><path d="M4 15h16"/>',
  },
  asia: {
    body: '<circle cx="12" cy="12" r="8.5"/><path d="M15.5 4.2c1.6 2.2 2.2 4.9 2.2 7.8s-.6 5.6-2.2 7.8"/><path d="M4 15h16"/>',
  },
  /* Internacional: el globo completo, sin recorte de hemisferio. */
  mundial: {
    body: '<circle cx="12" cy="12" r="8.5"/><path d="M12 3.5v17"/><path d="M4 12h16"/><path d="M8.5 4.6c-1.7 2.2-2.4 4.7-2.4 7.4s.7 5.2 2.4 7.4"/><path d="M15.5 4.6c1.7 2.2 2.4 4.7 2.4 7.4s-.7 5.2-2.4 7.4"/>',
  },
} as const satisfies Record<string, IconDef>;

export type ContinentIconName = keyof typeof REGISTRO;
export const CONTINENT_ICONS: Record<ContinentIconName, IconDef> = REGISTRO;
