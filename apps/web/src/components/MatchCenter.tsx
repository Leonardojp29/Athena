import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';
import EventIcon from './EventIcon';
import type { MatchEventView, MatchView } from '../lib/api';
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
          className="size-12 transition-transform group-hover:scale-105 sm:size-16 lg:size-18"
        />
      )}
      <span className="font-display text-sm font-semibold uppercase leading-tight text-chalk group-hover:text-primary sm:text-lg lg:text-xl">
        {team.name}
      </span>
    </a>
  );
}

function Scoreboard({ match }: { match: MatchView }) {
  const live = isLive(match.status);
  const hasScore = match.homeScore !== null && match.awayScore !== null;

  return (
    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 py-6 sm:gap-8 sm:py-8">
      <TeamSide match={match} side="home" />

      <div className="flex flex-col items-center gap-2">
        {hasScore ? (
          <span
            className="font-display font-semibold tabular leading-none text-chalk"
            /* el mismo nombre que la fila del listado: el marcador se transforma, no se corta */
            style={{ fontSize: 'var(--a-text-score)', viewTransitionName: `marcador-${match.id}` }}
            data-marcador
          >
            {match.homeScore} – {match.awayScore}
          </span>
        ) : (
          <span className="font-display text-3xl font-semibold tabular text-chalk sm:text-4xl">
            {formatKickoff(match.kickoffUtc)}
          </span>
        )}

        <span
          className={
            live
              ? 'flex items-center gap-1.5 rounded-full bg-live/16 px-2.5 py-1 text-2xs font-medium text-live'
              : 'rounded-full bg-chalk/10 px-2.5 py-1 text-2xs font-medium text-chalk-dim'
          }
        >
          {live && <span className="size-1.5 rounded-full bg-live animate-live-pulse" />}
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
            <span className="min-w-0">
              {event.player?.slug ? (
                <a
                  href={`/jugadores/${event.player.slug}`}
                  className="font-medium hover:text-primary-ink hover:underline"
                >
                  {nombre}
                </a>
              ) : (
                <span className="font-medium">{nombre}</span>
              )}
              {event.kind === 'substitution' && related && (
                <span className="text-ink-muted">
                  {' ← '}
                  {event.relatedPlayer?.slug ? (
                    <a
                      href={`/jugadores/${event.relatedPlayer.slug}`}
                      className="hover:text-primary-ink hover:underline"
                    >
                      {related}
                    </a>
                  ) : (
                    related
                  )}
                </span>
              )}
              {ASISTIBLE.has(event.kind) && related && (
                <span className="text-ink-muted">
                  {' (asiste '}
                  {event.relatedPlayer?.slug ? (
                    <a
                      href={`/jugadores/${event.relatedPlayer.slug}`}
                      className="hover:text-primary-ink hover:underline"
                    >
                      {related}
                    </a>
                  ) : (
                    related
                  )}
                  {')'}
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
