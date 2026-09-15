import type { Opcion } from '@athena/sesenta-segundos';

export type EstadoDeOpcion = 'abierta' | 'acertada' | 'errada' | 'revelada' | 'apagada';

interface Props {
  opciones: Opcion[];
  /** Dos botones a todo el ancho en verdadero/falso: se contesta sin apuntar. */
  aLoAncho: boolean;
  estadoDe: (texto: string) => EstadoDeOpcion;
  onElegir: (texto: string) => void;
}

const MARCO: Record<EstadoDeOpcion, string> = {
  abierta:
    'border-border bg-surface hover:-translate-y-0.5 hover:border-primary-ink focus-visible:-translate-y-0.5',
  acertada: 'border-win bg-win/15 text-win-ink',
  errada: 'border-card-red bg-card-red/15 text-card-red-ink',
  revelada: 'border-win bg-win/15 text-win-ink',
  apagada: 'border-border bg-surface opacity-45',
};

export function Opciones({ opciones, aLoAncho, estadoDe, onElegir }: Props) {
  return (
    <div
      className={
        aLoAncho
          ? 'grid w-full gap-3 sm:grid-cols-2'
          : 'grid w-full gap-2.5 sm:grid-cols-2 sm:gap-3'
      }
    >
      {opciones.map((opcion, i) => {
        const estado = estadoDe(opcion.texto);
        return (
          <button
            key={opcion.texto}
            type="button"
            data-opcion={opcion.texto}
            data-estado={estado}
            disabled={estado !== 'abierta'}
            onClick={() => onElegir(opcion.texto)}
            style={{ '--turno': i } as React.CSSProperties}
            className={`animate-sesenta-opcion group flex items-center gap-3 rounded-xl border font-medium transition-[transform,border-color,background-color,opacity] duration-150 disabled:cursor-default ${MARCO[estado]} ${
              aLoAncho
                ? 'justify-center px-4 py-6 font-display text-2xl uppercase tracking-label'
                : 'px-3 py-2.5 text-left'
            }`}
          >
            {/*
              La cara de la opción: la foto del futbolista, el escudo del club o la bandera del
              país. La caja existe aunque la imagen no cargue, para que las cuatro midan igual y el
              hueco no diga nada. Decorativa: el nombre está al lado.
            */}
            {opcion.imagen && (
              <span className="grid size-11 shrink-0 place-items-center overflow-hidden rounded-lg bg-canvas-subtle sm:size-12">
                <img
                  src={opcion.imagen}
                  alt=""
                  aria-hidden="true"
                  width="48"
                  height="48"
                  className="size-full object-contain transition-transform duration-200 group-enabled:group-hover:scale-105"
                />
              </span>
            )}
            <span className={opcion.imagen ? 'min-w-0 flex-1' : undefined}>{opcion.texto}</span>
          </button>
        );
      })}
    </div>
  );
}
