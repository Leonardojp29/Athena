import { CAPITULOS, edadDelCapitulo, type Carrera, type Temporada } from '@athena/leyenda';

/**
 * La carrera, capítulo por capítulo.
 *
 * Es una línea de tiempo, no una planilla: un riel vertical con un nodo por bienio, y en cada nodo el
 * escudo real del club. Así la carrera se lee de un vistazo —uno reconoce el camino sin leer un solo
 * nombre— y los cambios de camiseta se ven como lo que son, saltos.
 *
 * Los capítulos que faltan no se dibujan uno por uno: doce filas vacías ocupaban toda la pantalla y no
 * decían nada. En su lugar va el nodo del capítulo que estás por jugar y una barra de doce tramos, que
 * es la misma información en una línea.
 */

interface Props {
  carrera: Carrera;
  /** La fila recién escrita, para que entre animada. */
  ultima: number;
}

export default function LineaDeCarrera({ carrera, ultima }: Props) {
  const filas = carrera.temporadas;
  const jugados = filas.length;
  const enCurso = Math.min(jugados, CAPITULOS - 1);
  const seleccion = filas.reduce(
    (suma, t) => ({
      convocatorias: suma.convocatorias + t.seleccion.convocatorias,
      goles: suma.goles + t.seleccion.goles,
    }),
    { convocatorias: 0, goles: 0 },
  );

  return (
    <section className="flex flex-col gap-3">
      <header className="flex items-baseline justify-between gap-3">
        <h2 className="font-display text-sm font-semibold uppercase tracking-label">Tu carrera</h2>
        <p className="text-2xs tabular text-ink-muted">
          {jugados >= CAPITULOS ? 'completa' : `${jugados} de ${CAPITULOS}`}
        </p>
      </header>

      <div className="relative">
        {/* El riel: la vida que une los capítulos. */}
        <span
          aria-hidden="true"
          className="absolute bottom-4 left-[1.0625rem] top-4 w-px bg-gradient-to-b from-border via-border to-transparent"
        />

        <ol className="relative flex flex-col gap-1.5">
          {filas.map((fila, i) => (
            <Capitulo
              key={i}
              fila={fila}
              nueva={i === ultima}
              cambioDeClub={i > 0 && filas[i - 1]?.clubSlug !== fila.clubSlug}
              subio={i > 0 ? fila.ovrFin - (filas[i - 1]?.ovrFin ?? fila.ovrFin) : 0}
            />
          ))}

          {jugados < CAPITULOS && (
            <li className="flex items-center gap-3 py-1">
              <span
                aria-hidden="true"
                className="relative grid size-[2.125rem] shrink-0 place-items-center rounded-full border border-dashed border-primary/50 bg-canvas"
              >
                <span className="size-1.5 rounded-full bg-primary-ink" />
              </span>
              <span className="font-display text-sm font-semibold tabular text-ink-muted">
                {edadDelCapitulo(enCurso)}
              </span>
              <span className="text-xs text-ink-muted">
                {jugados === 0 ? 'tu primer club te espera' : 'lo que decidas ahora se juega acá'}
              </span>
            </li>
          )}
        </ol>
      </div>

      {seleccion.convocatorias > 0 && (
        <div className="flex items-center gap-3 rounded-lg border border-border bg-canvas-subtle px-3 py-2">
          {carrera.futbolista.bandera && (
            <img
              src={carrera.futbolista.bandera}
              alt=""
              width={22}
              height={15}
              className="rounded-[1px] object-cover"
            />
          )}
          <span className="text-xs font-medium">{carrera.futbolista.pais}</span>
          <span className="ml-auto flex items-baseline gap-3 text-xs tabular text-ink-muted">
            <span>
              <b className="font-display text-sm text-ink">{seleccion.convocatorias}</b> partidos
            </span>
            <span>
              <b className="font-display text-sm text-ink">{seleccion.goles}</b> goles
            </span>
          </span>
        </div>
      )}
    </section>
  );
}

