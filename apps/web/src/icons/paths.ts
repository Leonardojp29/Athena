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
  paleta: {
    // Dos muestras superpuestas: la de adelante rellena, la de atrás al aire.
    body: '<circle cx="9" cy="12" r="6"/><circle cx="15" cy="12" r="6" fill="currentColor" fill-opacity="0.35" stroke="none"/><circle cx="15" cy="12" r="6"/>',
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
  /*
   * El estadio con sus torres de luz: el trazo es de Tabler Icons (MIT), que ya dibuja en la misma
   * grilla de 24 y con el mismo grosor que el resto del juego. Los dos intentos propios —un cilindro
   * con dos rayas, después dos óvalos concéntricos— no se leían como un estadio a ningún tamaño.
   */
  estadio: {
    body: '<path d="M12 12m-8 0a8 2 0 1 0 16 0a8 2 0 1 0 -16 0"/><path d="M4 12v7c0 .94 2.51 1.785 6 2v-3h4v3c3.435 -.225 6 -1.07 6 -2v-7"/><path d="M15 6h4v-3h-4v7"/><path d="M7 6h4v-3h-4v7"/>',
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
  // La copa: la marca de los torneos con final, del campeón y del jugador del torneo
  trofeo: {
    body: '<path d="M8 4.5h8v4.2a4 4 0 0 1-8 0z"/><path d="M8 5.5H5.2v1.8A3.2 3.2 0 0 0 8.4 10.5M16 5.5h2.8v1.8a3.2 3.2 0 0 1-3.2 3.2"/><path d="M12 12.7v3.3"/><path d="M8.5 19.5h7"/><path d="M10 16h4l.8 3.5h-5.6z"/>',
  },
  // La bandera del asta: una selección es una bandera (Tabler, MIT)
  bandera: {
    body: '<path d="M5 5a5 5 0 0 1 7 0a5 5 0 0 0 7 0v9a5 5 0 0 1 -7 0a5 5 0 0 0 -7 0z"/><path d="M5 21v-7"/>',
  },
  // Las llaves de una copa: dos ramas que confluyen
  cuadro: {
    body: '<path d="M3.5 6.5h4.2v5h4.6M3.5 17.5h4.2v-6"/><path d="M20.5 6.5h-4.2v5h-4.3M20.5 17.5h-4.2v-6"/>',
  },
  /* La sección de juegos: un mando, que es lo que se lee como "jugar" sin pensarlo. */
  juego: {
    body: '<path d="M8.5 8.5h7a5 5 0 0 1 4.6 3l.9 4.6a2 2 0 0 1-3.6 1.5l-1.6-2.1H8.2l-1.6 2.1A2 2 0 0 1 3 16.1L3.9 11.5a5 5 0 0 1 4.6-3z"/><path d="M7.2 12.6h2.2M8.3 11.5v2.2"/><circle cx="15.6" cy="12.6" r=".9" fill="currentColor" stroke="none"/>',
  },
  // La pelota: el objeto del juego, con sus paneles
  pelota: {
    body: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.2l3.3 2.4-1.3 3.9h-4l-1.3-3.9z"/><path d="M12 3.5v3.7M19.6 9.9l-4.3-.3M17 19.4l-3-6.1M7 19.4l3-6.1M4.4 9.9l4.3-.3"/>',
  },
  // El guante del arquero: la carrera bajo los tres palos
  guante: {
    body: '<path d="M7.5 20.5v-4.2a4 4 0 0 1-1.8-3.3V8.2a1.6 1.6 0 0 1 3.2 0v3.1"/><path d="M8.9 11.3V5.6a1.6 1.6 0 0 1 3.2 0v5.7"/><path d="M12.1 11.3V6.4a1.6 1.6 0 0 1 3.2 0v4.9"/><path d="M15.3 11.4V8.6a1.6 1.6 0 0 1 3.2 0v4.4a7 7 0 0 1-2.4 5.2v2.3"/>',
  },
  // El contrato: la hoja firmada de cada fichaje
  contrato: {
    body: '<path d="M6 3.5h8.5L19 8v12.5H6z"/><path d="M14 3.5V8h4.6"/><path d="M9 12.5h6M9 16h3.5"/>',
  },
  // La prensa: el micrófono de la zona mixta
  prensa: {
    body: '<rect x="9.5" y="3.5" width="5" height="9.5" rx="2.5"/><path d="M6.5 11.5a5.5 5.5 0 0 0 11 0"/><path d="M12 17v3.5M9 20.5h6"/>',
  },
  // La vida: lo que no se juega en la cancha
  corazon: {
    body: '<path d="M12 20s-7.5-4.6-7.5-9.6A4.4 4.4 0 0 1 12 7.4a4.4 4.4 0 0 1 7.5 3C19.5 15.4 12 20 12 20z"/>',
  },
  // El dinero: el billete de los contratos
  dinero: {
    body: '<rect x="3.5" y="6.5" width="17" height="11" rx="1.5"/><circle cx="12" cy="12" r="2.6"/><path d="M6.5 10v4M17.5 10v4"/>',
  },
} as const satisfies Record<string, IconDef>;

/* El registro se declara con `satisfies` para tipar las claves, y se expone con el tipo
 * ancho: si no, las propiedades opcionales desaparecen de la unión al leerlas. */
export type IconName = keyof typeof REGISTRO;
export const ICONS: Record<IconName, IconDef> = REGISTRO;
