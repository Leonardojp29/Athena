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
            className={`animate-sesenta-opcion rounded-xl border px-4 font-medium transition-[transform,border-color,background-color,opacity] duration-150 disabled:cursor-default ${MARCO[estado]} ${
              aLoAncho ? 'py-6 text-center font-display text-2xl uppercase tracking-label' : 'py-3.5 text-left'
            }`}
          >
            {opcion.texto}
          </button>
        );
      })}
    </div>
  );
}
