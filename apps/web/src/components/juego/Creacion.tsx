import { useMemo, useState } from 'react';
import {
  esDestinoTardio,
  nombreDePuesto,
  semillaDe,
  siglaDePuesto,
  type Costado,
  type DatosDeCreacion,
  type LigaLiviana,
  type MundoLiviano,
  type Puesto,
} from '@athena/leyenda';

/**
 * La creación: lo único que el jugador llena.
 *
 * Nombre, nacionalidad, dorsal, puesto, pie y liga. **No se elige el club**: eso lo decide el mercado,
 * aquí y en cada ventana de transferencias, ofreciendo hasta cuatro que te quieren. Un futbolista de
 * dieciséis años no elige dónde debutar, y esa es justamente la primera lección del juego.
 *
 * La nacionalidad y la liga son dos cosas distintas y se eligen por separado: una define tu selección
 * y la otra dónde debutas. Un peruano que arranca en Argentina ya es una historia antes de jugar un
 * partido, y atarlas —como estaban— borraba la mitad de las carreras posibles.
 *
 * Nada de esto se elige en una lista desplegable. Un puesto se señala en la cancha y una liga se
 * reconoce por su escudo: pedirlo en un `<select>` es pedirle al jugador que lea lo que podría ver.
 */

interface Props {
  mundo: MundoLiviano;
  anio: number;
  onEmpezar: (datos: DatosDeCreacion) => void;
}

const DORSALES = [1, 4, 5, 7, 8, 9, 10, 11, 14, 17, 20, 23];

/*
 * Los nueve lugares de la cancha, en porcentaje: el arco propio abajo, el rival arriba. Están donde
 * están en un 4-3-3 real, que es lo que hace que se lea sin leyenda. Lateral y extremo aparecen dos
 * veces, uno por banda: nadie dice "extremo", dice "extremo izquierdo".
 */
const LUGARES: Array<{ puesto: Puesto; costado?: Costado; x: number; y: number; que: string }> = [
  { puesto: 'POR', x: 50, y: 90, que: 'Bajo los tres palos. Otro juego, otra carta.' },
  { puesto: 'LAT', costado: 'izquierda', x: 14, y: 72, que: 'Toda la banda izquierda, los noventa minutos.' },
  { puesto: 'DFC', x: 50, y: 76, que: 'El que ordena atrás y sale jugando.' },
  { puesto: 'LAT', costado: 'derecha', x: 86, y: 72, que: 'Toda la banda derecha, los noventa minutos.' },
  { puesto: 'MC', x: 50, y: 57, que: 'El que reparte. La pelota pasa por ti.' },
  { puesto: 'EXT', costado: 'izquierda', x: 14, y: 34, que: 'Uno contra uno por izquierda, siempre hacia adelante.' },
  { puesto: 'MO', x: 50, y: 39, que: 'El último pase y el gol de afuera.' },
  { puesto: 'EXT', costado: 'derecha', x: 86, y: 34, que: 'Uno contra uno por derecha, siempre hacia adelante.' },
  { puesto: 'DC', x: 50, y: 17, que: 'El que la mete. Nadie recuerda al segundo.' },
];

const claveDe = (puesto: Puesto, costado?: Costado) => `${puesto}:${costado ?? ''}`;

