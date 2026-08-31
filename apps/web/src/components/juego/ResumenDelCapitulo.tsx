import { NOMBRE_DE_NIVEL, type Capitulo } from '@athena/leyenda';

/**
 * Lo que pasó en los últimos dos años, en cuatro líneas.
 *
 * Va encima de la decisión y desaparece cuando llega el capítulo siguiente. Es todo lo que quedó del
 * reproductor de veinte beats que hacía sentir largo al juego: la consecuencia de lo que elegiste, el
 * titular del bienio, los títulos y —cuando pasa— el salto de la carta, que es el momento que la
 * gente espera.
 */
export default function ResumenDelCapitulo({ capitulo }: { capitulo: Capitulo }) {
  const hayAlgo =
    capitulo.consecuencia || capitulo.titular || capitulo.trofeos.length > 0 || capitulo.ascenso;
  if (!hayAlgo) return null;

  return (
    <div data-resumen className="flex flex-col gap-2">
      {capitulo.consecuencia && (
        <p className="text-sm leading-relaxed text-ink">{capitulo.consecuencia}</p>
      )}

      {capitulo.titular && (
        <blockquote className="rounded-lg border border-border bg-canvas-subtle px-3 py-2">
          <p className="text-[10px] uppercase tracking-label text-ink-muted">Prensa</p>
          <p className="font-display text-sm font-semibold uppercase leading-snug tracking-label">
            {capitulo.titular}
          </p>
        </blockquote>
      )}

      {capitulo.trofeos.length > 0 && (
        <ul className="flex flex-wrap gap-1.5">
          {capitulo.trofeos.map((trofeo, i) => (
            <li
              key={`${trofeo.id}-${i}`}
              className={`rounded-md px-2 py-1 text-xs font-medium ${
                trofeo.clase === 'individual'
                  ? 'bg-data/16 text-data-ink'
                  : 'bg-card-yellow/18 text-card-yellow'
              }`}
            >
              {trofeo.nombre}
            </li>
          ))}
        </ul>
      )}

      {capitulo.ascenso && (
        <p className="rounded-lg border border-primary/40 bg-primary/12 px-3 py-2 text-center">
          <span className="block text-[10px] uppercase tracking-label text-ink-muted">
            Tu carta cambió
          </span>
          <span className="font-display text-base font-semibold uppercase tracking-label text-primary-ink">
            {NOMBRE_DE_NIVEL[capitulo.ascenso.a]}
          </span>
        </p>
      )}
    </div>
  );
}
