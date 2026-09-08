/**
 * Una decisión.
 *
 * La jerarquía es lo único que importa acá: **lo que hay que leer para decidir es la situación**, y
 * antes era el texto más chico y más gris de la pantalla, debajo de un título grande que solo daba
 * contexto y encima de cuatro tarjetas que competían entre ellas. El jugador lo dijo así: "la vista de
 * las preguntas tiene mucha carga cognitiva y no se lee bien". Ahora el título es un rótulo, la
 * situación es el cuerpo de lectura con tinta plena y ancho de línea acotado, y las opciones vienen
 * después, con aire y con la pista un escalón por debajo de la opción.
 *
 * La pista de cada opción existe a propósito: el jugador tiene que poder anticipar el tipo de
 * consecuencia, no el resultado. Saber que "puede respetarte más o cerrarte la puerta" es decidir; que
 * el juego te sorprenda sin haberte dado ninguna señal es un sorteo con pantalla.
 */

interface Props {
  titulo: string;
  texto: string;
  opciones: Array<{ id: string; texto: string; pista?: string; arriesgada?: boolean }>;
  onElegir: (opcionId: string) => void;
}

export default function Decision({ titulo, texto, opciones, onElegir }: Props) {
  return (
    <section
      data-escena
      className="flex flex-col overflow-hidden rounded-2xl border border-border bg-surface"
    >
      {/* El enunciado: el rótulo da contexto, la situación se lee. */}
      <header className="border-b border-border bg-canvas-subtle/60 px-4 py-4 sm:px-5">
        <p className="flex items-baseline gap-2 text-2xs font-medium uppercase tracking-label text-primary-ink">
          <span
            aria-hidden="true"
            className="inline-block size-1.5 shrink-0 translate-y-[-1px] rounded-full bg-primary"
          />
          {titulo}
        </p>
        <p className="mt-2 max-w-[62ch] text-balance text-[15px] font-medium leading-relaxed text-ink sm:text-base">
          {texto}
        </p>
      </header>

      <ul className="grid gap-2 p-3 sm:grid-cols-2 sm:gap-2.5 sm:p-4">
        {opciones.map((opcion, i) => (
          <li key={opcion.id} className="min-w-0">
            <button
              type="button"
              onClick={() => onElegir(opcion.id)}
              className="group flex h-full w-full cursor-pointer flex-col gap-1.5 rounded-xl border border-border bg-canvas px-3.5 py-3 text-left transition-[colors,transform,box-shadow] duration-200 ease-out hover:-translate-y-0.5 hover:border-primary-ink hover:bg-surface hover:shadow-magnet active:translate-y-0"
            >
              <span className="flex items-start gap-2.5">
                <span className="grid size-6 shrink-0 place-items-center rounded-md bg-canvas-subtle font-display text-xs font-semibold tabular text-ink-muted transition-colors duration-200 group-hover:bg-primary group-hover:text-primary-contrast">
                  {i + 1}
                </span>
                <span className="min-w-0 flex-1 text-[15px] font-semibold leading-snug text-ink">
                  {opcion.texto}
                </span>
                {/*
                  Las opciones que se juegan a los dados se marcan, y no se dice cómo salen: avisar el
                  tipo de riesgo es información, avisar el resultado es un spoiler.
                */}
                {opcion.arriesgada && (
                  <span
                    title="Se juega a los dados"
                    className="mt-0.5 shrink-0 rounded bg-card-red/14 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-label text-card-red-ink"
                  >
                    Riesgo
                  </span>
                )}
              </span>
              {opcion.pista && (
                <span className="pl-[2.125rem] text-xs leading-snug text-ink-muted">{opcion.pista}</span>
              )}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