function Capitulo({
  fila,
  nueva,
  cambioDeClub,
  subio,
}: {
  fila: Temporada;
  nueva: boolean;
  cambioDeClub: boolean;
  subio: number;
}) {
  /* El color del club tiñe el aro del nodo: la carrera se ve por bloques de camiseta. */
  const tinte = fila.clubColor && /^[0-9a-f]{6}$/i.test(fila.clubColor) ? `#${fila.clubColor}` : null;

  return (
    <li
      {...(nueva ? { 'data-capitulo-nuevo': '' } : {})}
      className="group flex items-center gap-3"
    >
      <span
        className="relative grid size-[2.125rem] shrink-0 place-items-center overflow-hidden rounded-full border-2 border-border bg-canvas transition-transform duration-300 group-hover:scale-105"
        style={tinte ? { borderColor: tinte } : undefined}
        {...(cambioDeClub || nueva ? { 'data-escudo-nuevo': '' } : {})}
      >
        {fila.clubEscudo ? (
          <img
            src={fila.clubEscudo}
            alt=""
            width={22}
            height={22}
            loading="lazy"
            className="size-[1.375rem] object-contain"
          />
        ) : (
          <span className="font-display text-[10px] font-semibold">
            {fila.clubNombre.slice(0, 2).toUpperCase()}
          </span>
        )}
      </span>

      <span className="w-6 shrink-0 font-display text-base font-semibold leading-none tabular text-ink-muted">
        {fila.edad}
      </span>

      <span className="flex min-w-0 flex-1 items-center gap-3 rounded-lg border border-border bg-surface px-3 py-2 transition-colors duration-300 group-hover:border-border-strong">
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1.5">
            <span className="truncate text-sm font-medium">{fila.clubNombre}</span>
            {fila.trofeos.length > 0 && (
              <span className="shrink-0 text-card-yellow" title={fila.trofeos.join(' · ')}>
                <Trofeo />
                <span className="sr-only">Ganó: {fila.trofeos.join(', ')}</span>
              </span>
            )}
          </span>
          <span className="flex items-center gap-2 text-[11px] tabular text-ink-muted">
            <span>{fila.partidos} PJ</span>
            <span className="text-ink">{fila.goles} goles</span>
            <span>{fila.asistencias} asis</span>
          </span>
        </span>

        <span className="flex shrink-0 items-center gap-1.5">
          {subio !== 0 && (
            <span
              className={`text-[10px] font-medium tabular ${subio > 0 ? 'text-primary-ink' : 'text-card-red-ink'}`}
            >
              {subio > 0 ? '+' : ''}
              {subio}
            </span>
          )}
          <span
            className={`inline-block min-w-9 rounded px-1.5 py-0.5 text-center font-display text-base font-semibold tabular ${claseDeMedia(fila.ovrFin)}`}
          >
            {fila.ovrFin}
          </span>
        </span>
      </span>
    </li>
  );
}

/** La misma escala de seis escalones que usa toda Athena para las notas. */
function claseDeMedia(ovr: number): string {
  if (ovr >= 88) return 'bg-card-yellow text-board ring-2 ring-inset ring-chalk/80';
  if (ovr >= 80) return 'bg-data text-board';
  if (ovr >= 72) return 'bg-primary text-primary-contrast';
  if (ovr >= 64) return 'bg-nota-buena text-primary-contrast';
  if (ovr >= 55) return 'bg-board text-chalk';
  return 'bg-card-red/85 text-chalk';
}

function Trofeo() {
  return (
    <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M8 4.5h8v4.2a4 4 0 0 1-8 0z" />
      <path d="M8 5.5H5.2v1.8A3.2 3.2 0 0 0 8.4 10.5M16 5.5h2.8v1.8a3.2 3.2 0 0 1-3.2 3.2" />
      <path d="M12 12.7v3.3M8.5 19.5h7" />
    </svg>
  );
}
