import { useMemo, useState } from 'react';
import { NOMBRE_DE_PUESTO, esDestinoTardio, semillaDe, type DatosDeCreacion, type Mundo, type Puesto } from '@athena/leyenda';

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

export default function Creacion({ mundo, anio, onEmpezar }: Props) {
  const [nombre, setNombre] = useState('');
  const [dorsal, setDorsal] = useState(10);
  const [puesto, setPuesto] = useState<Puesto>('MO');
  const [pie, setPie] = useState<'derecha' | 'izquierda'>('derecha');
  /*
   * Las ligas donde se puede empezar una carrera: quedan afuera las de destino tardío —Arabia, Japón,
   * Canadá— que aparecen recién pasados los treinta, cuando son una decisión con sabor en lugar de un
   * mal comienzo. Ordenadas de la más chica a la más grande, porque empezar abajo y llegar arriba es
   * el juego; quien quiera arrancar en la Premier igual puede.
   */
  const ligas = useMemo(
    () => mundo.ligas.filter((l) => !esDestinoTardio(l)).sort((a, b) => a.peso - b.peso),
    [mundo.ligas],
  );
  const [ligaSlug, setLigaSlug] = useState(
    mundo.ligas.find((l) => l.slug === 'primera-division')?.slug ?? '',
  );
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
              Vas a ser de {liga.pais} y a debutar en un club mediano de esta liga. Si rendís, después
              llegan las ofertas de los grandes, de Sudamérica y de Europa.
            </p>
          )}
        </div>


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
