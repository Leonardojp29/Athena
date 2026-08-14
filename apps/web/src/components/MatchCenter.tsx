import { useEffect, useRef, useState } from 'react';
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';
import EventIcon from './EventIcon';
import type { MatchEventView, MatchView, PlayerLink } from '../lib/api';
import { formatKickoff, isLive, statusLabel } from '../lib/format';

/*
 * Marcador y minuto a minuto. Es un solo componente y una sola consulta: dos islas
 * separadas significarían dos pollers golpeando el API cada veinte segundos.
 *
 * Sin `client:*` Astro lo renderiza en el servidor y la página queda en 0 KB; solo los
 * partidos en juego se hidratan.
 */

function playerName(event: MatchEventView): string {
  return event.player?.name ?? event.detail?.playerName ?? '';
}

/* Solo un gol se asiste. El proveedor manda un "assist" en penales errados y en el VAR. */
const ASISTIBLE = new Set(['goal', 'penalty_goal']);

function relatedName(event: MatchEventView): string | null {
  return event.relatedPlayer?.name ?? event.detail?.relatedPlayerName ?? null;
}

/*
 * Un nombre de jugador nunca va solo: siempre con su foto. Es la versión React del componente
 * PlayerName de Astro; el timeline vive en la isla y no puede usar el otro.
 */
function NombreJugador({
  player,
  fallback,
  className,
}: {
  player: PlayerLink | null;
  fallback: string;
  className?: string;
}) {
  const nombre = player?.name ?? fallback;
  const contenido = (
    <>
      {player?.photoUrl ? (
        <img
          src={player.photoUrl}
          alt=""
          width={20}
          height={20}
          loading="lazy"
          className="size-5 shrink-0 rounded-full bg-canvas-subtle object-cover"
        />
      ) : (
        <span className="size-5 shrink-0 rounded-full bg-canvas-subtle" aria-hidden="true" />
      )}
      <span className="truncate">{nombre}</span>
    </>
  );

  return player?.slug ? (
    <a
      href={`/jugadores/${player.slug}`}
      className={`inline-flex min-w-0 items-center gap-1.5 align-middle hover:text-primary-ink hover:underline ${className ?? ''}`}
    >
      {contenido}
    </a>
  ) : (
    <span className={`inline-flex min-w-0 items-center gap-1.5 align-middle ${className ?? ''}`}>
      {contenido}
    </span>
  );
}

function TeamSide({ match, side }: { match: MatchView; side: 'home' | 'away' }) {
  const team = side === 'home' ? match.homeTeam : match.awayTeam;
  return (
    <a
      href={`/equipos/${team.slug}`}
      className="group flex min-w-0 flex-col items-center gap-2 text-center sm:gap-3"
    >
      {team.logoUrl && (
        <img
          src={team.logoUrl}
          alt=""
          width={72}
          height={72}
          className="size-10 transition-transform group-hover:scale-105 sm:size-12"
        />
      )}
      <span className="font-display text-sm font-semibold uppercase leading-tight text-chalk group-hover:text-primary sm:text-base lg:text-lg">
        {team.name}
      </span>
    </a>
  );
}

/**
 * Gira solo la cifra que cambió.
 *
 * Animar el marcador entero hace que el ojo pierda el resultado justo cuando más importa; girar
 * el dígito que se movió es lo que hace un tablero de verdad. La clave de React fuerza el
 * remonte, que es lo que dispara la animación sin tocar clases a mano.
 */
function Cifra({ valor }: { valor: number }) {
  const [clave, setClave] = useState(0);
  const anterior = useRef(valor);

  useEffect(() => {
    if (anterior.current !== valor) {
      anterior.current = valor;
      setClave((k) => k + 1);
    }
  }, [valor]);

  return (
    <span key={clave} className="inline-block animate-score-flip" style={{ willChange: 'transform' }}>
      {valor}
    </span>
  );
}

function Scoreboard({ match }: { match: MatchView }) {
  const live = isLive(match.status);
  const hasScore = match.homeScore !== null && match.awayScore !== null;

  return (
    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 py-3 sm:gap-8 sm:py-3.5">
      <TeamSide match={match} side="home" />

      <div className="flex flex-col items-center gap-1.5">
        {hasScore ? (
          <span
            className="font-display font-semibold tabular leading-none text-chalk"
            /* el mismo nombre que la fila del listado: el marcador se transforma, no se corta */
            /* Más chico que el token de marcador: el hero completo tiene que entrar en 1080p. */
            style={{
              fontSize: 'clamp(2.25rem, 4vw, 3.25rem)',
              viewTransitionName: `marcador-${match.id}`,
            }}
            data-marcador
          >
            <Cifra valor={match.homeScore as number} /> – <Cifra valor={match.awayScore as number} />
          </span>
        ) : (
          <span className="font-display text-2xl font-semibold tabular text-chalk sm:text-3xl">
            {formatKickoff(match.kickoffUtc)}
          </span>
        )}

        <span
          className={
            live
              ? 'flex items-center gap-1.5 rounded-full bg-live-board/16 px-2.5 py-1 text-2xs font-medium text-live-board'
              : 'rounded-full bg-chalk/10 px-2.5 py-1 text-2xs font-medium text-chalk-dim'
          }
        >
          {live && <span className="size-1.5 rounded-full bg-live-board animate-live-pulse" />}
          <span data-minuto>
            {live && match.elapsedMinutes !== null
              ? `${match.elapsedMinutes}'`
              : statusLabel(match.status)}
          </span>
        </span>
      </div>

      <TeamSide match={match} side="away" />
    </div>
  );
}

