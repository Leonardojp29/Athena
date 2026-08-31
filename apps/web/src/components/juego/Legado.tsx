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
      /* Si el navegador no deja compartir ni copiar, no queda nada que hacer: el botón no miente. */
      setCopiado(false);
    }
  };

  const totales = veredicto.totales;

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-6">
      <header className="text-center">
        <p className="text-2xs font-medium uppercase tracking-label text-ink-muted">
          {ROTULO_DE_FINAL[carrera.retiro?.motivo ?? 'edad'] ??
            (carrera.retiro?.enCasa ? 'Se retiró en casa' : 'Fin de la carrera')}
        </p>
        <h1 className="mt-1 font-display text-3xl font-semibold uppercase leading-tight tracking-label">
          {veredicto.adn.titulo}
        </h1>
        <p className="mx-auto mt-2 max-w-lg text-sm leading-relaxed text-ink-muted">
          {veredicto.adn.descripcion}
        </p>
        {carrera.retiro?.relato && (
          <p className="mx-auto mt-3 max-w-md rounded-lg border border-card-red/35 bg-card-red/8 px-4 py-2.5 text-sm text-card-red-ink">
            {carrera.retiro.relato}
          </p>
        )}
      </header>

      <div className="mt-6 grid gap-5 lg:grid-cols-[19rem_1fr]">
        <div className="mx-auto w-full max-w-[19rem]">
          <Carta
            entra
            datos={{
              nombre: carrera.futbolista.nombre,
              dorsal: carrera.futbolista.dorsal,
              puesto: carrera.futbolista.puesto,
              costado: carrera.futbolista.costado,
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

      {/* Los clubes de tu vida, con su escudo y lo que ganaste en cada uno. */}
      <TarjetasDeClub carrera={carrera} />

      {/* La vitrina: los trofeos con su logo de verdad, agrupados. */}
      <Vitrina carrera={carrera} />

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
    </div>
  );
}

/**
 * Cómo se llama el final. Retirarse a los 38 en tu club y acabar sancionado a los 26 no son la misma
 * historia, y la pantalla no puede contarlas igual.
 */
const ROTULO_DE_FINAL: Record<string, string> = {
  edad: 'Fin de la carrera',
  decision: 'Colgó los botines',
  lesion: 'La carrera que el cuerpo cortó',
  sancion: 'La carrera que terminó fuera de la cancha',
  accidente: 'La carrera que se apagó',
};

/**
 * Los clubes de tu vida.
 *
 * La pantalla era un muro de texto —ocho cifras, tres párrafos y veinte etiquetas— y lo que la gente
 * quiere ver de una carrera son las camisetas que usó. Cada club es una tarjeta con su escudo, sus
 * colores, los años que estuviste y lo que ganaste ahí.
 */
