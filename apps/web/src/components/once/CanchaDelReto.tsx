import { layout } from '@athena/domain';
import type { Acierto, Casillero } from '@athena/adivina-el-xi';
import { apellidoDe, fotoDe } from '../../lib/adivina';
import { MarcasDeCancha } from './MarcasDeCancha';

/**
 * El rótulo sale de la fila en la que se dibuja, no de la posición que el proveedor le pone al
 * futbolista.
 *
 * Con la posición del proveedor la cancha se leía mal: un volante que jugó abierto aparecía como
 * "Medio" por encima de un "Ataque", y el que viene sin posición se quedaba sin rótulo. La fila,
 * en cambio, es lo que el jugador está viendo: la de abajo es el arco, la de arriba el ataque y
 * todo lo del medio es medio.
 */
const rotuloDeFila = (fila: number, filas: number): string => {
  if (fila === 0) return 'Arquero';
  if (fila === filas - 1) return 'Ataque';
  if (fila === 1) return 'Defensa';
  return 'Medio';
};

interface Props {
  casilleros: Casillero[];
  formacion: string;
  aciertos: Acierto[];
  pistas: Record<string, string>;
  revelados: Map<string, { nombre: string; ref: string }>;
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
  const filas = new Set(ubicados.map((u) => u.row)).size;

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
        /* En teléfono la cancha cede alto para que el buscador entre en la misma pantalla. */
        'h-[min(48dvh,26rem)] w-auto max-w-full sm:h-[min(56dvh,30rem)] lg:h-[min(70dvh,38rem)]',
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
        {ubicados.map(({ player, x, y, row }) => {
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
                'group absolute flex w-[5rem] -translate-x-1/2 -translate-y-1/2 flex-col items-center text-center sm:w-[6rem]',
                'left-[var(--ancho)] top-[calc(100%-var(--largo))]',
                Casilla === 'button'
                  ? 'cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-ink'
                  : '',
              ].join(' ')}
            >
              {acierto || revelado ? (
                <Iman
                  nombre={(acierto ?? revelado)?.nombre ?? ''}
                  ref_={(acierto ?? revelado)?.ref ?? ''}
                  revelado={!acierto}
                />
              ) : (
                <Vacia rotulo={rotuloDeFila(row, filas)} pista={pista} apuntable={eligiendoPista} />
              )}
            </Casilla>
          );
        })}
      </div>
    </div>
  );
}

/* Quien se acertó cae como un imán sobre el tablero; quien se reveló al final llega apagado. */
function Iman({ nombre, ref_, revelado }: { nombre: string; ref_: string; revelado: boolean }) {
  return (
    <>
      <span
        className={[
          'relative grid size-12 place-items-center rounded-full border-2 bg-board sm:size-14',
          'animate-magnet-place shadow-magnet',
          revelado ? 'border-chalk/35 grayscale' : 'border-win',
        ].join(' ')}
      >
        {!revelado && (
          <span
            aria-hidden="true"
            className="animate-once-anillo pointer-events-none absolute -inset-1 rounded-full border-2 border-win"
          />
        )}
        <img
          src={fotoDe(ref_)}
          alt=""
          width="56"
          height="56"
          loading="lazy"
          className="size-full rounded-full object-cover"
        />
      </span>
      <span
        className={[
          'mt-1 w-max max-w-[6.5rem] truncate rounded bg-board/85 px-1.5 py-0.5 text-[13px] font-semibold leading-tight sm:text-sm',
          revelado ? 'text-chalk-dim' : 'text-chalk',
        ].join(' ')}
      >
        {apellidoDe(nombre)}
      </span>
    </>
  );
}

/* La casilla vacía es tiza: un círculo trazado, el puesto y, si se pidió, la letra. */
function Vacia({ rotulo, pista, apuntable }: { rotulo: string; pista?: string; apuntable: boolean }) {
  return (
    <>
      <span
        className={[
          'grid size-12 place-items-center rounded-full border-2 border-dashed bg-board/55 sm:size-14',
          'transition-[background-color,border-color] duration-200',
          apuntable
            ? 'border-card-yellow bg-card-yellow/20'
            : 'border-chalk/40 group-hover:border-chalk/60',
        ].join(' ')}
      >
        {pista ? (
          <span data-pista-letra className="font-display text-2xl font-semibold uppercase text-card-yellow">
            {pista}
          </span>
        ) : (
          <span className="font-display text-lg font-semibold text-chalk/35" aria-hidden="true">
            ?
          </span>
        )}
      </span>
      <span className="mt-1 w-max max-w-[5.5rem] truncate rounded bg-board/80 px-1.5 py-0.5 text-[10px] uppercase leading-tight tracking-label text-chalk-dim">
        {rotulo}
      </span>
    </>
  );
}