export default function Creacion({ mundo, anio, onEmpezar }: Props) {
  const [nombre, setNombre] = useState('');
  const [dorsal, setDorsal] = useState(10);
  const [lugar, setLugar] = useState(claveDe('MO'));
  const [pie, setPie] = useState<'derecha' | 'izquierda'>('derecha');

  const elegido = LUGARES.find((l) => claveDe(l.puesto, l.costado) === lugar) ?? LUGARES[6];

  /*
   * Las ligas donde se puede empezar una carrera: quedan fuera las de destino tardío —Arabia, Japón,
   * la MLS— que aparecen recién pasados los treinta, cuando son una decisión con sabor en lugar de un
   * mal comienzo. Ordenadas de la más chica a la más grande, porque empezar abajo y llegar arriba es
   * el juego; quien quiera arrancar en la Premier igual puede.
   */
  const ligas = useMemo(
    () => mundo.ligas.filter((l) => !esDestinoTardio(l)).sort((a, b) => a.peso - b.peso),
    [mundo.ligas],
  );

  /* Las nacionalidades salen de los países que el mundo conoce, sin repetir. */
  const paises = useMemo(() => {
    const vistos = new Map<string, { pais: string; codigo: string | null; bandera: string | null }>();
    for (const liga of mundo.ligas) {
      const clave = liga.paisCodigo ?? liga.pais;
      if (!vistos.has(clave)) {
        vistos.set(clave, { pais: liga.pais, codigo: liga.paisCodigo, bandera: liga.bandera });
      }
    }
    return [...vistos.values()].sort((a, b) => a.pais.localeCompare(b.pais, 'es'));
  }, [mundo.ligas]);

  const [ligaSlug, setLigaSlug] = useState(
    ligas.find((l) => l.slug === 'primera-division' && l.pais === 'Perú')?.slug ?? ligas[0]?.slug ?? '',
  );
  const liga = ligas.find((l) => l.slug === ligaSlug) ?? ligas[0];

  const [paisClave, setPaisClave] = useState<string>(liga?.paisCodigo ?? liga?.pais ?? '');
  const pais = paises.find((p) => (p.codigo ?? p.pais) === paisClave) ?? paises[0];

  const listo = nombre.trim().length >= 2 && liga !== undefined && pais !== undefined;
  const emigra = liga && pais && (liga.paisCodigo ?? liga.pais) !== (pais.codigo ?? pais.pais);

  const empezar = () => {
    if (!liga || !pais || !listo || !elegido) return;
    onEmpezar({
      nombre: nombre.trim(),
      dorsal,
      puesto: elegido.puesto,
      ...(elegido.costado ? { costado: elegido.costado } : {}),
      pie,
      pais: pais.pais,
      paisCodigo: pais.codigo,
      bandera: pais.bandera,
      ligaSlug: liga.slug,
      semilla: semillaDe(`${nombre.trim()}|${dorsal}|${lugar}|${liga.slug}|${Date.now()}`),
      anio,
    });
  };

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-4">
      <header className="mb-3 text-center">
        <p className="text-2xs font-medium uppercase tracking-label text-primary-ink">Athena · Juegos</p>
        <h1 className="mt-0.5 font-display text-3xl font-semibold uppercase leading-none tracking-label sm:text-4xl">
          Mi Leyenda
        </h1>
        <p className="mx-auto mt-2 max-w-xl text-sm text-ink-muted">
          No te damos una carrera: te damos la oportunidad de crearla. Doce capítulos, de los dieciséis
          a los treinta y ocho. Los clubes que te quieran van a aparecer solos.
        </p>
      </header>

      <form
        className="flex flex-col gap-3"
        onSubmit={(evento) => {
          evento.preventDefault();
          empezar();
        }}
      >
        <div className="grid items-stretch gap-3 lg:grid-cols-2 xl:grid-cols-3">
          {/* Quién eres. */}
          <div className="flex flex-col gap-3.5 rounded-xl border border-border bg-surface p-4">
            <Rotulo numero={1}>Quién eres</Rotulo>

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
                className="w-full rounded-lg border border-border bg-canvas-subtle px-3 py-2.5 text-base outline-none transition-colors focus:border-primary-ink"
              />
            </div>

            <fieldset className="flex min-h-0 flex-1 flex-col">
              <legend className="mb-1.5 text-2xs font-medium uppercase tracking-label text-ink-muted">
                Nacionalidad
              </legend>
              <div className="flex min-h-[7rem] max-h-[22rem] flex-1 flex-wrap content-start gap-1.5 overflow-y-auto pr-1 [mask-image:linear-gradient(to_bottom,black_calc(100%-1.25rem),transparent)]">
                {paises.map((p) => {
                  const clave = p.codigo ?? p.pais;
                  return (
                    <button
                      key={clave}
                      type="button"
                      onClick={() => setPaisClave(clave)}
                      aria-pressed={paisClave === clave}
                      className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-border px-2 py-1.5 text-xs transition-[colors,transform] duration-200 hover:-translate-y-px hover:border-border-strong aria-pressed:border-primary-ink aria-pressed:bg-primary/12 aria-pressed:font-medium"
                    >
                      {p.bandera && (
                        <img src={p.bandera} alt="" width={18} height={13} className="rounded-[1px] object-cover" />
                      )}
                      {p.pais}
                    </button>
                  );
                })}
              </div>
            </fieldset>

            <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
              <fieldset>
                <legend className="mb-1.5 text-2xs font-medium uppercase tracking-label text-ink-muted">Dorsal</legend>
                <div className="flex flex-wrap gap-1.5">
                  {DORSALES.map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setDorsal(n)}
                      aria-pressed={dorsal === n}
                      className="w-9 cursor-pointer rounded-lg border border-border py-1.5 text-center font-display text-sm font-semibold tabular transition-[colors,transform] duration-200 hover:-translate-y-px hover:border-border-strong aria-pressed:border-primary-ink aria-pressed:bg-primary/12"
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </fieldset>

              <fieldset>
                <legend className="mb-1.5 text-2xs font-medium uppercase tracking-label text-ink-muted">Pie hábil</legend>
                <div className="flex gap-1.5">
                  {(['izquierda', 'derecha'] as const).map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setPie(p)}
                      aria-pressed={pie === p}
                      className="group flex w-[4.5rem] cursor-pointer flex-col items-center gap-1 rounded-lg border border-border px-2 py-2 transition-[colors,transform] duration-200 hover:-translate-y-px hover:border-border-strong aria-pressed:border-primary-ink aria-pressed:bg-primary/12"
                    >
                      <Botin lado={p} />
                      <span className="text-[10px] font-medium capitalize leading-none">{p}</span>
                    </button>
                  ))}
                </div>
              </fieldset>
            </div>
          </div>

          {/* Dónde juegas: la cancha es el selector. */}
          <div className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-4">
            <Rotulo numero={2}>Dónde juegas</Rotulo>
            <div className="flex flex-1 flex-col justify-center gap-3">
            <Cancha lugar={lugar} onElegir={setLugar} dorsal={dorsal} />
            <p className="text-center">
              <span className="block font-display text-lg font-semibold uppercase leading-none tracking-label">
                {nombreDePuesto(elegido.puesto, elegido.costado)}
              </span>
              <span className="mt-1 block text-xs text-ink-muted">{elegido.que}</span>
            </p>
            </div>
          </div>

          {/* Dónde empiezas: las ligas con su escudo, de la más chica a la más grande. */}
          <div className="flex flex-col gap-2.5 rounded-xl border border-border bg-surface p-4 lg:col-span-2 xl:col-span-1">
            <Rotulo numero={3}>Dónde empiezas</Rotulo>
            <p className="-mt-1 text-2xs text-ink-muted">
              De la más chica a la más grande. Empezar abajo es el juego.
            </p>

            <fieldset className="flex min-h-0 flex-1 flex-col">
              <legend className="sr-only">Liga donde debutas</legend>
              <div className="grid min-h-[11rem] max-h-[30rem] flex-1 content-start gap-1.5 overflow-y-auto pr-1 sm:grid-cols-2 xl:grid-cols-1 [mask-image:linear-gradient(to_bottom,black_calc(100%-1.25rem),transparent)]">
                {ligas.map((l) => (
                  <FichaDeLiga key={l.slug} liga={l} elegida={l.slug === ligaSlug} onElegir={() => setLigaSlug(l.slug)} />
                ))}
              </div>
            </fieldset>

            {liga && pais && (
              <p className="text-xs text-ink-muted">
                {emigra ? (
                  <>
                    Eres de <b className="font-medium text-ink">{pais.pais}</b> y te vas a probar a{' '}
                    <b className="font-medium text-ink">{liga.pais}</b> con dieciséis años. Juegas para la
                    selección de {pais.pais}, y fuera de casa siempre se empieza cuesta arriba.
                  </>
                ) : (
                  <>
                    Debutas en tu país, en un club mediano de {liga.nombre}. Si rindes, después llegan las
                    ofertas de los grandes, del continente y de Europa.
                  </>
                )}
              </p>
            )}
          </div>
        </div>

        <button
          type="submit"
          disabled={!listo}
          className="cursor-pointer rounded-lg bg-primary px-4 py-3 font-display text-base font-semibold uppercase tracking-label text-primary-contrast transition-[opacity,transform] duration-200 hover:opacity-90 active:scale-[0.995] disabled:cursor-not-allowed disabled:opacity-40"
        >
          Empezar la carrera
        </button>
      </form>
    </div>
  );
}

