/*
 * El relato de un partido: qué pasó, cuándo, y cómo iba el marcador en ese momento.
 *
 * Está en el dominio y no en la web porque es lo único de la sección que se puede probar sin un
 * navegador —el pliegue del marcador, la regla del cuadre, los tramos— y porque lo consume una isla
 * de React que además se renderiza en el servidor: acá no puede entrar nada que dependa del reloj,
 * de `window` ni del ancho de la pantalla, o el HTML del servidor y el del navegador dejarían de
 * coincidir.
 *
 * Los tipos se declaran estructuralmente: el dominio no importa de la web.
 */

export interface EventoDeRelato {
  id: string;
  kind: string;
  minute: number;
  extraMinute: number | null;
  team: { id: string };
  player?: { id: string; name?: string } | null;
  detail?: { label?: string | null; comments?: string | null; playerName?: string | null } | null;
}

export interface PartidoDeRelato {
  status: string;
  homeScore: number | null;
  awayScore: number | null;
  homeTeam: { id: string };
  events: EventoDeRelato[];
}

export type Tramo = 'previo' | 'primero' | 'segundo' | 'alargue' | 'penales';

/*
 * La tanda no es parte del partido: define quién pasa, no cómo quedó.
 *
 * El proveedor la manda como eventos normales con minutos inventados que siguen al alargue —91, 92,
 * 93…—, así que sin esta marca los penales entran al marcador como goles: un 3-3 que se lee 10-9,
 * los doce ejecutores listados como goleadores en la cabecera, y el marcador corriente del relato
 * apagado porque la suma deja de cuadrar con el resultado oficial.
 *
 * La única señal fiable es el comentario, que el proveedor escribe igual en todas las competencias.
 */
const COMENTARIO_DE_TANDA = 'penalty shootout';

export function esDeLaTanda(evento: EventoDeRelato): boolean {
  return evento.detail?.comments?.trim().toLowerCase() === COMENTARIO_DE_TANDA;
}

export interface Marcador {
  local: number;
  visita: number;
}

export interface Jugada<E extends EventoDeRelato = EventoDeRelato> {
  clase: 'jugada';
  evento: E;
  /** De qué lado cae: el local del partido a la izquierda. */
  local: boolean;
  /** El marcador **después** de esta jugada; null en todo lo que no mueve el tanteador. */
  marcador: Marcador | null;
  /** Cierto cuando es el primero de su minuto: el resto del grupo dibuja un nodo. */
  abreMinuto: boolean;
  /** Una roja a quien ya tenía amarilla es doble amarilla, aunque el proveedor no lo diga. */
  dobleAmarilla: boolean;
}

export interface Banda {
  clase: 'banda';
  titulo: string;
  marcador: Marcador | null;
}

export type FilaDelRelato<E extends EventoDeRelato = EventoDeRelato> = Jugada<E> | Banda;

/* Un gol es un gol venga de donde venga; el autogol suma del otro lado, que es lo que confunde. */
const SUMA_PROPIA = new Set(['goal', 'penalty_goal']);

const TITULO: Record<Tramo, string> = {
  previo: 'Antes del arranque',
  primero: 'Primer tiempo',
  segundo: 'Entretiempo',
  alargue: 'Alargue',
  penales: 'Penales',
};

function tramoDe(evento: EventoDeRelato): Tramo {
  /* Antes que el minuto: el proveedor numera la tanda como si fuera la continuación del alargue. */
  if (esDeLaTanda(evento)) return 'penales';
  if (evento.minute < 0) return 'previo';
  if (evento.minute > 90) return 'alargue';
  return evento.minute > 45 ? 'segundo' : 'primero';
}

/** La clave con la que se ordena: el minuto agregado va después del minuto pelado. */
function clave(evento: EventoDeRelato): number {
  return evento.minute * 100 + (evento.extraMinute ?? 0);
}

/**
 * El relato completo, con las bandas que separan los tramos.
 *
 * El proveedor no manda un evento de medio tiempo, así que el tramo se deduce del minuto; la banda
 * solo aparece cuando hay jugadas de los dos lados, porque anunciar un entretiempo en un partido sin
 * nada en el primer tiempo sería inventar una pausa que nadie vio.
 *
 * **El marcador corriente solo se muestra si reconstruye el resultado oficial.** Si la suma de los
 * goles no da lo que dice el marcador —el proveedor deja goles anulados en la lista, se saltea
 * penales, adjudica partidos—, no se muestra ninguno: un "2-1" al lado de un gol es peor que nada.
 * En un partido en juego se acepta ir por detrás del marcador, nunca por delante.
 */
