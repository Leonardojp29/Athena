import { useEffect, useRef } from 'react';

/**
 * El diálogo de confirmación del juego.
 *
 * Reemplaza al `window.confirm` del navegador, que aparecía con la tipografía del sistema, los
 * botones del sistema y el "localhost:4321 dice" arriba: rompía el mundo del juego justo en el
 * momento en que hay que decidir algo que no se puede deshacer.
 *
 * Vive en el mismo lenguaje que la celebración —fondo del tablero, foco atrapado, Escape cancela— y
 * arranca con el foco en cancelar a propósito: la acción destructiva no se dispara con un Enter
 * distraído.
 */
export default function Confirmar({
  titulo,
  texto,
  confirmar,
  cancelar = 'Cancelar',
  onConfirmar,
  onCancelar,
}: {
  titulo: string;
  texto: string;
  confirmar: string;
  cancelar?: string;
  onConfirmar: () => void;
  onCancelar: () => void;
}) {
  const cancelarRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    cancelarRef.current?.focus();
    const alTeclear = (evento: KeyboardEvent) => {
      if (evento.key !== 'Escape') return;
      evento.preventDefault();
      onCancelar();
    };
    window.addEventListener('keydown', alTeclear);
    return () => window.removeEventListener('keydown', alTeclear);
  }, [onCancelar]);

  return (
    <div
      data-confirmar
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirmar-titulo"
      onClick={onCancelar}
      className="fixed inset-0 z-50 grid place-items-center px-6 backdrop-blur-sm duration-200 animate-in fade-in"
      style={{ background: 'oklch(0.13 0.012 285 / 0.86)' }}
    >
      <div
        onClick={(evento) => evento.stopPropagation()}
        className="w-full max-w-md rounded-2xl border border-border-strong bg-surface p-5 text-left shadow-magnet duration-200 animate-in zoom-in-95"
      >
        <h2
          id="confirmar-titulo"
          className="font-display text-xl font-semibold uppercase leading-tight tracking-label text-ink"
        >
          {titulo}
        </h2>
        <p className="mt-2 text-sm leading-snug text-ink-muted">{texto}</p>

        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row">
          <button
            ref={cancelarRef}
            type="button"
            onClick={onCancelar}
            className="flex-1 cursor-pointer whitespace-nowrap rounded-lg border border-border-strong px-4 py-2.5 font-display text-sm font-semibold uppercase tracking-label transition-colors duration-200 hover:bg-canvas-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-ink"
          >
            {cancelar}
          </button>
          <button
            type="button"
            data-confirmar-si
            onClick={onConfirmar}
            className="flex-1 cursor-pointer whitespace-nowrap rounded-lg bg-card-red px-4 py-2.5 font-display text-sm font-semibold uppercase tracking-label text-white transition-opacity duration-200 hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-ink"
          >
            {confirmar}
          </button>
        </div>
      </div>
    </div>
  );
}
