import { useMemo, useState, type ReactNode } from 'react';
import { zonaDe, type Probabilidad, type ReglasLiga, type Tabla } from '@athena/calculadora';

/*
 * La tabla completa: lo jugado, lo convertido y lo que sale de ahí.
 *
 * Cada columna lleva su color porque a nueve números iguales en gris no se les encuentra el orden:
 * ganados en verde, empatados en ámbar, perdidos en rojo, y la diferencia según su signo. Los
 * puntos van en la tinta de la marca porque son la respuesta a la pregunta.
 *
 * La zona va en un riel a la izquierda **y** en una leyenda con su nombre: el color nunca es el
 * único canal que cuenta algo, y en una tabla de descenso eso no es un detalle.
 */

interface Props {
  tabla: Tabla;
  reglas: ReglasLiga;
  probabilidades: Probabilidad[] | null;
  conPredicciones: boolean;
  hayPronosticos: boolean;
  streamer: boolean;
  controles: ReactNode;
}

const RIEL: Record<string, string> = {
  campeon: 'bg-card-yellow',
  libertadores: 'bg-win',
  sudamericana: 'bg-data',
  descenso: 'bg-card-red',
};

type Cual = 'torneo' | 'libertadores' | 'sudamericana' | 'descenso';

const COLUMNA: Array<{ cual: Cual; corto: string; largo: string }> = [
  { cual: 'torneo', corto: 'Campeón', largo: 'Probabilidad de salir campeón' },
  { cual: 'libertadores', corto: 'Libertadores', largo: 'Probabilidad de clasificar a la Libertadores' },
  { cual: 'sudamericana', corto: 'Sudamericana', largo: 'Probabilidad de clasificar a la Sudamericana' },
  { cual: 'descenso', corto: 'Descenso', largo: 'Probabilidad de descender' },
];

/** Un porcentaje sin `Intl`: el servidor y el navegador tienen que escribir lo mismo. */
function porcentaje(valor: number): string {
  if (valor > 0 && valor < 0.005) return '<1%';
  return `${Math.round(valor * 100)}%`;
}