function Rotulo({ numero, children }: { numero: number; children: React.ReactNode }) {
  return (
    <h2 className="flex items-center gap-2 font-display text-sm font-semibold uppercase tracking-label">
      <span className="grid size-5 place-items-center rounded-full bg-primary text-[11px] tabular text-primary-contrast">
        {numero}
      </span>
      {children}
    </h2>
  );
}

/** La silueta de un botín, visto de perfil. El derecho es el mismo dibujo espejado. */
function Botin({ lado }: { lado: Costado }) {
  return (
    <svg
      viewBox="0 0 40 24"
      width="34"
      height="20"
      aria-hidden="true"
      className="text-ink-muted transition-colors duration-200 group-aria-pressed:text-primary-ink"
      style={lado === 'derecha' ? { transform: 'scaleX(-1)' } : undefined}
    >
      <path
        fill="currentColor"
        d="M3.4 4.2c0-1 .8-1.7 1.8-1.6l4.6.5c.9.1 1.6.7 1.9 1.5l1.6 4.3c.3.8 1 1.4 1.9 1.6l14 2.6c3 .6 5.2 3.1 5.4 6.1l.1 1.5c.1.9-.6 1.7-1.5 1.7H5.1c-1 0-1.7-.8-1.7-1.7z"
      />
      <path fill="currentColor" opacity="0.45" d="M6 22.4h3.2v1.6H6zM13 22.4h3.2v1.6H13zM20 22.4h3.2v1.6H20zM27 22.4h3.2v1.6H27z" />
    </svg>
  );
}

