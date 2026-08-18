import { useMemo, useState } from 'react';
import { NOMBRE_DE_PUESTO, semillaDe, type DatosDeCreacion, type Mundo, type Puesto, type Ritmo } from '@athena/leyenda';

/**
 * La creación: lo único que el jugador llena.
 *
 * Nombre, dorsal, puesto, pie, país y liga. **No se elige el club**: eso lo decide el mercado, acá y en
 * cada ventana de transferencias, ofreciendo hasta cuatro que te quieren. Un futbolista de dieciséis
 * años no elige dónde debutar, y esa es justamente la primera lección del juego.
 *
 * El país es la nacionalidad —define tu selección— y la liga es dónde arrancás. Pueden no coincidir: un
 * peruano que debuta en Argentina ya es una historia antes de jugar un partido.
 */

interface Props {
  mundo: Mundo;
  anio: number;
  onEmpezar: (datos: DatosDeCreacion) => void;
}

const PUESTOS: Puesto[] = ['POR', 'DFC', 'LAT', 'MC', 'MO', 'EXT', 'DC'];
const DORSALES = [1, 4, 5, 7, 8, 9, 10, 11, 14, 17, 20, 23];

const RITMOS: Array<{ id: Ritmo; nombre: string; detalle: string }> = [
  { id: 'expres', nombre: 'Exprés', detalle: 'Una carrera entera en unos minutos' },
  { id: 'normal', nombre: 'Normal', detalle: 'El equilibrio entre detalle y ritmo' },
  { id: 'intenso', nombre: 'Intenso', detalle: 'Cada temporada, con todas sus decisiones' },
];