function TarjetasDeClub({ carrera }: { carrera: Carrera }) {
  const clubes = useMemo(() => {
    const mapa = new Map<
      string,
      {
        nombre: string;
        escudo: string | null;
        color: string | null;
        desde: number;
        hasta: number;
        partidos: number;
        goles: number;
        asistencias: number;
        titulos: number;
      }
    >();
    for (const t of carrera.temporadas) {
      const previo = mapa.get(t.clubSlug);
      const titulos = carrera.trofeos.filter(
        (tr) => tr.clubSlug === t.clubSlug && tr.clase !== 'individual',
      ).length;
      mapa.set(t.clubSlug, {
        nombre: t.clubNombre,
        escudo: t.clubEscudo ?? null,
        color: t.clubColor ?? null,
        desde: previo?.desde ?? t.edad,
        hasta: t.edad + 1,
        partidos: (previo?.partidos ?? 0) + t.partidos,
        goles: (previo?.goles ?? 0) + t.goles,
        asistencias: (previo?.asistencias ?? 0) + t.asistencias,
        titulos,
      });
    }
    return [...mapa.values()];
  }, [carrera]);

  if (clubes.length === 0) return null;

  return (
    <section className="mt-7">
      <h2 className="mb-2.5 font-display text-sm font-semibold uppercase tracking-label">
        Las camisetas de tu vida
      </h2>
      <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {clubes.map((club) => {
          const tinte = club.color && /^[0-9a-f]{6}$/i.test(club.color) ? `#${club.color}` : null;
          return (
            <li
              key={club.nombre}
              className="relative overflow-hidden rounded-xl border border-border bg-surface p-3"
            >
              {tinte && (
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 opacity-[0.12]"
                  style={{ background: `linear-gradient(140deg, ${tinte}, transparent 62%)` }}
                />
              )}
              {club.escudo && (
                <img
                  src={club.escudo}
                  alt=""
                  aria-hidden="true"
                  className="pointer-events-none absolute -right-5 top-1/2 h-[150%] -translate-y-1/2 object-contain opacity-[0.07]"
                />
              )}

              <div className="relative flex items-center gap-2.5">
                {club.escudo ? (
                  <img src={club.escudo} alt="" width={32} height={32} className="size-8 shrink-0 object-contain" />
                ) : (
                  <span className="size-8 shrink-0 rounded-full bg-canvas-subtle" />
                )}
                <span className="min-w-0">
                  <span className="block truncate font-display text-base font-semibold uppercase leading-tight tracking-label">
                    {club.nombre}
                  </span>
                  <span className="block text-[10px] uppercase tracking-label tabular text-ink-muted">
                    {club.desde}–{club.hasta} años
                  </span>
                </span>
                {club.titulos > 0 && (
                  <span className="ml-auto flex shrink-0 items-center gap-1 text-xs tabular text-card-yellow">
                    <Trofeo /> {club.titulos}
                  </span>
                )}
              </div>

              <dl className="relative mt-2.5 flex gap-4">
                {[
                  ['PJ', club.partidos],
                  ['Goles', club.goles],
                  ['Asis', club.asistencias],
                ].map(([rotulo, valor]) => (
                  <div key={String(rotulo)}>
                    <dd className="font-display text-lg font-semibold leading-none tabular">{valor}</dd>
                    <dt className="mt-0.5 text-[9px] uppercase tracking-label text-ink-muted">{rotulo}</dt>
                  </div>
                ))}
              </dl>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/**
 * La vitrina.
 *
 * Agrupada por competencia y con el logo real: cuatro Premier son una línea con un ×4, no cuatro
 * etiquetas de texto iguales. Es el objeto de colección de la partida y tiene que verse como uno.
 */
function Vitrina({ carrera }: { carrera: Carrera }) {
  const grupos = useMemo(() => {
    const mapa = new Map<string, { nombre: string; escudo: string | null; clase: string; veces: number; anios: number[] }>();
    for (const trofeo of carrera.trofeos) {
      const clave = `${trofeo.nombre}|${trofeo.clase}`;
      const previo = mapa.get(clave);
      mapa.set(clave, {
        nombre: trofeo.nombre,
        escudo: trofeo.escudo ?? null,
        clase: trofeo.clase,
        veces: (previo?.veces ?? 0) + 1,
        anios: [...(previo?.anios ?? []), trofeo.temporada],
      });
    }
    const orden: Record<string, number> = { seleccion: 0, continental: 1, liga: 2, copa: 3, individual: 4 };
    return [...mapa.values()].sort((a, b) => (orden[a.clase] ?? 9) - (orden[b.clase] ?? 9) || b.veces - a.veces);
  }, [carrera.trofeos]);

  if (grupos.length === 0) {
    return (
      <section className="mt-7 rounded-xl border border-dashed border-border px-4 py-6 text-center">
        <p className="text-sm text-ink-muted">
          La vitrina quedó vacía. No todas las carreras se cuentan con trofeos.
        </p>
      </section>
    );
  }

  return (
    <section className="mt-7">
      <h2 className="mb-2.5 font-display text-sm font-semibold uppercase tracking-label">La vitrina</h2>
      <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {grupos.map((grupo) => (
          <li
            key={`${grupo.nombre}-${grupo.clase}`}
            className={`flex items-center gap-3 rounded-xl border p-3 ${
              grupo.clase === 'individual'
                ? 'border-data/30 bg-data/8'
                : grupo.clase === 'seleccion'
                  ? 'border-primary/40 bg-primary/8'
                  : 'border-card-yellow/30 bg-card-yellow/8'
            }`}
          >
            <span className="flex size-11 shrink-0 items-center justify-center">
              {grupo.escudo ? (
                <img src={grupo.escudo} alt="" width={44} height={44} className="max-h-11 max-w-11 object-contain" loading="lazy" />
              ) : (
                <span className={grupo.clase === 'individual' ? 'text-data' : 'text-card-yellow'}>
                  <Trofeo grande />
                </span>
              )}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium leading-tight">{grupo.nombre}</span>
              <span className="block truncate text-[10px] tabular text-ink-muted">
                {grupo.anios.sort((a, b) => a - b).join(' · ')}
              </span>
            </span>
            {grupo.veces > 1 && (
              <span className="shrink-0 font-display text-xl font-semibold tabular">×{grupo.veces}</span>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

function Trofeo({ grande = false }: { grande?: boolean }) {
  const lado = grande ? 30 : 13;
  return (
    <svg viewBox="0 0 24 24" width={lado} height={lado} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M8 4.5h8v4.2a4 4 0 0 1-8 0z" />
      <path d="M8 5.5H5.2v1.8A3.2 3.2 0 0 0 8.4 10.5M16 5.5h2.8v1.8a3.2 3.2 0 0 1-3.2 3.2" />
      <path d="M12 12.7v3.3M8.5 19.5h7" />
    </svg>
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
