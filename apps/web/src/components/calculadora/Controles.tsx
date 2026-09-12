import { useState } from 'react';

/*
 * Los tres gestos que no son poner un marcador.
 *
 * **Con predicciones** apaga el escenario sin borrarlo: sirve para comparar contra la tabla de hoy
 * y volver. **Modo streamer** tapa la tabla y deja un botón para revelarla, que es lo que hace
 * falta en una transmisión donde el resultado se cuenta al final y no al abrir la página.
 */
interface Props {
  codigo: string;
  conPredicciones: boolean;
  streamer: boolean;
  onConPredicciones: () => void;
  onStreamer: () => void;
}

const BOTON =
  'flex cursor-pointer items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-2xs font-medium text-ink-muted transition-colors hover:bg-canvas-subtle hover:text-ink disabled:cursor-not-allowed disabled:opacity-40 aria-[pressed=true]:border-primary aria-[pressed=true]:bg-primary/10 aria-[pressed=true]:text-ink';

export default function Controles({
  codigo,
  conPredicciones,
  streamer,
  onConPredicciones,
  onStreamer,
}: Props) {
  const [copiado, setCopiado] = useState(false);
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

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <button
        type="button"
        onClick={onStreamer}
        aria-pressed={streamer}
        title="Oculta la tabla para no adelantar el resultado en una transmisión"
        className={BOTON}
      >
        <Icono nombre="streamer" />
        Modo streamer
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

      <button type="button" onClick={copiar} disabled={vacio} className={BOTON}>
        <Icono nombre="enlace" />
        {copiado ? 'Copiado' : 'Compartir'}
      </button>
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
