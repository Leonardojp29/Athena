import type { Carrera, Temporada } from '@athena/leyenda';
import { CAPITULOS, edadDelCapitulo } from '@athena/leyenda';

/**
 * La línea de la carrera: doce filas que se van llenando.
 *
 * Es el corazón de la pantalla y la razón por la que alguien sigue jugando. Cada capítulo escribe una
 * fila —edad, club, media, partidos, goles, asistencias— y verla crecer *es* la recompensa: al final
 * queda una tabla que cuenta una vida entera y que da ganas de mostrar.
 *
 * Las filas que faltan no se ocultan: se ven vacías, con su edad. Saber que quedan seis capítulos es
 * parte del pulso, igual que ver cuánto falta en una barra de progreso.
 */

interface Props {
  carrera: Carrera;
  /** La fila recién escrita, para que entre animada. */
  ultima: number;
}

export default function LineaDeCarrera({ carrera, ultima }: Props) {
  const filas = carrera.temporadas;
  const seleccion = filas.reduce(
    (suma, t) => ({
      convocatorias: suma.convocatorias + t.seleccion.convocatorias,
      goles: suma.goles + t.seleccion.goles,
    }),
    { convocatorias: 0, goles: 0 },
  );

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-surface">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-border text-[10px] uppercase tracking-label text-ink-muted">
            <th scope="col" className="px-2 py-2 text-left font-medium sm:px-3">Edad</th>
            <th scope="col" className="px-2 py-2 text-left font-medium">Club</th>
            <th scope="col" className="px-1.5 py-2 text-right font-medium">Media</th>
            <th scope="col" className="px-1.5 py-2 text-right font-medium">PJ</th>
            <th scope="col" className="px-1.5 py-2 text-right font-medium">Gol</th>
            <th scope="col" className="px-2 py-2 text-right font-medium sm:px-3">Asis</th>
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: CAPITULOS }, (_, i) => {
            const fila = filas[i];
            return fila ? (
              <Fila key={i} fila={fila} nueva={i === ultima} />
            ) : (
              <tr key={i} className="border-b border-border/50 last:border-0">
                <td className="px-2 py-2 font-display text-base font-semibold tabular text-ink-muted/40 sm:px-3">
                  {edadDelCapitulo(i)}
                </td>
                <td colSpan={5} className="px-2 py-2">
                  <span className="block h-1 w-16 rounded-full bg-canvas-subtle" />
                </td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr className="border-t border-border bg-canvas-subtle/60">
            <td className="px-2 py-2 sm:px-3">
              {carrera.futbolista.bandera ? (
                <img
                  src={carrera.futbolista.bandera}
                  alt=""
                  width={20}
                  height={14}
                  className="rounded-[1px] object-cover"
                />
              ) : null}
            </td>
            <td className="px-2 py-2 text-xs font-medium">{carrera.futbolista.pais}</td>
            <td className="px-1.5 py-2 text-right text-2xs text-ink-muted">selección</td>
            <td className="px-1.5 py-2 text-right font-display text-sm font-semibold tabular">
              {seleccion.convocatorias}
            </td>
            <td className="px-1.5 py-2 text-right font-display text-sm font-semibold tabular">
              {seleccion.goles}
            </td>
            <td className="px-2 py-2 sm:px-3" />
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

function Fila({ fila, nueva }: { fila: Temporada; nueva: boolean }) {
  return (
    <tr
      {...(nueva ? { 'data-fila-nueva': '' } : {})}
      className="border-b border-border/60 last:border-0"
    >
      <td className="px-2 py-2 font-display text-base font-semibold tabular sm:px-3">{fila.edad}</td>
      <td className="max-w-0 px-2 py-2">
        <span className="flex items-center gap-1.5">
          <span className="truncate text-xs font-medium">{fila.clubNombre}</span>
          {fila.trofeos.length > 0 && (
            <span
              className="shrink-0 text-card-yellow"
              title={fila.trofeos.join(' · ')}
              aria-label={`Ganó: ${fila.trofeos.join(', ')}`}
            >
              <TrofeoIcono />
            </span>
          )}
        </span>
      </td>
      <td className="px-1.5 py-2 text-right">
        <span
          className={`inline-block min-w-8 rounded px-1.5 py-0.5 font-display text-sm font-semibold tabular ${claseDeMedia(fila.ovrFin)}`}
        >
          {fila.ovrFin}
        </span>
      </td>
      <td className="px-1.5 py-2 text-right text-xs tabular text-ink-muted">{fila.partidos}</td>
      <td className="px-1.5 py-2 text-right font-display text-sm font-semibold tabular">{fila.goles}</td>
      <td className="px-2 py-2 text-right text-xs tabular text-ink-muted sm:px-3">{fila.asistencias}</td>
    </tr>
  );
}

/**
 * El color de la media. Es la misma escala de seis escalones que usa toda Athena para las notas: un
 * 84 en la carrera se lee igual que un 8,4 en un partido real, y quien ya usó el sitio no aprende
 * nada nuevo.
 */
function claseDeMedia(ovr: number): string {
  if (ovr >= 88) return 'bg-card-yellow text-board ring-2 ring-inset ring-chalk/80';
  if (ovr >= 80) return 'bg-data text-board';
  if (ovr >= 72) return 'bg-primary text-primary-contrast';
  if (ovr >= 64) return 'bg-nota-buena text-primary-contrast';
  if (ovr >= 55) return 'bg-board text-chalk';
  return 'bg-card-red/85 text-chalk';
}

function TrofeoIcono() {
  return (
    <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M8 4.5h8v4.2a4 4 0 0 1-8 0z" />
      <path d="M8 5.5H5.2v1.8A3.2 3.2 0 0 0 8.4 10.5M16 5.5h2.8v1.8a3.2 3.2 0 0 1-3.2 3.2" />
      <path d="M12 12.7v3.3M8.5 19.5h7" />
    </svg>
  );
}
