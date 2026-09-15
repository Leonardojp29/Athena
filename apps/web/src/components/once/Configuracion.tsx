import { banderaDePais } from '../../lib/entorno';
import type { Catalogo, DificultadElegida } from '@athena/adivina-el-xi';
import { DURACION_MS } from '@athena/adivina-el-xi';
import { relojDe } from '../../lib/adivina';
import { Icono } from './Icono';

interface Props {
  catalogo: Catalogo;
  dificultad: DificultadElegida;
  conTiempo: boolean;
  cargando: boolean;
  error: string | null;
  onCatalogo: (valor: Catalogo) => void;
  onDificultad: (valor: DificultadElegida) => void;
  onTiempo: (valor: boolean) => void;
  onJugar: () => void;
  /** Lo que la ruleta señala mientras gira; null cuando no hay sorteo en curso. */
  girando: { catalogo: Catalogo | null; dificultad: DificultadElegida | null } | null;
}

/* La bandera del país sale del proveedor, igual que en el resto del sitio. */
const BANDERA_PERU = banderaDePais('pe');

/*
 * Cada opción lleva su tinta del sistema, nunca un hex: el icono sigue heredando `currentColor` y
 * lo que elige el color es la clase del contenedor. En la dificultad el color acompaña a la cuenta
 * de estrellas —verde una, ámbar dos, rojo tres—, así que nadie depende de distinguir tonos.
 */
type Marca =
  | { icono: 'mundial' | 'pelota' | 'dado' | 'estrella' | 'reloj' | 'reloj-libre'; cuantas?: number; tinta: string }
  | 'peru';

const CATALOGOS: Array<{ valor: Catalogo; nombre: string; linea: string; marca: Marca }> = [
  {
    valor: 'internacional',
    nombre: 'Internacional',
    linea: 'Mundiales, Champions y las ligas grandes',
    marca: { icono: 'mundial', tinta: 'text-data-ink' },
  },
  { valor: 'peruano', nombre: 'Peruano', linea: 'La bicolor y los clubes peruanos', marca: 'peru' },
  {
    valor: 'mixto',
    nombre: 'Mixto',
    linea: 'Mitad y mitad, sin favoritos',
    marca: { icono: 'pelota', tinta: 'text-win-ink' },
  },
  {
    valor: 'aleatorio',
    nombre: 'Aleatorio',
    linea: 'Que decida el juego',
    marca: { icono: 'dado', tinta: 'text-card-yellow-ink' },
  },
];

/* Una estrella por escalón: la dificultad se mide de un vistazo y sin leer. */
const DIFICULTADES: Array<{ valor: DificultadElegida; nombre: string; linea: string; marca: Marca }> = [
  {
    valor: 'facil',
    nombre: 'Fácil',
    linea: 'Onces que todo el mundo recuerda',
    marca: { icono: 'estrella', cuantas: 1, tinta: 'text-win-ink' },
  },
  {
    valor: 'normal',
    nombre: 'Normal',
    linea: 'Hay que pensarlo un poco',
    marca: { icono: 'estrella', cuantas: 2, tinta: 'text-card-yellow-ink' },
  },
  {
    valor: 'dificil',
    nombre: 'Difícil',
    linea: 'Para memoriosos de verdad',
    marca: { icono: 'estrella', cuantas: 3, tinta: 'text-card-red-ink' },
  },
  {
    valor: 'aleatorio',
    nombre: 'Aleatorio',
    linea: 'Cambia en cada partida',
    marca: { icono: 'dado', tinta: 'text-card-yellow-ink' },
  },
];