function FichaDeLiga({ liga, elegida, onElegir }: { liga: LigaLiviana; elegida: boolean; onElegir: () => void }) {
  return (
    <button
      type="button"
      onClick={onElegir}
      aria-pressed={elegida}
      className="group flex cursor-pointer items-center gap-2.5 rounded-lg border border-border px-2.5 py-2 text-left transition-[colors,transform,box-shadow] duration-200 ease-out hover:-translate-y-px hover:border-border-strong hover:shadow-sm aria-pressed:border-primary-ink aria-pressed:bg-primary/10"
    >
      {liga.escudo ? (
        <img
          src={liga.escudo}
          alt=""
          width={26}
          height={26}
          loading="lazy"
          className="size-[26px] shrink-0 object-contain transition-transform duration-300 group-hover:scale-110"
        />
      ) : liga.bandera ? (
        <img src={liga.bandera} alt="" width={24} height={17} className="shrink-0 rounded-[1px] object-cover" />
      ) : (
        <span className="size-[26px] shrink-0 rounded-full bg-canvas-subtle" />
      )}
      <span className="min-w-0">
        <span className="block truncate text-xs font-medium leading-tight">{liga.nombre}</span>
        <span className="block truncate text-[10px] uppercase tracking-label text-ink-muted">{liga.pais}</span>
      </span>
    </button>
  );
}

/**
 * La cancha: el puesto se señala, no se lee.
 *
 * Vista desde arriba con el arco propio abajo. Cada lugar es un botón de verdad sobre el césped —se
 * llega con el tabulador y se activa con Enter— y el elegido lleva tu dorsal puesto.
 */
function Cancha({
  lugar,
  dorsal,
  onElegir,
}: {
  lugar: string;
  dorsal: number;
  onElegir: (lugar: string) => void;
}) {
  return (
    <div className="relative mx-auto aspect-[3/4] max-h-[43vh] w-full max-w-[19rem] overflow-hidden rounded-lg border border-board-edge bg-board">
      <svg viewBox="0 0 100 133" className="absolute inset-0 size-full" aria-hidden="true">
        <defs>
          <linearGradient id="cesped" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="oklch(0.32 0.06 152)" />
            <stop offset="100%" stopColor="oklch(0.24 0.05 152)" />
          </linearGradient>
        </defs>
        <rect width="100" height="133" fill="url(#cesped)" />
        {/* Las franjas del corte: lo primero que uno reconoce de una cancha. */}
        {Array.from({ length: 8 }, (_, i) => (
          <rect key={i} y={i * 16.6} width="100" height="16.6" fill="oklch(1 0 0)" opacity={i % 2 === 0 ? 0.028 : 0} />
        ))}
        <g fill="none" stroke="oklch(1 0 0 / 0.3)" strokeWidth="0.7">
          <rect x="5" y="5" width="90" height="123" />
          <line x1="5" y1="66.5" x2="95" y2="66.5" />
          <circle cx="50" cy="66.5" r="14" />
          <rect x="26" y="5" width="48" height="18" />
          <rect x="38" y="5" width="24" height="8" />
          <rect x="26" y="110" width="48" height="18" />
          <rect x="38" y="120" width="24" height="8" />
        </g>
        <circle cx="50" cy="66.5" r="1.1" fill="oklch(1 0 0 / 0.35)" />
      </svg>

      {LUGARES.map((l) => {
        const clave = claveDe(l.puesto, l.costado);
        const activo = clave === lugar;
        const sigla = siglaDePuesto(l.puesto, l.costado);
        return (
          <button
            key={clave}
            type="button"
            onClick={() => onElegir(clave)}
            aria-pressed={activo}
            aria-label={`${sigla} — ${nombreDePuesto(l.puesto, l.costado)}`}
            className={`absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer rounded-full font-display font-semibold tabular outline-none transition-[transform,background-color,color,box-shadow] duration-300 ease-out focus-visible:ring-2 focus-visible:ring-primary ${
              activo
                ? 'z-10 size-11 scale-105 bg-primary text-base text-primary-contrast shadow-magnet'
                : 'size-8 bg-chalk/12 text-[11px] text-chalk hover:scale-110 hover:bg-chalk/22'
            }`}
            style={{ left: `${l.x}%`, top: `${l.y}%` }}
          >
            <span aria-hidden="true">{activo ? dorsal : sigla}</span>
          </button>
        );
      })}
    </div>
  );
}