export function relatoDelPartido<E extends EventoDeRelato>(
  match: Omit<PartidoDeRelato, 'events'> & { events: E[] },
): Array<FilaDelRelato<E>> {
  const eventos = [...match.events].sort((a, b) => clave(a) - clave(b));

  const marcador: Marcador = { local: 0, visita: 0 };
  const conMarcador: Array<Marcador | null> = [];
  for (const evento of eventos) {
    const local = evento.team.id === match.homeTeam.id;
    if (!esDeLaTanda(evento) && (SUMA_PROPIA.has(evento.kind) || evento.kind === 'own_goal')) {
      /*
       * El autogol NO se voltea: el proveedor ya lo manda con el equipo al que le contó. Medido
       * sobre los 285 partidos con autogol de la base, la suma reconstruye el marcador oficial en
       * 279 leyéndolo tal cual y en 6 volteándolo. Voltearlo dejaba mudo el marcador corriente
       * justo en los partidos más difíciles de seguir.
       */
      if (local) marcador.local++;
      else marcador.visita++;
      conMarcador.push({ ...marcador });
    } else {
      conMarcador.push(null);
    }
  }

  const cuadra = cuadraConElOficial(match, marcador);
  const amarillas = new Set<string>();
  const filas: Array<FilaDelRelato<E>> = [];
  let tramoPrevio: Tramo | null = null;
  let minutoPrevio: number | null = null;

  eventos.forEach((evento, i) => {
    const tramo = tramoDe(evento);
    if (tramo !== tramoPrevio) {
      /* La primera banda solo se dibuja si hay algo antes que separar. */
      if (tramoPrevio !== null || tramo === 'previo') {
        filas.push({
          clase: 'banda',
          titulo: TITULO[tramo],
          marcador: cuadra && tramoPrevio !== null ? { ...(conMarcador[i - 1] ?? marcadorHasta(conMarcador, i)) } : null,
        });
      }
      tramoPrevio = tramo;
      minutoPrevio = null;
    }

    const identidad = evento.player?.id ?? evento.detail?.playerName ?? null;
    const dobleAmarilla = evento.kind === 'red_card' && identidad !== null && amarillas.has(identidad);
    if (evento.kind === 'yellow_card' && identidad !== null) amarillas.add(identidad);

    filas.push({
      clase: 'jugada',
      evento,
      local: evento.team.id === match.homeTeam.id,
      marcador: cuadra ? conMarcador[i] ?? null : null,
      abreMinuto: minutoPrevio !== evento.minute,
      dobleAmarilla,
    });
    minutoPrevio = evento.minute;
  });

  const cierre = cierreDelRelato(match, cuadra ? marcador : null);
  if (cierre) filas.push(cierre);

  return filas;
}

/** El marcador vigente justo antes de la posición `i`, para la banda que abre un tramo. */
function marcadorHasta(conMarcador: Array<Marcador | null>, i: number): Marcador {
  for (let j = i - 1; j >= 0; j--) {
    const m = conMarcador[j];
    if (m) return m;
  }
  return { local: 0, visita: 0 };
}

/**
 * ¿La suma de los goles reconstruye el resultado oficial?
 *
 * Terminado, tiene que dar exacto. En juego, alcanza con no pasarse: la lista de eventos suele ir un
 * minuto atrás del marcador de la cabecera y no tiene sentido esconder los chips por eso.
 */
function cuadraConElOficial(match: Omit<PartidoDeRelato, 'events'>, suma: Marcador): boolean {
  if (match.homeScore === null || match.awayScore === null) {
    return suma.local === 0 && suma.visita === 0;
  }
  if (match.status === 'in_play' || match.status === 'paused') {
    return suma.local <= match.homeScore && suma.visita <= match.awayScore;
  }
  return suma.local === match.homeScore && suma.visita === match.awayScore;
}

function cierreDelRelato(match: Omit<PartidoDeRelato, 'events'>, suma: Marcador | null): Banda | null {
  if (match.status !== 'finished') return null;
  const oficial =
    match.homeScore !== null && match.awayScore !== null
      ? { local: match.homeScore, visita: match.awayScore }
      : suma;
  return { clase: 'banda', titulo: 'Final', marcador: oficial };
}

/**
 * Cómo terminó la tanda, contando los penales convertidos de cada lado.
 *
 * Se cuenta y no se lee de un campo porque el proveedor no publica el resultado de la tanda: manda
 * los remates uno por uno, los que entraron como `penalty_goal` y los errados como `missed_penalty`.
 * Devuelve null cuando no hubo tanda, que es lo normal.
 */
export function tandaDePenales(match: {
  homeTeam: { id: string };
  events: EventoDeRelato[];
}): Marcador | null {
  const tanda = match.events.filter(esDeLaTanda);
  if (tanda.length === 0) return null;

  const marcador: Marcador = { local: 0, visita: 0 };
  for (const evento of tanda) {
    if (evento.kind !== 'penalty_goal') continue;
    if (evento.team.id === match.homeTeam.id) marcador.local++;
    else marcador.visita++;
  }
  return marcador;
}

/** El minuto como se escribe: "45+2", y un guion para los negativos que a veces manda el proveedor. */
export function minutoDeJugada(evento: EventoDeRelato): string {
  if (evento.minute < 0) return '–';
  return evento.extraMinute ? `${evento.minute}+${evento.extraMinute}` : String(evento.minute);
}

