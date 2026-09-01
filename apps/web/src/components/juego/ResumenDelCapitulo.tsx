import { DIARIO_POR_TONO, NOMBRE_DE_NIVEL, type Capitulo } from '@athena/leyenda';

/**
 * Lo que pasó en los últimos dos años, en cuatro líneas.
 *
 * Va encima de la decisión y desaparece cuando llega el capítulo siguiente. Es todo lo que quedó del
 * reproductor de veinte beats que hacía sentir largo al juego: la consecuencia de lo que elegiste, el
 * titular del bienio, los títulos y —cuando pasa— el salto de la carta, que es el momento que la
 * gente espera.
 */
/* Un capítulo son dos temporadas: ganar la liga las dos veces son dos trofeos, no dos etiquetas iguales. */
function agrupar(trofeos: Capitulo['trofeos']) {
  const cuenta = new Map<string, { nombre: string; clase: string; veces: number }>();
  for (const t of trofeos) {
    const clave = `${t.nombre}|${t.clase}`;
    const previo = cuenta.get(clave);
    if (previo) previo.veces += 1;
    else cuenta.set(clave, { nombre: t.nombre, clase: t.clase, veces: 1 });
  }
  return [...cuenta.values()];
}

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
          {/*
            El diario que lo publica sale del tono: una polémica no la saca el mismo medio que una
            nota de fútbol, y ver el nombre arriba cambia cómo se lee la frase.
          */}
          <p
            className={`text-[10px] font-medium uppercase tracking-label ${
              capitulo.titular.tono === 'polemica'
                ? 'text-card-red-ink'
                : capitulo.titular.tono === 'elogio'
                  ? 'text-primary-ink'
                  : 'text-ink-muted'
            }`}
          >
            {DIARIO_POR_TONO[capitulo.titular.tono]}
          </p>
          <p className="font-display text-sm font-semibold uppercase leading-snug tracking-label">
            {capitulo.titular.texto}
          </p>
        </blockquote>
      )}

      {capitulo.trofeos.length > 0 && (
        <ul className="flex flex-wrap gap-1.5">
          {agrupar(capitulo.trofeos).map((trofeo) => (
            <li
              key={`${trofeo.nombre}-${trofeo.clase}`}
              className={`rounded-md px-2 py-1 text-xs font-medium ${
                trofeo.clase === 'individual'
                  ? 'bg-data/16 text-data-ink'
                  : 'bg-card-yellow/18 text-card-yellow'
              }`}
            >
              {trofeo.nombre}
              {trofeo.veces > 1 && <span className="ml-1 tabular opacity-70">×{trofeo.veces}</span>}
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
