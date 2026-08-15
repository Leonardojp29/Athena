import EventIcon from '../EventIcon';
import type { MatchEventView, MatchView, PlayerLink, TeamSummary } from '../../lib/api';
import { formatKickoff, statusLabel } from '../../lib/format';
import {
  minutoDeJugada,
  motivoDeTarjeta,
  relatoDelPartido,
  revisionDeVar,
  type Jugada,
} from '../../lib/relato';

/*
 * El minuto a minuto con eje central: el reloj por el medio y cada jugada del lado de su equipo.
 *
 * La lista plana anterior ponía al visitante con `flex-row-reverse`, así que el minuto se movía fila
 * a fila según el largo del nombre y no había ninguna columna que leer. Un eje es una grilla de
 * columnas fijas o no es un eje.
 *
 * Del eje cuelga lo mejor de la sección: **el marcador va corriendo por el medio**, así que el
 * partido se lee de arriba abajo —0-0, 1-0, 1-1— sin leer un solo nombre. Ese marcador solo aparece
 * si la suma de los goles reconstruye el resultado oficial; la regla vive en el dominio.
 *
 * El corte a una columna es por **tamaño del contenedor y no de la pantalla**: este mismo componente
 * vive en la columna de 20rem del panel de la copa, en monitores grandes.
 */
interface Props {
  match: MatchView;
  /** Ids que llegaron en este refresco: solo eso se anima, y solo en vivo. */
  nuevos?: Set<string>;
}

/* Un gol se asiste. El proveedor manda un "assist" en penales errados que suele ser el arquero. */
const ASISTIBLE = new Set(['goal', 'penalty_goal']);

function nombreDe(evento: MatchEventView): string {
  return evento.player?.name ?? evento.detail?.playerName ?? 'Sin dato';
}

function Nombre({
  jugador,
  respaldo,
  className,
  conFoto = true,
}: {
  jugador: PlayerLink | null;
  respaldo: string;
  className?: string;
  conFoto?: boolean;
}) {
  const nombre = jugador?.name ?? respaldo;
  const contenido = (
    <>
      {conFoto &&
        (jugador?.photoUrl ? (
          <img
            src={jugador.photoUrl}
            alt=""
            width={20}
            height={20}
            loading="lazy"
            className="size-5 shrink-0 rounded-full bg-canvas-subtle object-cover"
          />
        ) : (
          /* Una inicial y no un círculo vacío: el círculo se lee como "roto", la inicial como
             "no tenemos su foto". Es el 36% de los casos. */
          <span className="grid size-5 shrink-0 place-items-center rounded-full bg-canvas-subtle text-[9px] font-semibold text-ink-muted">
            {nombre.slice(0, 1)}
          </span>
        ))}
      <span className="truncate">{nombre}</span>
    </>
  );

  return jugador?.slug ? (
    <a
      href={`/jugadores/${jugador.slug}`}
      className={`inline-flex min-w-0 items-center gap-1.5 hover:text-primary-ink hover:underline ${className ?? ''}`}
    >
      {contenido}
    </a>
  ) : (
    <span className={`inline-flex min-w-0 items-center gap-1.5 ${className ?? ''}`}>{contenido}</span>
  );
}

/** Qué dice la jugada: quién arriba y por qué debajo. */
function Detalle({ jugada }: { jugada: Jugada<MatchEventView> }) {
  const { evento } = jugada;
  const nombre = nombreDe(evento);
  const relacionado = evento.relatedPlayer?.name ?? evento.detail?.relatedPlayerName ?? null;

  if (evento.kind === 'var') {
    return <p className="text-sm text-ink-muted">{revisionDeVar(evento.detail?.label)}</p>;
  }

  if (evento.kind === 'substitution') {
    return (
      <>
        {/* El proveedor manda al revés lo que sugieren sus nombres: `player` es el que sale. */}
        <Nombre jugador={evento.relatedPlayer} respaldo={relacionado ?? nombre} className="text-sm" />
        <p className="truncate text-2xs text-ink-muted">por {nombre}</p>
      </>
    );
  }

  const segunda =
    evento.kind === 'own_goal' ? (
      <span className="text-card-red-ink">en contra</span>
    ) : evento.kind === 'missed_penalty' ? (
      <span className="text-card-red-ink">penal errado</span>
    ) : evento.kind === 'penalty_goal' ? (
      'de penal'
    ) : jugada.dobleAmarilla ? (
      <>doble amarilla{motivoDeTarjeta(evento.detail?.comments) ? ` · ${motivoDeTarjeta(evento.detail?.comments)}` : ''}</>
    ) : evento.kind === 'yellow_card' || evento.kind === 'red_card' ? (
      motivoDeTarjeta(evento.detail?.comments)
    ) : ASISTIBLE.has(evento.kind) && relacionado ? (
      <>asiste {relacionado}</>
    ) : null;

  return (
    <>
      <Nombre
        jugador={evento.player}
        respaldo={nombre}
        className={evento.kind === 'yellow_card' ? 'text-sm' : 'text-sm font-medium'}
      />
      {segunda && <p className="truncate text-2xs text-ink-muted">{segunda}</p>}
    </>
  );
}

