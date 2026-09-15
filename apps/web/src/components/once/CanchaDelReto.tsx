import { layout } from '@athena/domain';
import type { Acierto, Casillero } from '@athena/adivina-el-xi';
import { apellidoDe } from '../../lib/adivina';
import { MarcasDeCancha } from './MarcasDeCancha';

/* Los puestos del proveedor, ya en español, para rotular la casilla sin delatar quién la ocupó. */
const ROTULO: Record<string, string> = {
  arquero: 'Arquero',
  defensor: 'Defensa',
  mediocampista: 'Medio',
  delantero: 'Ataque',
};

interface Props {
  casilleros: Casillero[];
  formacion: string;
  aciertos: Acierto[];
  pistas: Record<string, string>;
  revelados: Map<string, { nombre: string; fotoUrl: string | null }>;
  /** Al pedir una pista, el casillero deja de ser decorado y se vuelve elegible. */
  eligiendoPista: boolean;
  onElegirCasilla: (grid: string) => void;
}

export function CanchaDelReto({
  casilleros,
  formacion,
  aciertos,
  pistas,
  revelados,
  eligiendoPista,
  onElegirCasilla,
}: Props) {
  const ubicados =
    layout(
      casilleros.map((c) => ({ ...c, grid: c.grid })),
      { formation: formacion },
    ) ?? [];

  const porGrid = new Map(aciertos.map((a) => [a.grid, a]));

  return (
    <div
      data-cancha-once
      /*
       * Siempre parada. Es como se mira un once —el arco propio abajo y el ataque arriba— y en
       * escritorio manda el alto disponible, así el juego entra en una pantalla sin desplazarse.
       */
      /* El alto manda y el ancho lo sigue: así la cancha y sus controles entran en una pantalla. */
      className={[
        'relative mx-auto aspect-[680/1000] overflow-hidden rounded-lg border border-board-edge',
        'h-[min(58dvh,30rem)] w-auto max-w-full',
      ].join(' ')}
    >
      <svg
        viewBox="0 0 680 1050"
        preserveAspectRatio="none"
        aria-hidden="true"
        focusable="false"
        className="absolute inset-0 h-full w-full"
      >
        <g transform="translate(680, 0) rotate(90)">
          <MarcasDeCancha />
        </g>
      </svg>

      {/*
        La capa de casillas no llega al filo de abajo: el rótulo del arquero cuelga por debajo de su
        aro y contra la línea de gol quedaba cortado. Los once suben lo mismo, así que la figura no
        se deforma.
      */}
      <div className="absolute inset-x-0 top-0 bottom-7">
        {ubicados.map(({ player, x, y }) => {
          const acierto = porGrid.get(player.grid);
          const revelado = acierto ? null : revelados.get(player.grid);
          const pista = pistas[player.grid];
          const Casilla = eligiendoPista && !acierto && !revelado ? 'button' : 'div';

          return (
            <Casilla
              key={player.grid}
              type={Casilla === 'button' ? 'button' : undefined}
              data-casillero={player.grid}
              data-resuelto={acierto ? '' : undefined}
              onClick={Casilla === 'button' ? () => onElegirCasilla(player.grid) : undefined}
              /* El largo crece hacia el arco rival, que acá está arriba: por eso se resta del 100%. */
              style={{ '--largo': `${y}%`, '--ancho': `${x}%` } as React.CSSProperties}
              className={[
                'group absolute flex w-[4.25rem] -translate-x-1/2 -translate-y-1/2 flex-col items-center text-center sm:w-[5rem]',
                'left-[var(--ancho)] top-[calc(100%-var(--largo))]',
                Casilla === 'button'
                  ? 'cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-ink'
                  : '',
              ].join(' ')}
            >
              {acierto || revelado ? (
                <Iman
                  nombre={(acierto ?? revelado)?.nombre ?? ''}
                  fotoUrl={(acierto ?? revelado)?.fotoUrl ?? null}
                  revelado={!acierto}
                />
              ) : (
                <Vacia rotulo={ROTULO[player.puesto ?? ''] ?? null} pista={pista} apuntable={eligiendoPista} />
              )}
            </Casilla>
          );
        })}
      </div>
    </div>
  );
}

/* Quien se acertó cae como un imán sobre el tablero; quien se reveló al final llega apagado. */
function Iman({ nombre, fotoUrl, revelado }: { nombre: string; fotoUrl: string | null; revelado: boolean }) {
  return (
    <>
      <span
        className={[
          'relative grid size-10 place-items-center rounded-full border-2 bg-board sm:size-11',
          'animate-magnet-place shadow-magnet',
          revelado ? 'border-chalk/35 grayscale' : 'border-win',
        ].join(' ')}
      >
        {fotoUrl ? (
          <img src={fotoUrl} alt="" width="44" height="44" loading="lazy" className="size-full rounded-full object-cover" />
        ) : (
          <span className="font-display text-sm font-semibold text-chalk">
            {apellidoDe(nombre).slice(0, 2).toUpperCase()}
          </span>
        )}
      </span>
      <span
        className={[
          'mt-1 w-max max-w-[5.5rem] truncate rounded bg-board/85 px-1 py-0.5 text-[11px] font-medium leading-tight',
          revelado ? 'text-chalk-dim' : 'text-chalk',
        ].join(' ')}
      >
        {apellidoDe(nombre)}
      </span>
    </>
  );
}

/* La casilla vacía es tiza: un círculo trazado, el puesto y, si se pidió, la letra. */
function Vacia({ rotulo, pista, apuntable }: { rotulo: string | null; pista?: string; apuntable: boolean }) {
  return (
    <>
      <span
        className={[
          'grid size-11 place-items-center rounded-full border-2 border-dashed bg-board/55 sm:size-12',
          'transition-[background-color,border-color] duration-200',
          apuntable
            ? 'border-card-yellow bg-card-yellow/20'
            : 'border-chalk/40 group-hover:border-chalk/60',
        ].join(' ')}
      >
        {pista ? (
          <span data-pista-letra className="font-display text-xl font-semibold uppercase text-card-yellow">
            {pista}
          </span>
        ) : (
          <span className="font-display text-base font-semibold text-chalk/35" aria-hidden="true">
            ?
          </span>
        )}
      </span>
      {rotulo && (
        <span className="mt-1 w-max max-w-[5.5rem] truncate rounded bg-board/80 px-1.5 py-0.5 text-[10px] uppercase leading-tight tracking-label text-chalk-dim">
          {rotulo}
        </span>
      )}
    </>
  );
}
