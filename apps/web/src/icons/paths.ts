/*
 * Iconos de interfaz. Grilla de 24×24, margen seguro de 2px, todos de trazo y heredando
 * currentColor. Los de eventos de partido viven en paths.events.ts para que la isla de
 * React no empaquete el registro completo.
 */

export interface IconDef {
  body: string;
  viewBox?: string;
  /** 'fill' solo para los que necesitan color propio; el resto es trazo. */
  mode?: 'stroke' | 'fill';
}

const REGISTRO = {
  buscar: {
    body: '<circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/>',
  },
  tema: {
    // Semicírculo relleno: reemplaza el carácter ◐
    body: '<circle cx="12" cy="12" r="8.5"/><path d="M12 3.5a8.5 8.5 0 0 0 0 17z" fill="currentColor" stroke="none"/>',
  },
  cerrar: {
    body: '<path d="M6 6l12 12M18 6L6 18"/>',
  },
  menu: {
    body: '<path d="M4 7h16M4 12h16M4 17h16"/>',
  },
  'chevron-abajo': {
    body: '<path d="M6 9.5l6 6 6-6"/>',
  },
  'chevron-derecha': {
    body: '<path d="M9.5 6l6 6-6 6"/>',
  },
  // Reemplaza el carácter ← del enlace de volver
  'flecha-izquierda': {
    body: '<path d="M20 12H4.5"/><path d="M10 5.5L3.5 12l6.5 6.5"/>',
  },
  'flecha-externa': {
    body: '<path d="M8 16L16.5 7.5"/><path d="M9.5 7.5h7v7"/>',
  },
  // Reemplaza el carácter ▸ de las listas
  vineta: {
    body: '<path d="M9 6l6 6-6 6" stroke-width="2.4"/>',
  },
  // Marca el análisis de la IA: destello de cuatro puntas, dibujado no importado
  destello: {
    body: '<path d="M12 3.5l1.9 5.1 5.1 1.9-5.1 1.9-1.9 5.1-1.9-5.1L5 10.5l5.1-1.9z"/><path d="M18.5 16.5l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8z"/>',
  },
  estrella: {
    body: '<path d="M12 4l2.5 5.2 5.7.8-4.1 4 1 5.7-5.1-2.7-5.1 2.7 1-5.7-4.1-4 5.7-.8z"/>',
  },
  usuario: {
    body: '<circle cx="12" cy="8.5" r="3.8"/><path d="M4.8 20a7.2 7.2 0 0 1 14.4 0"/>',
  },
  reloj: {
    body: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3.2 2"/>',
  },
  estadio: {
    body: '<path d="M3.5 8.5C3.5 6.6 7.3 5 12 5s8.5 1.6 8.5 3.5"/><path d="M3.5 8.5v7C3.5 17.4 7.3 19 12 19s8.5-1.6 8.5-3.5v-7"/><path d="M9 9.2v6M15 9.2v6"/>',
  },
  info: {
    body: '<circle cx="12" cy="12" r="8.5"/><path d="M12 11v5.5"/><path d="M12 7.8h.01" stroke-width="2.2"/>',
  },
  check: {
    body: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  },
  alerta: {
    body: '<path d="M12 4.5l8.5 15H3.5z"/><path d="M12 10v4"/><path d="M12 16.8h.01" stroke-width="2.2"/>',
  },
  'tendencia-arriba': {
    body: '<path d="M4 16.5l5.5-5.5 3.5 3.5L20 8"/><path d="M14.5 8H20v5.5"/>',
  },
  'tendencia-abajo': {
    body: '<path d="M4 8l5.5 5.5L13 10l7 6.5"/><path d="M14.5 16.5H20V11"/>',
  },
  // La cancha: la marca del mundo, presente como icono
  cancha: {
    body: '<rect x="3.5" y="5.5" width="17" height="13" rx="1"/><path d="M12 5.5v13"/><circle cx="12" cy="12" r="2.6"/><path d="M3.5 9.5h2.4v5H3.5M20.5 9.5h-2.4v5h2.4"/>',
  },
  formacion: {
    body: '<circle cx="6" cy="12" r="1.6" fill="currentColor" stroke="none"/><circle cx="12" cy="7.5" r="1.6" fill="currentColor" stroke="none"/><circle cx="12" cy="16.5" r="1.6" fill="currentColor" stroke="none"/><circle cx="18" cy="12" r="1.6" fill="currentColor" stroke="none"/>',
  },
} as const satisfies Record<string, IconDef>;

/* El registro se declara con `satisfies` para tipar las claves, y se expone con el tipo
 * ancho: si no, las propiedades opcionales desaparecen de la unión al leerlas. */
export type IconName = keyof typeof REGISTRO;
export const ICONS: Record<IconName, IconDef> = REGISTRO;
