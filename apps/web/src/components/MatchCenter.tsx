import { useEffect, useRef, useState } from 'react';
import { QueryClient, QueryClientProvider, useQuery, useQueryClient } from '@tanstack/react-query';
import EventIcon from './EventIcon';
import MinutoAMinuto from './match/MinutoAMinuto';
import type { MarcadorDePartido, Marcadores, MatchEventView, MatchView } from '../lib/api';
import { API_URL } from '../lib/entorno';
import { formatKickoff, isLive, minutoEnVivo, statusLabel } from '../lib/format';
import { goleadoresDelPartido, type Goleador } from '../lib/relato';

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
      className="group flex min-w-0 flex-col items-center gap-2 text-center sm:gap-2.5"
    >
      {team.logoUrl && (
        <img
          src={team.logoUrl}
          alt=""
          width={80}
          height={80}
          className="size-12 transition-transform group-hover:scale-105 sm:size-14 lg:size-16"
        />
      )}
      {/* Dos renglones reservados y centrados: en el teléfono "Juan Pablo II College" ocupa dos
          líneas y "Cusco" una, y sin caja fija la cabecera medía distinto según el rival. */}
      <span className="grid h-[2.3em] items-center font-display text-base font-semibold uppercase leading-[1.15] text-chalk group-hover:text-primary sm:text-lg lg:h-[1.15em] lg:text-xl">
        <span className="line-clamp-2 lg:truncate">{team.name}</span>
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

/**
 * Los goles de un equipo, debajo de su escudo.
 *
 * Una línea por goleador y no por gol: los minutos de quien hizo dos van juntos —"Yótun 45+2', 82'"—,
 * que es como se escribe en fútbol. La caja tiene **alto fijo de tres renglones y siempre está**,
 * aunque el partido vaya 0-0: es lo que hace que la cabecera de un 5-0 mida lo mismo que la de un
 * 0-0. Lo que no entra en tres renglones no se recorta ni se esconde detrás de un "+2": arma una
 * segunda columna al lado, porque un gol que no se ve es un gol que falta.
 */
function Goles({ goleadores }: { goleadores: Array<Goleador<MatchEventView>> }) {
  return (
    <ul
      /* Centrada bajo el escudo, como el nombre: pegada al borde de la columna se leía como si
         fuera del marcador y no del equipo. */
      className="flex h-[3.75rem] flex-col flex-wrap content-center items-start gap-x-5 overflow-hidden text-xs leading-5 text-chalk-dim"
    >
      {goleadores.map((goleador) => {
        const enContra = goleador.goles.some((g) => g.enContra);
        const minutos = goleador.goles
          .map((g) => `${g.minuto}${g.extra ? `+${g.extra}` : ''}'${g.penal ? ' (p)' : ''}`)
          .join(', ');
        const apellido = goleador.nombre.split(' ').at(-1) ?? goleador.nombre;
        const jugador = goleador.evento.player;

        return (
          <li key={goleador.evento.id} className="flex max-w-full items-center gap-2">
            <EventIcon kind={enContra ? 'own_goal' : 'goal'} size={13} detail={apellido} />
            {jugador?.slug ? (
              <a href={`/jugadores/${jugador.slug}`} className="truncate text-chalk hover:text-primary">
                {apellido}
              </a>
            ) : (
              <span className="truncate text-chalk">{apellido}</span>
            )}
            <span className="shrink-0 tabular">{minutos}</span>
            {enContra && <span className="shrink-0">(e/c)</span>}
          </li>
        );
      })}
    </ul>
  );
}