export default function Tablas({
  tabla,
  reglas,
  probabilidades,
  conPredicciones,
  hayPronosticos,
  streamer,
  controles,
}: Props) {
  const [cual, setCual] = useState<Cual>('torneo');

  const porEquipo = useMemo(
    () => new Map((probabilidades ?? []).map((p) => [p.equipoId, p])),
    [probabilidades],
  );

  const zonas = useMemo(
    () => reglas.tablas.find((t) => t.clave === tabla.clave)?.zonas ?? [],
    [reglas, tabla.clave],
  );

  /* En una tabla de torneo, "campeón" es ganar ese torneo; en la acumulada, el título nacional. */
  const esAcumulada = tabla.clave === reglas.claveAcumulada;
  const disponibles = esAcumulada ? COLUMNA : COLUMNA.slice(0, 1);
  const elegida = disponibles.find((c) => c.cual === cual) ?? disponibles[0]!;

  const valorDe = (p: Probabilidad | undefined): number | null => {
    if (!p) return null;
    if (elegida.cual === 'torneo') {
      return esAcumulada ? p.titulo : (p.ganaTorneo[tabla.clave] ?? 0);
    }
    return p[elegida.cual];
  };

  const jugados = tabla.filas.reduce((t, f) => t + f.jugados, 0) / 2;
  const goles = tabla.filas.reduce((t, f) => t + f.golesFavor, 0);

  return (
    <section className="overflow-hidden rounded-xl border border-border bg-surface">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-border px-4 py-2.5">
        <h2 className="font-display text-sm font-semibold uppercase tracking-label text-ink-muted">
          Tabla · {tabla.titulo}
        </h2>
        <p className="text-2xs text-ink-muted">
          {jugados} jugados · {goles} goles
          {jugados > 0 ? ` · ${Math.round((goles / jugados) * 100) / 100} por partido` : ''}
        </p>
        <div className="ml-auto">{controles}</div>
      </div>

      {!streamer && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-border px-4 py-2">
          <ul className="flex flex-wrap items-center gap-x-3 gap-y-1">
            {zonas.map((zona) => (
              <li key={zona.zona} className="flex items-center gap-1.5 text-2xs text-ink-muted">
                <span
                  className={`h-3 w-1 shrink-0 rounded-full ${RIEL[zona.zona] ?? 'bg-border-strong'}`}
                  aria-hidden="true"
                />
                {zona.etiqueta}
              </li>
            ))}
          </ul>

          {disponibles.length > 1 && (
            <div
              className="ml-auto flex flex-wrap items-center gap-1"
              role="group"
              aria-label="Probabilidad de"
            >
              <span className="mr-1 text-2xs text-ink-muted">Probabilidad de</span>
              {disponibles.map((columna) => (
                <button
                  key={columna.cual}
                  type="button"
                  onClick={() => setCual(columna.cual)}
                  aria-current={columna.cual === elegida.cual ? 'true' : undefined}
                  className="cursor-pointer rounded-full border border-border px-2.5 py-1 text-2xs font-medium text-ink-muted transition-colors hover:text-ink aria-[current]:border-primary aria-[current]:bg-primary/10 aria-[current]:text-ink"
                >
                  {columna.corto}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-2xs uppercase tracking-label text-ink-muted">
              <th scope="col" className="py-2 pl-3 pr-1 text-left font-medium">
                #
              </th>
              <th scope="col" className="py-2 pr-2 text-left font-medium">
                Equipo
              </th>
              <Encabezado>PJ</Encabezado>
              <Encabezado oculta>G</Encabezado>
              <Encabezado oculta>E</Encabezado>
              <Encabezado oculta>P</Encabezado>
              <Encabezado oculta>GF</Encabezado>
              <Encabezado oculta>GC</Encabezado>
              <Encabezado>DG</Encabezado>
              {!streamer && (
                <th
                  scope="col"
                  className="px-2 text-right font-medium"
                  title={elegida.largo}
                >
                  {elegida.corto}
                </th>
              )}
              <th scope="col" className="py-2 pl-2 pr-3 text-right font-medium">
                Pts
              </th>
            </tr>
          </thead>
          <tbody>
            {tabla.filas.map((fila) => {
              const zona = zonaDe(reglas, tabla.clave, fila.posicion);
              const valor = valorDe(porEquipo.get(fila.equipo.id));
              return (
                <tr
                  key={fila.equipo.id}
                  className="border-b border-border/40 last:border-0 even:bg-canvas-subtle/60"
                >
                  <td className="relative py-2 pl-3 pr-1 tabular text-ink-muted">
                    {zona && (
                      <span
                        role="img"
                        className={`absolute inset-y-0 left-0 w-1 ${RIEL[zona.zona] ?? ''}`}
                        title={zona.etiqueta}
                        aria-label={zona.etiqueta}
                      />
                    )}
                    {fila.posicion}
                  </td>

                  <td className="py-2 pr-2">
                    <span className="flex min-w-0 items-center gap-2">
                      {fila.equipo.logo ? (
                        <img
                          src={fila.equipo.logo}
                          alt=""
                          width="24"
                          height="24"
                          loading="lazy"
                          className="size-6 shrink-0"
                        />
                      ) : (
                        <span
                          className="size-6 shrink-0 rounded-full bg-canvas-subtle"
                          aria-hidden="true"
                        />
                      )}
                      <a
                        href={`/equipos/${fila.equipo.slug}`}
                        className="truncate font-medium hover:text-primary-ink hover:underline"
                      >
                        {fila.equipo.nombre}
                      </a>
                      {conPredicciones && hayPronosticos && fila.movimiento !== 0 && (
                        <span
                          className={`shrink-0 text-2xs tabular ${fila.movimiento > 0 ? 'text-win-ink' : 'text-card-red-ink'}`}
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

                  <Celda>{fila.jugados}</Celda>
                  <Celda oculta tinta="text-win-ink">
                    {fila.ganados}
                  </Celda>
                  <Celda oculta tinta="text-card-yellow-ink">
                    {fila.empatados}
                  </Celda>
                  <Celda oculta tinta="text-card-red-ink">
                    {fila.perdidos}
                  </Celda>
                  <Celda oculta>{fila.golesFavor}</Celda>
                  <Celda oculta>{fila.golesContra}</Celda>
                  <Celda
                    tinta={
                      fila.diferencia > 0
                        ? 'text-win-ink'
                        : fila.diferencia < 0
                          ? 'text-card-red-ink'
                          : undefined
                    }
                  >
                    {fila.diferencia > 0 ? `+${fila.diferencia}` : fila.diferencia}
                  </Celda>

                  {!streamer && (
                    <td className="px-2 py-2">
                      {valor === null ? (
                        <span className="block text-right text-ink-muted">—</span>
                      ) : (
                        <Barra valor={valor} zona={elegida.cual} />
                      )}
                    </td>
                  )}

                  <td className="py-2 pl-2 pr-3 text-right font-display text-base font-semibold tabular text-primary-ink">
                    {fila.puntos}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="border-t border-border px-4 py-2 text-2xs text-ink-muted">
        {!conPredicciones
          ? 'Tabla de hoy, sin tus pronósticos aplicados.'
          : probabilidades
            ? 'Cinco mil temporadas simuladas sobre tu escenario, con el ataque y la defensa de cada equipo medidos en esta misma temporada. No simula el fair play ni el sorteo.'
            : 'Calculando las probabilidades…'}
      </p>
    </section>
  );
}

function Encabezado({ children, oculta = false }: { children: ReactNode; oculta?: boolean }) {
  return (
    <th
      scope="col"
      className={`px-1.5 text-right font-medium ${oculta ? 'hidden sm:table-cell' : ''}`}
    >
      {children}
    </th>
  );
}

function Celda({
  children,
  oculta = false,
  tinta,
}: {
  children: ReactNode;
  oculta?: boolean;
  tinta?: string;
}) {
  return (
    <td
      className={`px-1.5 py-2 text-right tabular ${tinta ?? 'text-ink-muted'} ${oculta ? 'hidden sm:table-cell' : ''}`}
    >
      {children}
    </td>
  );
}

/* La barra dice de un vistazo quién puntea; el número está al lado porque una barra no se cita. */
function Barra({ valor, zona }: { valor: number; zona: Cual }) {
  const color =
    zona === 'descenso'
      ? 'bg-card-red'
      : zona === 'sudamericana'
        ? 'bg-data'
        : zona === 'libertadores'
          ? 'bg-win'
          : 'bg-card-yellow';
  return (
    <span className="flex items-center justify-end gap-2">
      <span className="hidden h-1.5 w-16 overflow-hidden rounded-full bg-canvas-subtle sm:block">
        <span
          className={`block h-full rounded-full ${color}`}
          style={{ width: `${Math.max(valor > 0 ? 3 : 0, Math.round(valor * 100))}%` }}
        />
      </span>
      <span className="w-9 shrink-0 text-right tabular text-ink-muted">{porcentaje(valor)}</span>
    </span>
  );
}
