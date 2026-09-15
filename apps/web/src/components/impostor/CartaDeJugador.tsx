import type { Opcion } from '@athena/el-impostor';
import { apellidoDe, fotoDe } from '../../lib/impostor';

/**
 * Estado visual de la carta.
 *
 * `revelada` es el impostor cuando se falló o se acabó el tiempo: la respuesta se enciende sola y
 * las otras se apagan, así la vista va al único sitio que importa sin que nadie tenga que leer.
 */
export type EstadoDeCarta = 'jugando' | 'acertada' | 'errada' | 'revelada' | 'apagada';

interface Props {
  opcion: Opcion;
  /** Su lugar en el reparto: escalona la entrada sin una clase por posición. */
  turno: number;
  estado: EstadoDeCarta;
  onElegir: () => void;
}

const MARCO: Record<EstadoDeCarta, string> = {
  jugando:
    'border-border bg-surface hover:-translate-y-1 hover:border-primary-ink hover:shadow-magnet focus-visible:-translate-y-1',
  acertada: 'border-win bg-win/12 ring-2 ring-win',
  errada: 'border-card-red bg-card-red/12 ring-2 ring-card-red',
  revelada: 'border-win bg-win/12 ring-2 ring-win',
  apagada: 'border-border bg-surface',
};

export function CartaDeJugador({ opcion, turno, estado, onElegir }: Props) {
  const resuelta = estado !== 'jugando';

  return (
    <button
      type="button"
      data-carta={opcion.ref}
      data-apagada={estado === 'apagada'}
      disabled={resuelta}
      onClick={onElegir}
      style={{ '--turno': turno } as React.CSSProperties}
      className={`animate-impostor-reparte group relative flex flex-col items-center gap-2.5 rounded-xl border p-2.5 transition-[transform,border-color,box-shadow] duration-200 disabled:cursor-default sm:p-4 ${MARCO[estado]} ${estado === 'errada' ? 'animate-impostor-niega' : ''}`}
    >
      {/* El anillo del acierto: capa aparte y sin eventos, para que no se coma el clic siguiente. */}
      {estado === 'acertada' && (
        <span
          aria-hidden="true"
          className="animate-impostor-anillo pointer-events-none absolute inset-0 rounded-xl ring-2 ring-win"
        />
      )}

      <img
        src={fotoDe(opcion.ref)}
        alt=""
        aria-hidden="true"
        width="112"
        height="112"
        loading="eager"
        className="size-20 rounded-full bg-canvas-subtle object-cover ring-1 ring-border transition-transform duration-200 group-hover:scale-105 sm:size-28"
      />
      {/*
        Dos líneas y alto fijo: en un teléfono «Lewandowski» no entra de una, y cortarlo a
        «Lewandows…» esconde justo lo que hay que reconocer. El alto no cambia, así que las seis
        cartas siguen midiendo lo mismo.
      */}
      <span className="line-clamp-2 min-h-[2.4em] w-full text-center font-display text-sm font-semibold uppercase leading-tight tracking-label sm:min-h-0 sm:truncate sm:text-lg">
        {apellidoDe(opcion.nombre)}
      </span>
    </button>
  );
}
