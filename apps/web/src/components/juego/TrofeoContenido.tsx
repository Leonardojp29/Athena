import type { GrupoDeTrofeos } from './trofeos';

const CLASE: Record<string, string> = {
  liga: 'Liga',
  copa: 'Copa nacional',
  continental: 'Torneo continental',
  seleccion: 'Con la selección',
  individual: 'Premio individual',
};

/**
 * Lo que dice el tooltip de un trofeo.
 *
 * Ganar tres veces la misma liga es un dato distinto de ganarla una, y el `title` del navegador lo
 * contaba todo en la misma línea corrida. Acá el número tiene jerarquía y los años se leen sueltos.
 */
export default function TrofeoContenido({ grupo }: { grupo: GrupoDeTrofeos }) {
  const acento =
    grupo.clase === 'individual'
      ? 'text-data-ink'
      : grupo.clase === 'seleccion'
        ? 'text-primary-ink'
        : 'text-card-yellow';

  return (
    <>
      <span className={`block text-[9px] font-medium uppercase tracking-label ${acento}`}>
        {CLASE[grupo.clase] ?? 'Título'}
      </span>
      <span className="mt-0.5 block font-display text-sm font-semibold uppercase leading-tight tracking-label text-ink">
        {grupo.nombre}
      </span>
      {grupo.club && <span className="mt-0.5 block text-[11px] leading-snug text-ink-muted">{grupo.club}</span>}

      <span className="mt-1.5 block border-t border-border pt-1.5">
        {grupo.veces > 1 && (
          <span className="block text-[11px] font-medium text-ink">Ganada {grupo.veces} veces</span>
        )}
        <span className="mt-0.5 flex flex-wrap gap-1">
          {grupo.anios.map((anio, i) => (
            <span
              key={`${anio}-${i}`}
              className="rounded bg-canvas-subtle px-1.5 py-0.5 text-[10px] tabular text-ink-muted"
            >
              {anio}
            </span>
          ))}
        </span>
      </span>
    </>
  );
}