/* ---------- lo que el proveedor cuenta de cada jugada, en español ---------- */

/**
 * Los diccionarios salen de contar los valores reales de la base, no de imaginarlos: 1 040 revisiones
 * de VAR y 17 258 tarjetas con motivo que la interfaz tiraba a la basura. Lo que no está acá **no se
 * muestra**: escribir "Unsportsmanlike conduct" en una web en español es el mismo error que mostrar
 * "Round of 16" en un cuadro.
 */
const VAR: Record<string, string> = {
  'goal cancelled': 'El VAR anuló el gol',
  'goal confirmed': 'El VAR convalidó el gol',
  'goal disallowed - offside': 'Gol anulado por offside',
  'goal disallowed - foul': 'Gol anulado por falta',
  'goal disallowed - handball': 'Gol anulado por mano',
  'goal disallowed - video review': 'Gol anulado tras la revisión',
  'penalty confirmed': 'El VAR confirmó el penal',
  'penalty cancelled': 'El VAR anuló el penal',
  'card upgrade': 'El VAR agravó la tarjeta',
  'card reviewed': 'El VAR revisó la tarjeta',
  'red card cancelled': 'El VAR anuló la roja',
};

const MOTIVO: Record<string, string> = {
  foul: 'por falta',
  argument: 'por protestar',
  'time wasting': 'por demorar el juego',
  'unsportsmanlike conduct': 'por conducta antideportiva',
  'violent conduct': 'por conducta violenta',
  simulation: 'por simular',
  roughing: 'por juego brusco',
  'persistent fouling': 'por faltas reiteradas',
  tripping: 'por zancadilla',
  handball: 'por mano',
  'professional foul last man': 'por falta como último hombre',
  'off the ball foul': 'por falta sin balón',
  holding: 'por agarrón',
  'delay of game': 'por demorar el juego',
  'serious foul': 'por falta grave',
  elbowing: 'por codazo',
};

/** Qué revisó el VAR; sin traducción conocida, la frase genérica en lugar del inglés crudo. */
export function revisionDeVar(label: string | null | undefined): string {
  return (label ? VAR[label.trim().toLowerCase()] : null) ?? 'Revisión del VAR';
}

/** Por qué la amonestación; sin traducción conocida no se dice nada, que ya informa el icono. */
export function motivoDeTarjeta(comments: string | null | undefined): string | null {
  return comments ? (MOTIVO[comments.trim().toLowerCase()] ?? null) : null;
}

/* ---------- quiénes hicieron los goles ---------- */

export interface GolDeGoleador {
  minuto: number;
  extra: number | null;
  /** En contra: se anota del lado al que le contó, con el nombre del que se lo hizo. */
  enContra: boolean;
  penal: boolean;
}

export interface Goleador<E extends EventoDeRelato = EventoDeRelato> {
  /** El evento del primer gol: de ahí salen el jugador, su ficha y su foto. */
  evento: E;
  nombre: string;
  goles: GolDeGoleador[];
}

/**
 * Los goleadores de cada equipo, agrupados por jugador.
 *
 * Una línea por goleador y no por gol: los minutos de quien hizo dos van juntos —"Yótun 45+2', 82'"—,
 * que es como se escribe en fútbol y es lo que permite que la cabecera muestre todos los goles sin
 * crecer. El autogol va del lado del equipo al que le contó, que es como viene del proveedor y como
 * lo suma el marcador corriente; se marca `enContra` para que la vista lo distinga.
 */
export function goleadoresDelPartido<E extends EventoDeRelato>(match: {
  homeTeam: { id: string };
  events: E[];
}): { local: Array<Goleador<E>>; visita: Array<Goleador<E>> } {
  const lados = { local: new Map<string, Goleador<E>>(), visita: new Map<string, Goleador<E>>() };

  for (const evento of match.events) {
    if (!SUMA_PROPIA.has(evento.kind) && evento.kind !== 'own_goal') continue;
    /* Los doce de la tanda no son goleadores del partido: llenaban la cabecera y tapaban a los tres que sí lo son. */
    if (esDeLaTanda(evento)) continue;

    const enContra = evento.kind === 'own_goal';
    const lado = evento.team.id === match.homeTeam.id ? lados.local : lados.visita;

    const nombre = evento.player?.name ?? evento.detail?.playerName ?? 'Sin dato';
    const clave = evento.player?.id ?? nombre;
    const gol: GolDeGoleador = {
      minuto: Math.max(0, evento.minute),
      extra: evento.extraMinute ?? null,
      enContra,
      penal: evento.kind === 'penalty_goal',
    };

    const anterior = lado.get(clave);
    if (anterior) anterior.goles.push(gol);
    else lado.set(clave, { evento, nombre, goles: [gol] });
  }

  return { local: [...lados.local.values()], visita: [...lados.visita.values()] };
}