export default function MinutoAMinuto({ match, nuevos }: Props) {
  const filas = relatoDelPartido(match);
  const enJuego = match.status === 'in_play' || match.status === 'paused';

  if (match.events.length === 0) {
    return (
      <p className="text-sm text-ink-muted">
        {match.status === 'scheduled'
          ? `El minuto a minuto arranca a las ${formatKickoff(match.kickoffUtc)}.`
          : enJuego
            ? 'El partido arrancó. Todavía no pasó nada.'
            : match.status === 'finished' && match.homeScore !== null
              ? `Terminó ${match.homeScore}–${match.awayScore}, pero el proveedor no publicó las jugadas.`
              : match.status === 'finished'
                ? 'No tenemos el minuto a minuto de este partido.'
                : `${statusLabel(match.status)}: no hay jugadas registradas.`}
      </p>
    );
  }

  const ultima = filas.findLast((f) => f.clase === 'jugada');

  return (
    <div className="@container">
      <ol className="grid">
        {filas.map((fila, i) =>
          fila.clase === 'banda' ? (
            <li
              key={`banda-${i}`}
              className="my-1.5 flex items-center gap-2 text-2xs font-semibold uppercase tracking-label text-ink-muted"
            >
              <span className="h-px flex-1 bg-border" aria-hidden="true" />
              <EventIcon kind="silbato" size={12} />
              {fila.titulo}
              {fila.marcador && (
                <span className="font-display tabular text-ink">
                  {fila.marcador.local}–{fila.marcador.visita}
                </span>
              )}
              <span className="h-px flex-1 bg-border" aria-hidden="true" />
            </li>
          ) : (
            <li
              key={fila.evento.id}
              className={`grid grid-cols-[2.5rem_1.25rem_0.875rem_minmax(0,1fr)] items-stretch gap-x-2 py-1 @lg:grid-cols-[minmax(0,1fr)_1.25rem_3.5rem_1.25rem_minmax(0,1fr)] ${
                nuevos?.has(fila.evento.id)
                  ? fila.evento.kind === 'goal' || fila.evento.kind === 'penalty_goal'
                    ? 'animate-goal-pulse rounded-md'
                    : 'animate-group-enter'
                  : ''
              }`}
            >
              {/* El eje: dos tramos de línea con el reloj en el medio, dibujado por fila. Así la
                  línea se corta sola en las bandas y nunca se pasa de la última jugada. */}
              <span className="col-start-1 row-start-1 flex flex-col items-center @lg:col-start-3">
                {fila.abreMinuto ? (
                  <span className="font-display text-2xs leading-5 text-ink-muted">
                    {minutoDeJugada(fila.evento)}
                  </span>
                ) : (
                  <span
                    className={`my-2 size-1.5 shrink-0 rounded-full ${
                      enJuego && fila === ultima ? 'animate-live-pulse bg-live' : 'bg-border-strong'
                    }`}
                    aria-hidden="true"
                  />
                )}
                {fila.marcador && (
                  <span className="font-display text-2xs font-semibold leading-none tabular">
                    <span className={fila.local ? 'text-primary-ink' : ''}>{fila.marcador.local}</span>
                    <span className="text-ink-muted">–</span>
                    <span className={fila.local ? '' : 'text-primary-ink'}>{fila.marcador.visita}</span>
                  </span>
                )}
                {/* La línea cuelga del reloj y llega hasta la fila siguiente: así el eje se lee
                    continuo y se corta solo en las bandas y después de la última jugada. */}
                <span className="mt-1 w-px flex-1 bg-border" aria-hidden="true" />
              </span>

              <span
                className={`col-start-2 row-start-1 flex items-start justify-center ${
                  fila.local ? '@lg:col-start-2' : '@lg:col-start-4'
                }`}
              >
                <EventIcon kind={fila.dobleAmarilla ? 'second_yellow' : fila.evento.kind} size={16} />
              </span>

              {/* El escudo solo existe en la columna angosta: ahí el lado ya no dice de quién es. */}
              <span className="col-start-3 row-start-1 flex items-start pt-1.5 @lg:hidden">
                {(fila.local ? match.homeTeam : match.awayTeam).logoUrl && (
                  <img
                    src={(fila.local ? match.homeTeam : match.awayTeam).logoUrl ?? ''}
                    alt={(fila.local ? match.homeTeam : match.awayTeam).shortName ?? ''}
                    width={14}
                    height={14}
                    loading="lazy"
                    className="size-3.5 object-contain"
                  />
                )}
              </span>

              <span
                className={`col-start-4 row-start-1 grid min-w-0 content-start gap-0.5 ${
                  fila.local
                    ? '@lg:col-start-1 @lg:justify-items-end @lg:text-right'
                    : '@lg:col-start-5'
                }`}
              >
                <span className="sr-only">
                  {fila.evento.minute < 0 ? 'minuto sin confirmar' : `minuto ${minutoDeJugada(fila.evento)}`}
                </span>
                <Detalle jugada={fila} />
              </span>
            </li>
          ),
        )}
      </ol>

      {/* En vivo el eje sigue punteado después de la última jugada: esto no terminó. */}
      {enJuego && (
        <span
          className="ml-[1.25rem] block h-5 w-px border-l border-dashed border-border @lg:ml-0 @lg:translate-x-[calc(50%-0.5px)]"
          aria-hidden="true"
        />
      )}
    </div>
  );
}

/** Los equipos del eje, como leyenda: qué lado es cuál. */
export function CabeceraDelRelato({ homeTeam, awayTeam }: { homeTeam: TeamSummary; awayTeam: TeamSummary }) {
  return (
    <div className="mb-3 flex items-center justify-between gap-3">
      {[homeTeam, awayTeam].map((equipo, i) => (
        <span
          key={equipo.id}
          className={`flex min-w-0 items-center gap-2 ${i === 1 ? 'flex-row-reverse' : ''}`}
        >
          {equipo.logoUrl && <img src={equipo.logoUrl} alt="" width="18" height="18" className="size-[18px]" />}
          <span className="truncate text-sm font-medium">{equipo.shortName ?? equipo.name}</span>
        </span>
      ))}
    </div>
  );
}
