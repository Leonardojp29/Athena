import { useMemo, useState } from 'react';
import { zonaDe, type Probabilidad, type ReglasLiga, type Tabla } from '@athena/calculadora';

/*
 * Las tres tablas, una a la vez.
 *
 * La zona va en un riel de color a la izquierda **y** en una leyenda con su nombre: el color nunca
 * es el único canal que cuenta algo. El ▲▼ se mide contra la tabla de hoy sin pronósticos, así que
 * responde exactamente lo que el lector preguntó al escribir un marcador.
 */

interface Props {
  tablas: Tabla[];
  reglas: ReglasLiga;
  probabilidades: Probabilidad[] | null;
  hayPronosticos: boolean;
}

const COLOR: Record<string, string> = {
  campeon: 'bg-primary',
  libertadores: 'bg-primary',
  sudamericana: 'bg-data',
  descenso: 'bg-card-red',
};

/** Un porcentaje sin `Intl`: el servidor y el navegador tienen que escribir lo mismo. */
function porcentaje(valor: number): string {
  if (valor > 0 && valor < 0.005) return '<1%';
  return `${Math.round(valor * 100)}%`;
}

export default function Tablas({ tablas, reglas, probabilidades, hayPronosticos }: Props) {
  const [activa, setActiva] = useState(tablas[0]?.clave ?? '');
  const tabla = tablas.find((t) => t.clave === activa) ?? tablas[0];

  const porEquipo = useMemo(
    () => new Map((probabilidades ?? []).map((p) => [p.equipoId, p])),
    [probabilidades],
  );

  const zonas = useMemo(
    () => reglas.tablas.find((t) => t.clave === tabla?.clave)?.zonas ?? [],
    [reglas, tabla],
  );

  if (!tabla) return null;

  const esAnual = tabla.clave === reglas.claveAcumulada;

  return (
    <section className="overflow-hidden rounded-xl border border-border bg-surface">
      <header className="flex flex-wrap items-center gap-2 border-b border-border p-2">
        <div
          className="flex flex-wrap items-center gap-1 rounded-lg bg-canvas-subtle p-1"
          role="group"
          aria-label="Tabla"
        >
          {tablas.map((cual) => (
            <button
              key={cual.clave}
              type="button"
              onClick={() => setActiva(cual.clave)}
              aria-current={cual.clave === tabla.clave ? 'true' : undefined}
              className="cursor-pointer rounded-md px-2.5 py-1 text-2xs font-medium text-ink-muted transition-colors hover:text-ink aria-[current]:bg-surface aria-[current]:text-ink aria-[current]:shadow-card"
            >
              {cual.titulo}
            </button>
          ))}
        </div>

        <ul className="ml-auto flex flex-wrap items-center gap-x-3 gap-y-1">
          {zonas.map((zona) => (
            <li key={zona.zona} className="flex items-center gap-1.5 text-2xs text-ink-muted">
              <span
                className={`h-2.5 w-0.5 shrink-0 rounded-full ${COLOR[zona.zona] ?? 'bg-border-strong'}`}
                aria-hidden="true"
              />
              {zona.etiqueta}
            </li>
          ))}
        </ul>
      </header>

      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border text-2xs uppercase tracking-label text-ink-muted">
              <th scope="col" className="py-1.5 pl-2 pr-1 text-left font-medium">
                #
              </th>
              <th scope="col" className="py-1.5 pr-2 text-left font-medium">
                Equipo
              </th>
              <th scope="col" className="px-1 text-right font-medium">PJ</th>
              <th scope="col" className="px-1 text-right font-medium">DG</th>
              <th scope="col" className="px-1 text-right font-medium">Pts</th>
              {esAnual && (
                <>
                  <th scope="col" className="px-1 text-right font-medium" title="Probabilidad de salir campeón">
                    Tít.
                  </th>
                  <th scope="col" className="px-1 text-right font-medium" title="Probabilidad de clasificar a la Copa Libertadores">
                    Lib.
                  </th>
                  <th scope="col" className="px-1 pr-2 text-right font-medium" title="Probabilidad de descender">
                    Desc.
                  </th>
                </>
              )}
            </tr>
          </thead>
          <tbody>
            {tabla.filas.map((fila) => {
              const zona = zonaDe(reglas, tabla.clave, fila.posicion);
              const probabilidad = porEquipo.get(fila.equipo.id);
              return (
                <tr
                  key={fila.equipo.id}
                  className="border-b border-border/40 last:border-0 even:bg-canvas-subtle/70"
                >
                  <td className="relative py-1.5 pl-2 pr-1 tabular text-ink-muted">
                    {zona && (
                      <span
                        role="img"
                        className={`absolute inset-y-0.5 left-0 w-[3px] rounded-full ${COLOR[zona.zona] ?? ''}`}
                        title={zona.etiqueta}
                        aria-label={zona.etiqueta}
                      />
                    )}
                    {fila.posicion}
                  </td>
                  <td className="py-1.5 pr-2">
                    <span className="flex min-w-0 items-center gap-1.5">
                      {fila.equipo.logo ? (
                        <img
                          src={fila.equipo.logo}
                          alt=""
                          width="16"
                          height="16"
                          loading="lazy"
                          className="size-4 shrink-0"
                        />
                      ) : (
                        <span className="size-4 shrink-0 rounded-full bg-canvas-subtle" aria-hidden="true" />
                      )}
                      <a
                        href={`/equipos/${fila.equipo.slug}`}
                        className="truncate hover:text-primary-ink hover:underline"
                      >
                        {fila.equipo.nombre}
                      </a>
                      {hayPronosticos && fila.movimiento !== 0 && (
                        <span
                          className={`shrink-0 text-2xs tabular ${fila.movimiento > 0 ? 'text-win' : 'text-card-red-ink'}`}
                          title={
                            fila.movimiento > 0
                              ? `Sube ${fila.movimiento} con tu escenario`
                              : `Baja ${-fila.movimiento} con tu escenario`
                          }
                        >
                          {fila.movimiento > 0 ? '▲' : '▼'}
                          {Math.abs(fila.movimiento)}
                        </span>
                      )}
                    </span>
                  </td>
                  <td className="px-1 text-right tabular text-ink-muted">{fila.jugados}</td>
                  <td className="px-1 text-right tabular text-ink-muted">
                    {fila.diferencia > 0 ? `+${fila.diferencia}` : fila.diferencia}
                  </td>
                  <td className="px-1 text-right font-semibold tabular">{fila.puntos}</td>
                  {esAnual && (
                    <>
                      <td className="px-1 text-right tabular text-ink-muted">
                        {probabilidad ? porcentaje(probabilidad.titulo) : '—'}
                      </td>
                      <td className="px-1 text-right tabular text-ink-muted">
                        {probabilidad ? porcentaje(probabilidad.libertadores) : '—'}
                      </td>
                      <td className="px-1 pr-2 text-right tabular text-ink-muted">
                        {probabilidad ? porcentaje(probabilidad.descenso) : '—'}
                      </td>
                    </>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {esAnual && (
        <p className="border-t border-border px-2 py-1.5 text-2xs text-ink-muted">
          {probabilidades
            ? 'Cinco mil temporadas simuladas sobre tu escenario, con el ataque y la defensa de cada equipo medidos en esta misma temporada. No simula el fair play ni el sorteo.'
            : 'Calculando las probabilidades…'}
        </p>
      )}
    </section>
  );
}
