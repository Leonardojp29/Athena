import { useMemo, useState } from 'react';
import { calcularVeredicto, type Carrera, type Veredicto } from '@athena/leyenda';
import Carta from './Carta';

/**
 * El cierre.
 *
 * Lo último que ve el jugador tiene que responder una sola pregunta: **qué fue esta carrera**. Por eso
 * arriba va el arquetipo —una frase que resume una vida— y después los números que la sostienen. El
 * prime, la mejor y la peor decisión salen de lo que pasó de verdad: si estuvieran escritas de antemano,
 * el veredicto sería del juego y no de la partida.
 */

interface Props {
  carrera: Carrera;
  onEmpezarDeNuevo: () => void;
  /** Guarda en el salón y devuelve el código compartible. */
  alGuardar: (veredicto: Veredicto) => string;
}

export default function Legado({ carrera, onEmpezarDeNuevo, alGuardar }: Props) {
  const veredicto = useMemo(() => calcularVeredicto(carrera), [carrera]);
  const [codigo] = useState(() => alGuardar(veredicto));
  const [copiado, setCopiado] = useState(false);

  const enlace = typeof window === 'undefined' ? '' : `${window.location.origin}/juegos/mi-leyenda/${codigo}`;

  const compartir = async () => {
    const texto = veredicto.frase;
    try {
      if (navigator.share) {
        await navigator.share({ title: 'Mi Leyenda · Athena', text: texto, url: enlace });
        return;
      }
      await navigator.clipboard.writeText(`${texto}\n${enlace}`);
      setCopiado(true);
      window.setTimeout(() => setCopiado(false), 2400);
    } catch {
      /* Si el navegador no deja compartir ni copiar, el enlace está a la vista para copiarlo a mano. */
      setCopiado(false);
    }
  };

  const totales = veredicto.totales;

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-6">
      <header className="text-center">
        <p className="text-2xs font-medium uppercase tracking-label text-ink-muted">
          {carrera.retiro?.enCasa ? 'Se retiró en casa' : 'Fin de la carrera'}
        </p>
        <h1 className="mt-1 font-display text-3xl font-semibold uppercase leading-tight tracking-label">
          {veredicto.adn.titulo}
        </h1>
        <p className="mx-auto mt-2 max-w-lg text-sm leading-relaxed text-ink-muted">
          {veredicto.adn.descripcion}
        </p>
      </header>

      <div className="mt-6 grid gap-5 lg:grid-cols-[19rem_1fr]">
        <div className="mx-auto w-full max-w-[19rem]">
          <Carta
            entra
            datos={{
              nombre: carrera.futbolista.nombre,
              dorsal: carrera.futbolista.dorsal,
              puesto: carrera.futbolista.puesto,
              ovr: totales.ovrMaximo,
              nivel: veredicto.nivelMaximo,
              atributos: carrera.futbolista.atributos,
              club: carrera.clubActual,
              pais: carrera.futbolista.pais,
              bandera: carrera.futbolista.bandera,
            }}
          />
          <p className="mt-1 text-center text-2xs text-ink-muted">La carta de toda tu vida</p>
        </div>

        <div className="flex flex-col gap-4">
          <dl className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {[
              ['Temporadas', totales.temporadas],
              ['Partidos', totales.partidos],
              ['Goles', totales.goles],
              ['Asistencias', totales.asistencias],
              ['Títulos', totales.trofeos],
              ['Premios', totales.premios],
              ['Clubes', totales.clubes],
              ['Selección', totales.seleccion.convocatorias],
            ].map(([rotulo, valor]) => (
              <div key={String(rotulo)} className="rounded-lg border border-border px-2.5 py-2">
                <dt className="text-[10px] uppercase tracking-label text-ink-muted">{rotulo}</dt>
                <dd className="font-display text-xl font-semibold leading-none tabular">{valor}</dd>
              </div>
            ))}
          </dl>

          {veredicto.prime && (
            <section className="rounded-lg bg-board px-4 py-3">
              <h2 className="text-2xs font-medium uppercase tracking-label text-chalk-dim">Tu prime</h2>
              <p className="font-display text-2xl font-semibold uppercase tracking-label text-chalk">
                {veredicto.prime.desde}–{veredicto.prime.hasta} años
              </p>
              <p className="mt-0.5 text-xs text-chalk-dim">
                {veredicto.prime.partidos} partidos · {veredicto.prime.goles} goles ·{' '}
                {veredicto.prime.asistencias} asistencias · {veredicto.prime.trofeos} títulos · nota{' '}
                {veredicto.prime.notaMedia.toFixed(1)}
              </p>
            </section>
          )}

          <div className="grid gap-2 sm:grid-cols-2">
            {veredicto.mejorDecision && (
              <section className="rounded-lg border border-primary/35 bg-primary/8 p-3">
                <h2 className="text-[10px] uppercase tracking-label text-primary-ink">Tu mejor decisión</h2>
                <p className="mt-1 text-xs leading-snug">{veredicto.mejorDecision.texto}</p>
                <p className="mt-1 text-[10px] text-ink-muted">
                  {veredicto.mejorDecision.temporada} · {veredicto.mejorDecision.edad} años
                </p>
              </section>
            )}
            {veredicto.peorDecision && (
              <section className="rounded-lg border border-card-red/35 bg-card-red/8 p-3">
                <h2 className="text-[10px] uppercase tracking-label text-card-red-ink">La que te costó</h2>
                <p className="mt-1 text-xs leading-snug">{veredicto.peorDecision.texto}</p>
                <p className="mt-1 text-[10px] text-ink-muted">
                  {veredicto.peorDecision.temporada} · {veredicto.peorDecision.edad} años
                </p>
              </section>
            )}
          </div>

          {carrera.temporadas.length > 0 && <Trazo carrera={carrera} />}
        </div>
      </div>

      {/* La vitrina completa, al final: es el objeto de colección de la partida. */}
      {carrera.trofeos.length > 0 && (
        <section className="mt-6">
          <h2 className="mb-2 font-display text-sm font-semibold uppercase tracking-label">La vitrina</h2>
          <ul className="flex flex-wrap gap-1.5">
            {carrera.trofeos.map((trofeo, i) => (
              <li
                key={`${trofeo.id}-${i}`}
                className={`rounded-md px-2.5 py-1.5 text-xs ${
                  trofeo.clase === 'individual' ? 'bg-data/14' : 'bg-card-yellow/16'
                }`}
              >
                <span className="font-medium">{trofeo.nombre}</span>
                <span className="ml-1.5 tabular text-ink-muted">{trofeo.temporada}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <footer className="mt-7 flex flex-col gap-2 sm:flex-row">
        <button
          type="button"
          onClick={compartir}
          className="flex-1 cursor-pointer rounded-md bg-primary px-4 py-3 font-display text-base font-semibold uppercase tracking-label text-primary-contrast transition-opacity hover:opacity-90"
        >
          {copiado ? 'Enlace copiado' : 'Compartir mi leyenda'}
        </button>
        <button
          type="button"
          onClick={onEmpezarDeNuevo}
          className="flex-1 cursor-pointer rounded-md border border-border-strong px-4 py-3 font-display text-base font-semibold uppercase tracking-label transition-colors hover:bg-canvas-subtle"
        >
          Otra carrera
        </button>
      </footer>
      <p className="mt-2 break-all text-center text-[10px] text-ink-muted">{enlace}</p>
    </div>
  );
}

/**
 * La carrera en una línea: el OVR temporada por temporada, en SVG.
 *
 * Un gráfico y no una tabla porque la forma de una carrera se lee de un vistazo —la subida, el pico, la
 * bajada— y ese dibujo es lo que la gente reconoce como "su" carrera.
 */
function Trazo({ carrera }: { carrera: Carrera }) {
  const puntos = carrera.temporadas.map((t, i) => ({ x: i, y: t.ovrFin, edad: t.edad }));
  if (puntos.length < 2) return null;

  const maxY = Math.max(...puntos.map((p) => p.y));
  const minY = Math.min(...puntos.map((p) => p.y));
  const rango = Math.max(6, maxY - minY);
  const ancho = 100;
  const alto = 34;

  const coordenada = (p: { x: number; y: number }) => ({
    x: (p.x / (puntos.length - 1)) * ancho,
    y: alto - ((p.y - minY) / rango) * alto,
  });

  const linea = puntos.map(coordenada).map((c, i) => `${i === 0 ? 'M' : 'L'}${c.x.toFixed(1)} ${c.y.toFixed(1)}`).join(' ');
  const pico = puntos.reduce((alto2, p) => (p.y > alto2.y ? p : alto2), puntos[0] as { x: number; y: number; edad: number });
  const picoCoord = coordenada(pico);

  return (
    <section className="rounded-lg border border-border p-3">
      <h2 className="text-2xs font-medium uppercase tracking-label text-ink-muted">La forma de tu carrera</h2>
      <svg viewBox={`-2 -4 ${ancho + 12} ${alto + 12}`} className="mt-2 h-24 w-full" role="img" aria-label="Evolución de la media por temporada">
        <path d={linea} fill="none" stroke="var(--a-color-primary-ink)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx={picoCoord.x} cy={picoCoord.y} r="2.2" fill="var(--a-color-primary-ink)" />
        <text
          x={Math.min(picoCoord.x + 3, ancho - 8)}
          y={Math.max(picoCoord.y - 2, 2)}
          style={{ font: '600 5px var(--a-font-display)' }}
          fill="var(--a-color-text)"
        >
          {pico.y} a los {pico.edad}
        </text>
      </svg>
      <p className="text-[10px] text-ink-muted">
        De {puntos[0]?.y} a los {puntos[0]?.edad} hasta {puntos.at(-1)?.y} a los {puntos.at(-1)?.edad}.
      </p>
    </section>
  );
}