export function Configuracion({
  catalogo,
  dificultad,
  conTiempo,
  cargando,
  error,
  onCatalogo,
  onDificultad,
  onTiempo,
  onJugar,
  girando,
}: Props) {
  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8 sm:py-12">
      <header className="text-center">
        <h1 className="font-display text-3xl font-semibold uppercase tracking-label sm:text-4xl">
          Adivina el XI
        </h1>
        <p className="mx-auto mt-2 max-w-md text-sm text-ink-muted">
          Te damos el partido. Tú tienes que acordarte de los once que salieron a la cancha.
        </p>
      </header>

      <div className="mt-8 space-y-6">
        <Paso numero={1} titulo="Qué fútbol">
          {CATALOGOS.map((opcion) => (
            <Opcion
              key={opcion.valor}
              elegida={girando ? false : catalogo === opcion.valor}
              sorteada={girando?.catalogo === opcion.valor}
              onClick={() => onCatalogo(opcion.valor)}
              {...opcion}
            />
          ))}
        </Paso>

        <Paso numero={2} titulo="Qué tan difícil">
          {DIFICULTADES.map((opcion) => (
            <Opcion
              key={opcion.valor}
              elegida={girando ? false : dificultad === opcion.valor}
              sorteada={girando?.dificultad === opcion.valor}
              onClick={() => onDificultad(opcion.valor)}
              {...opcion}
            />
          ))}
        </Paso>

        <Paso numero={3} titulo="Contra reloj">
          <Opcion
            elegida={conTiempo}
            nombre="Con tiempo"
            linea={`${relojDe(DURACION_MS)} para encontrar a los once`}
            marca={{ icono: 'reloj', tinta: 'text-primary-ink' }}
            onClick={() => onTiempo(true)}
          />
          <Opcion
            elegida={!conTiempo}
            nombre="Sin tiempo"
            linea="Sin apuro, hasta que te rindas"
            marca={{ icono: 'reloj-libre', tinta: 'text-ink-muted' }}
            onClick={() => onTiempo(false)}
          />
        </Paso>
      </div>

      {error && (
        <p className="mt-6 rounded-lg border border-card-red/50 bg-card-red/10 px-3 py-2 text-center text-sm">
          {error}
        </p>
      )}

      <button
        type="button"
        data-jugar
        disabled={cargando}
        onClick={onJugar}
        className={[
          'mt-8 flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-6 py-3.5',
          'font-display text-lg font-semibold uppercase tracking-label text-primary-contrast',
          'shadow-magnet transition-transform duration-200 ease-athena',
          'hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2',
          'focus-visible:outline-primary-ink disabled:opacity-60 disabled:hover:translate-y-0',
        ].join(' ')}
      >
        {girando ? 'Sorteando…' : cargando ? 'Buscando partido…' : 'Jugar'}
      </button>
    </div>
  );
}

function Paso({ numero, titulo, children }: { numero: number; titulo: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-2.5 flex items-center gap-2 font-display text-xs font-semibold uppercase tracking-label text-ink-muted">
        <span className="grid size-5 place-items-center rounded-full border border-border-strong text-[10px] tabular">
          {numero}
        </span>
        {titulo}
      </h2>
      <div className="grid gap-2 sm:grid-cols-2">{children}</div>
    </section>
  );
}

/*
 * La elegida se marca con el filo grueso de `primary-ink` y el fondo tenue del relleno, nunca solo
 * con color: el borde cambia de grosor y el icono de tinta, así se distingue sin depender del tono.
 */
function Opcion({
  elegida,
  sorteada = false,
  nombre,
  linea,
  marca,
  onClick,
}: {
  elegida: boolean;
  sorteada?: boolean;
  nombre: string;
  linea: string;
  marca: Marca;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={elegida}
      onClick={onClick}
      className={[
        'flex items-center gap-3 rounded-lg border px-3 py-2.5 text-left',
        /* Rápido al girar la ruleta y con el compás normal el resto del tiempo. */
        sorteada ? 'transition-none' : 'transition-[background-color,border-color] duration-200',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-ink',
        sorteada
          ? 'border-2 border-card-yellow bg-card-yellow/20'
          : elegida
            ? 'border-2 border-primary-ink bg-primary/10'
            : 'border-border hover:border-border-strong hover:bg-canvas-subtle',
      ].join(' ')}
    >
      <Marca marca={marca} />
      <span className="min-w-0">
        <span className="block font-display text-sm font-semibold uppercase tracking-label">
          {nombre}
        </span>
        <span className="mt-0.5 block text-2xs leading-snug text-ink-muted">{linea}</span>
      </span>
    </button>
  );
}

function Marca({ marca }: { marca: Marca }) {
  if (marca === 'peru') {
    return (
      <img
        src={BANDERA_PERU}
        alt=""
        width="24"
        height="17"
        className="h-[17px] w-6 shrink-0 rounded-[2px] object-cover ring-1 ring-border"
      />
    );
  }

  if (marca.cuantas) {
    return (
      <span className={`flex shrink-0 gap-0.5 ${marca.tinta}`}>
        {Array.from({ length: marca.cuantas }, (_, i) => (
          <Icono key={i} nombre={marca.icono} size={15} />
        ))}
      </span>
    );
  }

  return (
    <span className={`shrink-0 ${marca.tinta}`}>
      <Icono nombre={marca.icono} size={22} />
    </span>
  );
}