export default function Creacion({ mundo, anio, onEmpezar }: Props) {
  const [nombre, setNombre] = useState('');
  const [dorsal, setDorsal] = useState(10);
  const [puesto, setPuesto] = useState<Puesto>('MO');
  const [pie, setPie] = useState<'derecha' | 'izquierda'>('derecha');
  const [ligaSlug, setLigaSlug] = useState(mundo.ligas.at(-1)?.slug ?? mundo.ligas[0]?.slug ?? '');
  const [ritmo, setRitmo] = useState<Ritmo>('normal');

  /* Las ligas de menor peso primero: es donde empieza una carrera de verdad. */
  const ligas = useMemo(() => [...mundo.ligas].sort((a, b) => a.peso - b.peso), [mundo.ligas]);
  const liga = ligas.find((l) => l.slug === ligaSlug) ?? ligas[0];

  const listo = nombre.trim().length >= 2 && liga !== undefined;

  const empezar = () => {
    if (!liga || !listo) return;
    onEmpezar({
      nombre: nombre.trim(),
      dorsal,
      puesto,
      pie,
      /* La nacionalidad sale del país de la liga elegida: quien empieza en Perú es peruano. */
      pais: liga.pais,
      paisCodigo: liga.paisCodigo,
      bandera: liga.bandera,
      ligaSlug: liga.slug,
      ritmo,
      semilla: semillaDe(`${nombre.trim()}|${dorsal}|${puesto}|${liga.slug}|${Date.now()}`),
      anio,
    });
  };

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-6">
      <header className="mb-6 text-center">
        <p className="text-2xs font-medium uppercase tracking-label text-primary-ink">Athena · Juegos</p>
        <h1 className="mt-1 font-display text-3xl font-semibold uppercase tracking-label">Mi Leyenda</h1>
        <p className="mx-auto mt-2 max-w-md text-sm text-ink-muted">
          No te damos una carrera: te damos la oportunidad de crearla. Elegí quién sos y dónde empezás;
          los clubes que te quieran van a aparecer después.
        </p>
      </header>

      <form
        className="flex flex-col gap-5 rounded-xl border border-border bg-surface p-4 sm:p-5"
        onSubmit={(evento) => {
          evento.preventDefault();
          empezar();
        }}
      >
        <div>
          <label htmlFor="nombre" className="mb-1.5 block text-2xs font-medium uppercase tracking-label text-ink-muted">
            Tu nombre
          </label>
          <input
            id="nombre"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            maxLength={28}
            autoComplete="off"
            placeholder="Nombre y apellido"
            className="w-full rounded-md border border-border bg-canvas-subtle px-3 py-2 text-base outline-none transition-colors focus:border-primary-ink"
          />
        </div>

        <fieldset>
          <legend className="mb-1.5 text-2xs font-medium uppercase tracking-label text-ink-muted">Puesto</legend>
          <div className="flex flex-wrap gap-1.5">
            {PUESTOS.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPuesto(p)}
                aria-pressed={puesto === p}
                className="cursor-pointer rounded-md border border-border px-2.5 py-1.5 text-sm transition-colors hover:border-border-strong aria-pressed:border-primary-ink aria-pressed:bg-primary/12 aria-pressed:font-medium"
              >
                {p}
                <span className="sr-only"> — {NOMBRE_DE_PUESTO[p]}</span>
              </button>
            ))}
          </div>
          <p className="mt-1.5 text-2xs text-ink-muted">{NOMBRE_DE_PUESTO[puesto]}</p>
        </fieldset>

        <div className="grid gap-4 sm:grid-cols-2">
          <fieldset>
            <legend className="mb-1.5 text-2xs font-medium uppercase tracking-label text-ink-muted">Dorsal</legend>
            <div className="flex flex-wrap gap-1.5">
              {DORSALES.map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setDorsal(n)}
                  aria-pressed={dorsal === n}
                  className="w-9 cursor-pointer rounded-md border border-border py-1.5 text-center font-display text-sm font-semibold tabular transition-colors hover:border-border-strong aria-pressed:border-primary-ink aria-pressed:bg-primary/12"
                >
                  {n}
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend className="mb-1.5 text-2xs font-medium uppercase tracking-label text-ink-muted">Pie hábil</legend>
            <div className="flex gap-1.5">
              {(['derecha', 'izquierda'] as const).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPie(p)}
                  aria-pressed={pie === p}
                  className="flex-1 cursor-pointer rounded-md border border-border px-3 py-1.5 text-sm capitalize transition-colors hover:border-border-strong aria-pressed:border-primary-ink aria-pressed:bg-primary/12 aria-pressed:font-medium"
                >
                  {p}
                </button>
              ))}
            </div>
          </fieldset>
        </div>

        <div>
          <label htmlFor="liga" className="mb-1.5 block text-2xs font-medium uppercase tracking-label text-ink-muted">
            Dónde empezás
          </label>
          <select
            id="liga"
            value={ligaSlug}
            onChange={(e) => setLigaSlug(e.target.value)}
            className="w-full cursor-pointer rounded-md border border-border bg-canvas-subtle px-3 py-2 text-base outline-none transition-colors focus:border-primary-ink"
          >
            {ligas.map((l) => (
              <option key={l.slug} value={l.slug}>
                {l.nombre} · {l.pais}
              </option>
            ))}
          </select>
          {liga && (
            <p className="mt-1.5 text-2xs text-ink-muted">
              {liga.clubes.length} clubes reales. Vas a ser {liga.pais === 'Internacional' ? 'internacional' : `de ${liga.pais}`}, y
              los clubes que te quieran salen de esta liga.
            </p>
          )}
        </div>

        <fieldset>
          <legend className="mb-1.5 text-2xs font-medium uppercase tracking-label text-ink-muted">Ritmo</legend>
          <div className="grid gap-1.5 sm:grid-cols-3">
            {RITMOS.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => setRitmo(r.id)}
                aria-pressed={ritmo === r.id}
                className="cursor-pointer rounded-md border border-border px-3 py-2 text-left transition-colors hover:border-border-strong aria-pressed:border-primary-ink aria-pressed:bg-primary/12"
              >
                <span className="block font-display text-sm font-semibold uppercase tracking-label">{r.nombre}</span>
                <span className="mt-0.5 block text-[10px] leading-snug text-ink-muted">{r.detalle}</span>
              </button>
            ))}
          </div>
        </fieldset>

        <button
          type="submit"
          disabled={!listo}
          className="cursor-pointer rounded-md bg-primary px-4 py-3 font-display text-base font-semibold uppercase tracking-label text-primary-contrast transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Empezar la carrera
        </button>
      </form>
    </div>
  );
}
