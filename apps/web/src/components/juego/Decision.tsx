/**
 * Una decisión.
 *
 * La pista de cada opción existe a propósito: el jugador tiene que poder anticipar el tipo de
 * consecuencia, no el resultado. Saber que "puede respetarte más o cerrarte la puerta" es decidir; que
 * el juego te sorprenda sin haberte dado ninguna señal es un sorteo con pantalla.
 */

interface Props {
  titulo: string;
  texto: string;
  opciones: Array<{ id: string; texto: string; pista?: string }>;
  onElegir: (opcionId: string) => void;
}

export default function Decision({ titulo, texto, opciones, onElegir }: Props) {
  return (
    <div data-escena className="overflow-hidden rounded-xl border border-primary/30 bg-surface">
      <header className="border-b border-border bg-primary/8 px-4 py-3">
        <p className="text-2xs font-medium uppercase tracking-label text-primary-ink">Tenés que decidir</p>
        <h2 className="mt-0.5 font-display text-lg font-semibold uppercase leading-tight tracking-label">
          {titulo}
        </h2>
      </header>

      <p className="px-4 py-4 text-base leading-relaxed">{texto}</p>

      <ul className="flex flex-col gap-2 px-3 pb-3">
        {opciones.map((opcion, i) => (
          <li key={opcion.id}>
            <button
              type="button"
              onClick={() => onElegir(opcion.id)}
              className="flex w-full cursor-pointer items-start gap-3 rounded-lg border border-border p-3 text-left transition-colors hover:border-primary-ink hover:bg-primary/8"
            >
              <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-canvas-subtle font-display text-xs font-semibold tabular">
                {i + 1}
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-medium leading-snug">{opcion.texto}</span>
                {opcion.pista && (
                  <span className="mt-0.5 block text-2xs leading-snug text-ink-muted">{opcion.pista}</span>
                )}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
