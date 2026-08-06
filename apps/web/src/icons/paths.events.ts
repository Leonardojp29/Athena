/*
 * Iconos de eventos de partido. Separados de paths.ts porque la isla de React solo
 * necesita estos y no debe empaquetar el registro completo.
 *
 * Los que llevan color propio lo toman de tokens, nunca de un hex literal, y siempre van
 * acompañados de texto para lectores de pantalla: el color no es el único canal.
 */

import type { IconDef } from './paths.js';

export interface EventIconDef extends IconDef {
  /** Etiqueta accesible por defecto para este tipo de evento. */
  label: string;
  /** Color propio del evento, expresado como token. */
  color?: string;
}

const PELOTA_PANELES =
  '<circle cx="12" cy="12" r="8.2"/><path d="M12 3.8l2.6 3.4-1 4.1-3.2 0-1-4.1z"/><path d="M4.4 10.2l3.9 1.1 1.1 3.2-2.6 3.1"/><path d="M19.6 10.2l-3.9 1.1-1.1 3.2 2.6 3.1"/><path d="M9.3 17.6l2.7 2 2.7-2"/>';

const REGISTRO = {
  goal: {
    body: PELOTA_PANELES,
    label: 'Gol',
  },
  own_goal: {
    body: `${PELOTA_PANELES}<path d="M20.5 4.2L4.2 20.5" stroke="var(--a-color-card-red)" stroke-width="2.2"/>`,
    label: 'Autogol',
    color: 'var(--a-color-card-red)',
  },
  penalty_goal: {
    body: `${PELOTA_PANELES}<path d="M2.6 21.4h18.8" stroke-dasharray="1.5 2"/>`,
    label: 'Gol de penal',
  },
  missed_penalty: {
    body: '<circle cx="12" cy="12" r="8.2"/><path d="M8.4 8.4l7.2 7.2M15.6 8.4l-7.2 7.2"/>',
    label: 'Penal errado',
    color: 'var(--a-color-card-red)',
  },
  yellow_card: {
    body: '<rect x="7" y="3.5" width="10" height="17" rx="1.6" fill="var(--a-color-card-yellow)" stroke="none"/>',
    label: 'Tarjeta amarilla',
    color: 'var(--a-color-card-yellow)',
    mode: 'fill',
  },
  red_card: {
    body: '<rect x="7" y="3.5" width="10" height="17" rx="1.6" fill="var(--a-color-card-red)" stroke="none"/>',
    label: 'Tarjeta roja',
    color: 'var(--a-color-card-red)',
    mode: 'fill',
  },
  second_yellow: {
    body: '<rect x="4" y="4.5" width="9" height="15" rx="1.5" fill="var(--a-color-card-yellow)" stroke="none"/><rect x="11" y="4.5" width="9" height="15" rx="1.5" fill="var(--a-color-card-red)" stroke="none"/>',
    label: 'Doble amarilla',
    color: 'var(--a-color-card-red)',
    mode: 'fill',
  },
  substitution: {
    body: '<path d="M4 8.5h11l-3-3M20 15.5H9l3 3" stroke-linecap="round"/>',
    label: 'Cambio',
  },
  sub_in: {
    body: '<path d="M4 12h13l-4-4M17 12l-4 4" stroke="var(--a-color-live)"/>',
    label: 'Entra',
    color: 'var(--a-color-live)',
  },
  sub_out: {
    body: '<path d="M20 12H7l4-4M7 12l4 4" stroke="var(--a-color-card-red)"/>',
    label: 'Sale',
    color: 'var(--a-color-card-red)',
  },
  var: {
    body: '<rect x="3" y="5" width="18" height="12" rx="1.5"/><path d="M9 20h6"/><path d="M8.5 11l2.4 2.4L15.5 9"/>',
    label: 'Revisión del VAR',
  },
  assist: {
    body: '<path d="M3.5 17.5c4-6 8-8 12.5-8"/><path d="M12.5 8.2l3.5 1.3-1.3 3.5"/><circle cx="19" cy="7" r="2.4"/>',
    label: 'Asistencia',
  },
  silbato: {
    body: '<path d="M4 10.5h9.5l6.5-3v9l-6.5-3H4z"/><circle cx="7.5" cy="14.5" r="3.4"/>',
    label: 'Silbato',
  },
  capitan: {
    body: '<path d="M6 6.5h12v5a6 6 0 0 1-12 0z"/><path d="M13.6 8.9a2.4 2.4 0 1 0 0 3.4"/>',
    label: 'Capitán',
  },
  lesion: {
    body: '<circle cx="12" cy="12" r="8.5"/><path d="M12 8v8M8 12h8"/>',
    label: 'Lesión',
    color: 'var(--a-color-card-red)',
  },
  atajada: {
    body: '<path d="M7 20v-6.5a2 2 0 0 1 4 0V6.5a1.9 1.9 0 0 1 3.8 0V11a1.9 1.9 0 0 1 3.7 0v5.5a4 4 0 0 1-4 4z"/>',
    label: 'Atajada',
  },
  offside: {
    body: '<path d="M6 20V4"/><path d="M6 4.5l11 3.5-11 3.5"/>',
    label: 'Offside',
  },
} as const satisfies Record<string, EventIconDef>;

export type EventIconName = keyof typeof REGISTRO;
export const EVENT_ICONS: Record<EventIconName, EventIconDef> = REGISTRO;
