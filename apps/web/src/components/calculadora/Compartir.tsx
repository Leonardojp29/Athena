import { useState } from 'react';

/*
 * El escenario ya vive en la URL, así que compartir es copiar lo que hay. No se arma nada ni se
 * guarda nada en el servidor: el enlace vale para siempre y no nos cuesta una fila en la base.
 */
interface Props {
  codigo: string;
  cuantos: number;
  onReiniciar: () => void;
}

export default function Compartir({ codigo, cuantos, onReiniciar }: Props) {
  const [copiado, setCopiado] = useState(false);
  const [confirmando, setConfirmando] = useState(false);

  const enlace = () => (typeof window === 'undefined' ? '' : window.location.href);

  const copiar = () => {
    void navigator.clipboard
      .writeText(enlace())
      .then(() => {
        setCopiado(true);
        window.setTimeout(() => setCopiado(false), 2000);
      })
      .catch(() => undefined);
  };

  const boton =
    'cursor-pointer rounded-lg border border-border-strong px-3 py-1.5 text-xs font-medium transition-colors hover:bg-canvas-subtle disabled:cursor-not-allowed disabled:opacity-40';

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-2xs text-ink-muted">
        {cuantos === 0
          ? 'Sin pronósticos: la tabla de hoy'
          : `${cuantos} ${cuantos === 1 ? 'partido puesto' : 'partidos puestos'}`}
      </span>

      <button type="button" onClick={copiar} disabled={codigo === ''} className={boton}>
        {copiado ? 'Copiado' : 'Copiar enlace'}
      </button>

      <a
        href={`https://wa.me/?text=${encodeURIComponent(enlace())}`}
        target="_blank"
        rel="noopener noreferrer"
        aria-disabled={codigo === ''}
        className={`${boton} ${codigo === '' ? 'pointer-events-none opacity-40' : ''}`}
      >
        WhatsApp
      </a>

      {confirmando ? (
        <span className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => {
              onReiniciar();
              setConfirmando(false);
            }}
            className="cursor-pointer rounded-lg bg-card-red px-3 py-1.5 text-xs font-medium text-white transition-opacity hover:opacity-90"
          >
            Borrar todo
          </button>
          <button type="button" onClick={() => setConfirmando(false)} className={boton}>
            Cancelar
          </button>
        </span>
      ) : (
        <button
          type="button"
          onClick={() => setConfirmando(true)}
          disabled={codigo === ''}
          className={boton}
        >
          Reiniciar
        </button>
      )}
    </div>
  );
}
