import { useState } from 'react';

/*
 * Borrar el escenario está donde se carga —arriba del calendario— y también junto a la tabla: son
 * los dos lugares donde a alguien se le ocurre empezar de nuevo, y buscar el botón en el otro
 * extremo de la pantalla no es parte del juego.
 *
 * Pide confirmación porque borra trabajo, y lo pregunta con el número adelante: "¿borrar siete
 * pronósticos?" dice mucho más que "¿estás seguro?".
 */
interface Props {
  cuantos: number;
  onReiniciar: () => void;
  className?: string;
}

export default function Reiniciar({ cuantos, onReiniciar, className = '' }: Props) {
  const [confirmando, setConfirmando] = useState(false);
  const boton =
    'flex cursor-pointer items-center gap-1.5 rounded-lg border border-border px-2.5 py-1 text-2xs font-medium text-ink-muted transition-colors hover:bg-canvas-subtle hover:text-ink';

  if (cuantos === 0) return null;

  if (confirmando) {
    return (
      <span className={`flex flex-wrap items-center gap-1.5 ${className}`}>
        <span className="text-2xs text-ink-muted">
          ¿Borrar {cuantos} {cuantos === 1 ? 'pronóstico' : 'pronósticos'}?
        </span>
        <button
          type="button"
          onClick={() => {
            onReiniciar();
            setConfirmando(false);
          }}
          className="cursor-pointer rounded-lg bg-card-red px-2.5 py-1 text-2xs font-medium text-white transition-opacity hover:opacity-90"
        >
          Sí, borrar
        </button>
        <button type="button" onClick={() => setConfirmando(false)} className={boton}>
          No
        </button>
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setConfirmando(true)}
      aria-label="Reiniciar los pronósticos"
      title="Reiniciar los pronósticos"
      className={`${boton} ${className}`}
    >
      <svg
        viewBox="0 0 24 24"
        width="13"
        height="13"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        className="shrink-0"
      >
        <path d="M20 11a8 8 0 1 0-2.3 5.7M20 5v6h-6" />
      </svg>
      Reiniciar
    </button>
  );
}
