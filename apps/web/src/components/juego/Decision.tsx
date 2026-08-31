/**
 * Una decisión.
 *
 * La pista de cada opción existe a propósito: el jugador tiene que poder anticipar el tipo de
 * consecuencia, no el resultado. Saber que "puede respetarte más o cerrarte la puerta" es decidir; que
 * el juego te sorprenda sin haberte dado ninguna señal es un sorteo con pantalla.
 *
 * Comparte forma con el mercado —rótulo, título grande, tarjetas— porque las dos son lo mismo desde
 * el lado del jugador: lo único que hay que hacer en esta pantalla.
 */

interface Props {
  titulo: string;
  texto: string;
  opciones: Array<{ id: string; texto: string; pista?: string }>;
  onElegir: (opcionId: string) => void;
}

export default function Decision({ titulo, texto, opciones, onElegir }: Props) {
  return (
    <section data-escena className="flex flex-col gap-3">
      <header>
        <p className="text-2xs font-medium uppercase tracking-label text-primary-ink">
          Tienes que decidir
        </p>
        <h2 className="mt-0.5 font-display text-xl font-semibold uppercase leading-none tracking-label">
          {titulo}
        </h2>
      </header>

      <p className="max-w-prose text-sm leading-relaxed text-ink-muted">{texto}</p>

      <ul className="grid gap-2 sm:grid-cols-2">
        {opciones.map((opcion, i) => (
          <li key={opcion.id} className="min-w-0">
            <button
              type="button"
              onClick={() => onElegir(opcion.id)}
              className="group flex h-full w-full cursor-pointer items-start gap-3 rounded-xl border border-border bg-surface p-3 text-left transition-[colors,transform,box-shadow] duration-200 ease-out hover:-translate-y-0.5 hover:border-primary-ink hover:shadow-magnet active:translate-y-0"
            >
              <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-canvas-subtle font-display text-xs font-semibold tabular transition-colors duration-200 group-hover:bg-primary group-hover:text-primary-contrast">
                {i + 1}
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-medium leading-snug">{opcion.texto}</span>
                {opcion.pista && (
                  <span className="mt-1 block text-[11px] leading-snug text-ink-muted">
                    {opcion.pista}
                  </span>
                )}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