function Timeline({ match }: { match: MatchView }) {
  if (match.events.length === 0) {
    return (
      <p className="rounded-lg border border-border bg-surface p-4 text-sm text-ink-muted">
        Todavía no hay eventos registrados en este partido.
      </p>
    );
  }

  return (
    <ol className="grid gap-0">
      {match.events.map((event) => {
        const home = event.team.id === match.homeTeam.id;
        const related = relatedName(event);
        const nombre = playerName(event);

        return (
          <li
            key={event.id}
            className={`flex items-center gap-2.5 border-b border-border/50 py-2 text-sm last:border-0 ${
              home ? '' : 'flex-row-reverse text-right'
            }`}
          >
            <span className="w-9 shrink-0 tabular text-2xs text-ink-muted">
              {event.minute}
              {event.extraMinute ? `+${event.extraMinute}` : ''}&apos;
            </span>
            <EventIcon kind={event.kind} detail={`${nombre} ${event.minute}'`} />
            <span className="flex min-w-0 flex-wrap items-center gap-x-1.5">
              {/*
                En un cambio el que entra es el destacado, así que va primero y en negrita. El
                proveedor los manda al revés de lo que sugieren los nombres de sus campos: `player`
                es **el que sale** —verificado contra los datos: siempre estaba en el once y con los
                minutos cortados en el minuto del cambio— y `relatedPlayer` el que entra. Antes esta
                fila los mostraba invertidos y decía "sale" del que acababa de entrar.
              */}
              {event.kind === 'substitution' && related ? (
                <>
                  <NombreJugador
                    player={event.relatedPlayer}
                    fallback={related}
                    className="font-medium"
                  />
                  <span className="flex min-w-0 items-center gap-1.5 text-ink-muted">
                    <span aria-label="por">←</span>
                    <NombreJugador player={event.player} fallback={nombre} />
                  </span>
                </>
              ) : (
                <NombreJugador player={event.player} fallback={nombre} className="font-medium" />
              )}
              {ASISTIBLE.has(event.kind) && related && (
                <span className="flex min-w-0 items-center gap-1.5 text-ink-muted">
                  asiste
                  <NombreJugador player={event.relatedPlayer} fallback={related} />
                </span>
              )}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

interface Props {
  initial: MatchView;
  live: boolean;
  /** `hero` es el marcador a sangre; `timeline` es el minuto a minuto de la pestaña. */
  part: 'hero' | 'timeline';
}

function Render({ match, part }: { match: MatchView; part: Props['part'] }) {
  return part === 'hero' ? <Scoreboard match={match} /> : <Timeline match={match} />;
}

function LiveMatch({ initial, part }: { initial: MatchView; part: Props['part'] }) {
  /*
   * Solo el hero mantiene el temporizador. El minuto a minuto es otra isla del mismo bundle,
   * así que comparte este QueryClient y se vuelve a pintar cuando la caché cambia: dos
   * intervalos serían dos llamadas al API cada veinte segundos por lector.
   */
  const poll = part === 'hero';

  const { data } = useQuery({
    queryKey: ['match', initial.id],
    queryFn: async (): Promise<MatchView> => {
      const res = await fetch(
        `${import.meta.env.PUBLIC_API_URL ?? 'http://localhost:3001'}/v1/views/match/${initial.id}`,
      );
      if (!res.ok) throw new Error(`match fetch ${res.status}`);
      return res.json();
    },
    initialData: initial,
    refetchInterval: poll
      ? (query) => {
          const status = query.state.data?.status ?? initial.status;
          return isLive(status) || status === 'scheduled' ? 20_000 : false;
        }
      : false,
    refetchOnWindowFocus: poll,
    refetchOnMount: poll,
  });

  return <Render match={data ?? initial} part={part} />;
}

const queryClient = new QueryClient();

export default function MatchCenter({ initial, live, part }: Props) {
  if (!live) return <Render match={initial} part={part} />;
  return (
    <QueryClientProvider client={queryClient}>
      <LiveMatch initial={initial} part={part} />
    </QueryClientProvider>
  );
}
