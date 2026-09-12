import { useState } from 'react';

/*
 * Los tres gestos que no son poner un marcador.
 *
 * **Con predicciones** apaga el escenario sin borrarlo: sirve para comparar contra la tabla de hoy
 * y volver. **Streamer** deja la tabla sola y sin probabilidades, que es lo que se comparte en una
 * transmisión o en una captura. **Reiniciar** pide confirmación porque borra trabajo.
 */
interface Props {
  codigo: string;
  cuantos: number;
  conPredicciones: boolean;
  streamer: boolean;
  onConPredicciones: () => void;
  onStreamer: () => void;
  onReiniciar: () => void;
}

const BOTON =
  'flex cursor-pointer items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-2xs font-medium text-ink-muted transition-colors hover:bg-canvas-subtle hover:text-ink disabled:cursor-not-allowed disabled:opacity-40 aria-[pressed=true]:border-primary aria-[pressed=true]:bg-primary/10 aria-[pressed=true]:text-ink';

export default function Controles({
  codigo,
  cuantos,
  conPredicciones,
  streamer,
  onConPredicciones,
  onStreamer,
  onReiniciar,
}: Props) {
  const [copiado, setCopiado] = useState(false);
  const [confirmando, setConfirmando] = useState(false);
  const vacio = codigo === '';

  const copiar = () => {
    void navigator.clipboard
      .writeText(window.location.href)
      .then(() => {
        setCopiado(true);
        window.setTimeout(() => setCopiado(false), 2000);
      })
      .catch(() => undefined);
  };

  if (confirmando) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-2xs text-ink-muted">
          ¿Borrar {cuantos} {cuantos === 1 ? 'pronóstico' : 'pronósticos'}?
        </span>
        <button
          type="button"
          onClick={() => {
            onReiniciar();
            setConfirmando(false);
          }}
          className="cursor-pointer rounded-lg bg-card-red px-2.5 py-1.5 text-2xs font-medium text-white transition-opacity hover:opacity-90"
        >
          Borrar todo
        </button>
        <button type="button" onClick={() => setConfirmando(false)} className={BOTON}>
          Cancelar
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <button
        type="button"
        onClick={onStreamer}
        aria-pressed={streamer}
        title="Deja la tabla sola, sin controles ni probabilidades"
        className={BOTON}
      >
        <Icono nombre="streamer" />
        Streamer
      </button>

      <button
        type="button"
        onClick={onConPredicciones}
        aria-pressed={conPredicciones}
        disabled={vacio}
        title={
          vacio ? 'Todavía no cargaste ningún pronóstico' : 'Compará contra la tabla de hoy'
        }
        className={BOTON}
      >
        <Icono nombre="ojo" />
        Con predicciones
      </button>

      {!streamer && (
        <>
          <button type="button" onClick={copiar} disabled={vacio} className={BOTON}>
            <Icono nombre="enlace" />
            {copiado ? 'Copiado' : 'Compartir'}
          </button>

          <button
            type="button"
            onClick={() => setConfirmando(true)}
            disabled={vacio}
            aria-label="Reiniciar los pronósticos"
            title="Reiniciar los pronósticos"
            className={BOTON}
          >
            <Icono nombre="reiniciar" />
          </button>
        </>
      )}
    </div>
  );
}

const TRAZOS: Record<string, string> = {
  streamer: 'M3 5.5h18v11H3zM8 20.5h8M12 16.5v4',
  ojo: 'M2 12s3.5-6.5 10-6.5S22 12 22 12s-3.5 6.5-10 6.5S2 12 2 12z',
  enlace: 'M9.5 14.5a4 4 0 0 0 5.7 0l3-3a4 4 0 1 0-5.7-5.7l-1.2 1.2M14.5 9.5a4 4 0 0 0-5.7 0l-3 3a4 4 0 1 0 5.7 5.7l1.2-1.2',
  reiniciar: 'M20 11a8 8 0 1 0-2.3 5.7M20 5v6h-6',
};

function Icono({ nombre }: { nombre: keyof typeof TRAZOS | string }) {
  return (
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
      <path d={TRAZOS[nombre] ?? ''} />
      {nombre === 'ojo' && <circle cx="12" cy="12" r="2.5" />}
    </svg>
  );
}