function Scoreboard({ match }: { match: MatchView }) {
  const live = isLive(match.status);
  const hasScore = match.homeScore !== null && match.awayScore !== null;
  const goles = goleadoresDelPartido(match);

  return (
    <div className="grid grid-cols-[1fr_auto_1fr] items-start gap-3 py-3 sm:gap-10 sm:py-3.5">
      <div className="grid min-w-0 gap-2.5">
        <TeamSide match={match} side="home" />
        <Goles goleadores={goles.local} />
      </div>

      <div className="flex flex-col items-center gap-2">
        {hasScore ? (
          <span
            className="font-display font-semibold tabular leading-none text-chalk"
            /* el mismo nombre que la fila del listado: el marcador se transforma, no se corta */
            /* Más chico que el token de marcador: el hero completo tiene que entrar en 1080p. */
            style={{
              fontSize: 'clamp(2.5rem, 4.4vw, 3.75rem)',
              viewTransitionName: `marcador-${match.id}`,
            }}
            data-marcador
          >
            <Cifra valor={match.homeScore as number} /> – <Cifra valor={match.awayScore as number} />
          </span>
        ) : (
          <span className="font-display text-2xl font-semibold tabular text-chalk sm:text-4xl">
            {formatKickoff(match.kickoffUtc)}
          </span>
        )}

        <span
          className={
            live
              ? 'flex items-center gap-1.5 rounded-full bg-live-board/16 px-3 py-1 text-xs font-medium text-live-board'
              : /* Sobre el parche de tiza al 10%, la tiza apagada se queda en 4.1. */
                'rounded-full bg-chalk/10 px-3 py-1 text-xs font-medium text-chalk'
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

      <div className="grid min-w-0 gap-2.5">
        <TeamSide match={match} side="away" />
        <Goles goleadores={goles.visita} />
      </div>
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

const CADA_MARCADOR_MS = 15_000;
const CADA_VISTA_COMPLETA_MS = 60_000;

function useMarcadorEnVivo(matchId: string, activo: boolean): MarcadorDePartido | null {
  const { data } = useQuery({
    queryKey: ['marcadores'],
    queryFn: async (): Promise<Marcadores> => {
      const res = await fetch('/marcadores.json');
      if (!res.ok) throw new Error(`marcadores fetch ${res.status}`);
      return res.json();
    },
    enabled: activo,
    refetchInterval: activo ? CADA_MARCADOR_MS : false,
    refetchOnWindowFocus: activo,
  });

  return data?.partidos.find((p) => p.id === matchId) ?? null;
}

function LiveMatch({ initial, part }: { initial: MatchView; part: Props['part'] }) {
  /*
   * Solo el hero mantiene los temporizadores. El minuto a minuto es otra isla del mismo bundle,
   * así que comparte este QueryClient y se vuelve a pintar cuando la caché cambia.
   */
  const poll = part === 'hero';
  const cliente = useQueryClient();

  const { data } = useQuery({
    queryKey: ['match', initial.id],
    queryFn: async (): Promise<MatchView> => {
      const res = await fetch(
        `${API_URL}/v1/views/match/${initial.id}`,
      );
      if (!res.ok) throw new Error(`match fetch ${res.status}`);
      return res.json();
    },
    initialData: initial,
    refetchInterval: poll
      ? (query) => {
          const status = query.state.data?.status ?? initial.status;
          return isLive(status) || status === 'scheduled' ? CADA_VISTA_COMPLETA_MS : false;
        }
      : false,
    refetchOnWindowFocus: poll,
    refetchOnMount: poll,
  });

  const marcador = useMarcadorEnVivo(initial.id, poll);

  /* Un cambio en el marcador liviano es la señal de que los goles y las notas ya cambiaron. */
  useEffect(() => {
    if (marcador) void cliente.invalidateQueries({ queryKey: ['match', initial.id] });
  }, [cliente, initial.id, marcador?.actualizadoEn]);

  const completa = data ?? initial;
  const match: MatchView = marcador
    ? {
        ...completa,
        status: marcador.status,
        statusDetail: marcador.statusDetail,
        elapsedMinutes: marcador.elapsedMinutes,
        homeScore: marcador.homeScore,
        awayScore: marcador.awayScore,
      }
    : completa;

  return <Render match={match} part={part} />;
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
