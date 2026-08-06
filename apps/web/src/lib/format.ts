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
