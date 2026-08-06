import EventIcon from './EventIcon';
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';
import type { MatchEventView, MatchView } from '../lib/api';
import { formatDateLong, formatKickoff, isLive, statusLabel } from '../lib/format';

function playerName(event: MatchEventView): string {
  return event.player?.name ?? event.detail?.playerName ?? '';
}

function relatedName(event: MatchEventView): string | null {
  return event.relatedPlayer?.name ?? event.detail?.relatedPlayerName ?? null;
}

function Scoreboard({ match }: { match: MatchView }) {
  const live = isLive(match.status);
  const hasScore = match.homeScore !== null && match.awayScore !== null;

  return (
    <section className="bg-surface border border-border rounded-lg p-4">
      <p className="text-center text-xs text-ink-muted mb-4">{formatDateLong(match.kickoffUtc)}</p>
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4">
        <a
          href={`/equipos/${match.homeTeam.slug}`}
          className="flex flex-col items-center gap-2 hover:text-primary-ink transition-colors"
        >
          {match.homeTeam.logoUrl && (
            <img src={match.homeTeam.logoUrl} alt="" width={56} height={56} />
          )}
          <span className="font-semibold text-center">{match.homeTeam.name}</span>
        </a>

        <div className="flex flex-col items-center">
          {hasScore ? (
            <span className="font-display text-score font-semibold tabular">
              {match.homeScore} – {match.awayScore}
            </span>
          ) : (
            <span className="text-2xl font-semibold tabular">
              {formatKickoff(match.kickoffUtc)}
            </span>
          )}
          <span className={`text-sm mt-1 ${live ? 'text-live font-medium' : 'text-ink-muted'}`}>
            {live && match.elapsedMinutes !== null
              ? `${match.elapsedMinutes}'`
              : statusLabel(match.status)}
            {live && (
              <span className="ml-1 inline-block w-1.5 h-1.5 rounded-full bg-live animate-pulse align-middle" />
            )}
          </span>
        </div>

        <a
          href={`/equipos/${match.awayTeam.slug}`}
          className="flex flex-col items-center gap-2 hover:text-primary-ink transition-colors"
        >
          {match.awayTeam.logoUrl && (
            <img src={match.awayTeam.logoUrl} alt="" width={56} height={56} />
          )}
          <span className="font-semibold text-center">{match.awayTeam.name}</span>
        </a>
      </div>
    </section>
  );
}

function Timeline({ match }: { match: MatchView }) {
  if (match.events.length === 0) return null;
  return (
    <section className="bg-surface border border-border rounded-lg p-4 mt-4">
      <h2 className="text-base font-semibold mb-3">Eventos del partido</h2>
      <ol className="grid gap-1">
        {match.events.map((event) => {
          const home = event.team.id === match.homeTeam.id;
          const related = relatedName(event);
          return (
            <li
              key={event.id}
              className={`flex items-center gap-2 text-sm py-1 ${home ? '' : 'flex-row-reverse text-right'}`}
            >
              <span className="tabular text-ink-muted w-10 shrink-0">
                {event.minute}
                {event.extraMinute ? `+${event.extraMinute}` : ''}'
              </span>
              <EventIcon
                kind={event.kind}
                detail={`${event.player?.name ?? ''} ${event.minute}'`}
              />
              <span className="min-w-0">
                <span className="font-medium">{playerName(event)}</span>
                {event.kind === 'substitution' && related && (
                  <span className="text-ink-muted"> {related}</span>
                )}
                {event.kind !== 'substitution' && related && (
                  <span className="text-ink-muted"> (asiste {related})</span>
                )}
              </span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

function LiveMatch({ initial }: { initial: MatchView }) {
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
    refetchInterval: (query) => {
      const status = query.state.data?.status ?? initial.status;
      return isLive(status) || status === 'scheduled' ? 20_000 : false;
    },
    refetchOnWindowFocus: true,
  });

  const match = data ?? initial;
  return (
    <>
      <Scoreboard match={match} />
      <Timeline match={match} />
    </>
  );
}

const queryClient = new QueryClient();

export default function MatchCenter({ initial, live }: { initial: MatchView; live: boolean }) {
  if (!live) {
    return (
      <>
        <Scoreboard match={initial} />
        <Timeline match={initial} />
      </>
    );
  }
  return (
    <QueryClientProvider client={queryClient}>
      <LiveMatch initial={initial} />
    </QueryClientProvider>
  );
}
