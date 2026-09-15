import type { Fallo } from '@athena/sesenta-segundos';

interface Props {
  fallados: Fallo[];
  onVolver: () => void;
}

/**
 * Las que se fallaron, con su porqué.
 *
 * Es lo único del juego que no corre contra el reloj, así que acá sí cabe la explicación: durante
 * los sesenta segundos habría sido texto que nadie llega a leer.
 */
export function Repaso({ fallados, onVolver }: Props) {
  return (
    <div data-repaso className="mx-auto w-full max-w-xl flex-1 px-4 py-8">
      <h2 className="font-display text-2xl font-semibold uppercase tracking-label">
        {fallados.length === 1 ? 'Lo que se te escapó' : 'Lo que se te escapó'}
      </h2>
      <p className="mt-1 text-sm text-ink-muted">Sin reloj, ahora sí.</p>

      <ul className="mt-5 grid gap-3">
        {fallados.map((fallo, i) => {
          const correcta = fallo.pregunta.opciones.find((o) => o.esCorrecta)?.texto ?? '';
          return (
            <li
              key={`${fallo.pregunta.clave}-${i}`}
              className="animate-sesenta-entra rounded-xl border border-border bg-surface p-4"
              style={{ animationDelay: `${i * 50}ms` }}
            >
              <p className="font-medium leading-snug">{fallo.pregunta.enunciado}</p>
              <p className="mt-2 text-sm text-card-red-ink">
                <span className="text-2xs uppercase tracking-label text-ink-muted">Elegiste</span>{' '}
                {fallo.elegida}
              </p>
              <p className="text-sm text-win-ink">
                <span className="text-2xs uppercase tracking-label text-ink-muted">Correcta</span>{' '}
                {correcta}
              </p>
              <p className="mt-2 text-sm leading-relaxed text-ink-muted">{fallo.pregunta.explicacion}</p>
            </li>
          );
        })}
      </ul>

      <button
        type="button"
        onClick={onVolver}
        className="mt-6 w-full rounded-lg border border-border px-6 py-2.5 text-sm font-medium transition-colors duration-200 hover:border-border-strong hover:bg-canvas-subtle"
      >
        Volver al resultado
      </button>
    </div>
  );
}
