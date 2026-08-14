const TZ = 'America/Lima';

export function formatKickoff(iso: string): string {
  return new Intl.DateTimeFormat('es-PE', {
    timeZone: TZ,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(iso));
}

export function formatDate(iso: string): string {
  return new Intl.DateTimeFormat('es-PE', {
    timeZone: TZ,
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  }).format(new Date(iso));
}

/**
 * El día con todas sus letras y sin el año: "martes, 11 de agosto".
 *
 * Va donde hay lugar y el año no aporta —los partidos de una ronda, que se juegan esta semana—: en un
 * encabezado de día, "mar, 11 ago." obliga a descifrar una abreviatura para ahorrar diez píxeles.
 */
export function formatDayLong(iso: string): string {
  return new Intl.DateTimeFormat('es-PE', {
    timeZone: TZ,
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(new Date(iso));
}

export function formatDateLong(iso: string): string {
  return new Intl.DateTimeFormat('es-PE', {
    timeZone: TZ,
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(iso));
}

const STATUS_LABEL: Record<string, string> = {
  scheduled: 'Programado',
  in_play: 'En juego',
  paused: 'Descanso',
  finished: 'Final',
  postponed: 'Aplazado',
  suspended: 'Suspendido',
  cancelled: 'Cancelado',
  abandoned: 'Abandonado',
  awarded: 'Adjudicado',
};

export function statusLabel(status: string): string {
  return STATUS_LABEL[status] ?? status;
}

export function isLive(status: string): boolean {
  return status === 'in_play' || status === 'paused';
}

/**
 * El reloj de un partido en vivo.
 *
 * En el entretiempo el minuto se congela: un partido detenido en "45'" durante quince minutos parece
 * un dato viejo cuando en realidad están en el vestuario, así que ahí el reloj dice qué está pasando.
 * Lo mismo antes del alargue y durante los penales, que el minuto tampoco sabe contar.
 */
export function minutoEnVivo(
  status: string,
  elapsedMinutes: number | null,
  statusDetail: string | null = null,
): string {
  if (status === 'paused') return statusDetail === 'BT' ? 'Al alargue' : 'Descanso';
  if (statusDetail === 'P') return 'Penales';
  return elapsedMinutes === null ? statusLabel(status) : `${elapsedMinutes}'`;
}
