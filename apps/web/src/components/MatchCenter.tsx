import { useEffect, useRef, useState } from 'react';
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';
import MinutoAMinuto from './match/MinutoAMinuto';
import type { MatchView } from '../lib/api';
import { formatKickoff, isLive, minutoEnVivo, statusLabel } from '../lib/format';

/*
 * El marcador de la cabecera y el minuto a minuto. Es un solo componente y una sola consulta: dos
 * islas separadas significarían dos pollers golpeando el API cada veinte segundos.
 *
 * El relato vive en `match/MinutoAMinuto`, que es puro y no sabe de consultas; acá queda el
 * marcador y la plomería del vivo.
 *
 * Sin `client:*` Astro lo renderiza en el servidor y la página queda en 0 KB; solo los partidos en
 * juego se hidratan.
 */

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
            {live
              ? minutoEnVivo(match.status, match.elapsedMinutes, match.statusDetail)
              : statusLabel(match.status)}
          </span>
        </span>
      </div>

      <TeamSide match={match} side="away" />
    </div>
  );
}

interface Props {
  initial: MatchView;
  live: boolean;
  /** `hero` es el marcador a sangre; `timeline` es el minuto a minuto de la pestaña. */
  part: 'hero' | 'timeline';
}

function Render({ match, part }: { match: MatchView; part: Props['part'] }) {
  return part === 'hero' ? <Scoreboard match={match} /> : <MinutoAMinuto match={match} />;
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

/*
 * En el navegador, uno solo para las dos islas; en el servidor, uno nuevo por render.
 *
 * Un cliente a nivel de módulo se compartía **entre todas las peticiones** del proceso web, que es
 * uno y de larga vida. Desde el segundo render de un mismo partido, react-query devolvía la query
 * que ya existía e ignoraba `initialData` —y en el servidor el `gcTime` es infinito, así que esa
 * entrada no caducaba nunca—. Consecuencias medidas: el HTML de un partido en vivo se quedaba
 * clavado en el marcador y el minuto del primer render hasta reiniciar el proceso, mientras las
 * props del island viajaban frescas; al hidratar, los dos textos no coincidían y React tiraba el
 * error 418.
 */
let clienteDelNavegador: QueryClient | null = null;

function clienteDeConsultas(): QueryClient {
  if (typeof window === 'undefined') return new QueryClient();
  clienteDelNavegador ??= new QueryClient();
  return clienteDelNavegador;
}

export default function MatchCenter({ initial, live, part }: Props) {
  /* Sin vivo no hay isla que hidratar ni cliente que crear: el servidor pinta y se acabó. */
  if (!live) return <Render match={initial} part={part} />;
  return <EnVivo initial={initial} part={part} />;
}

function EnVivo({ initial, part }: { initial: MatchView; part: Props['part'] }) {
  const [cliente] = useState(clienteDeConsultas);
  return (
    <QueryClientProvider client={cliente}>
      <LiveMatch initial={initial} part={part} />
    </QueryClientProvider>
  );
}
