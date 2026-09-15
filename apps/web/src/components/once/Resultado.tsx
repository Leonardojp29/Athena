import type { Resumen } from '@athena/adivina-el-xi';
import type { RetoParaJugar, TitularRevelado } from '../../lib/api';
import { fotoDe, relojDe } from '../../lib/adivina';

interface Props {
  reto: RetoParaJugar;
  resumen: Resumen;
  solucion: TitularRevelado[];
  acertados: Set<string>;
  onSiguiente: () => void;
  onVolver: () => void;
  cargando: boolean;
}

export function Resultado({ reto, resumen, solucion, acertados, onSiguiente, onVolver, cargando }: Props) {
  const perfecto = resumen.aciertos === resumen.total;

  return (
    <div data-resultado className="mx-auto w-full max-w-2xl px-4 py-8">
      <header className="animate-once-entra text-center">
        <p className="text-xs uppercase tracking-label text-ink-muted">
          {reto.objetivoNombre} · {reto.competencia} {reto.temporada}
        </p>
        <p className="mt-3 font-display text-6xl font-semibold tabular text-ink">
          {resumen.aciertos}
          <span className="text-ink-muted">/{resumen.total}</span>
        </p>
        <p className="mt-1 font-display text-sm font-semibold uppercase tracking-label text-primary-ink">
          {perfecto ? 'Once de once' : resumen.desenlace === 'sin-tiempo' ? 'Se acabó el tiempo' : 'Partida terminada'}
        </p>
      </header>

      <dl className="mt-6 grid grid-cols-3 gap-2 text-center">
        <Dato
          nombre={resumen.desenlace === 'sin-tiempo' ? 'Tiempo' : 'Tardaste'}
          valor={resumen.tardoMs === null ? 'sin reloj' : relojDe(resumen.tardoMs)}
        />
        <Dato nombre="Pistas" valor={String(resumen.pistas)} />
        <Dato nombre="Fallos" valor={String(resumen.fallos)} />
      </dl>

      <h2 className="mt-8 font-display text-xs font-semibold uppercase tracking-label text-ink-muted">
        El once completo
      </h2>
      <ul className="mt-2 grid gap-1.5 sm:grid-cols-2">
        {solucion.map((titular) => {
          const acertado = acertados.has(titular.ref);
          return (
            <li key={titular.ref}>
              <a
                href={`/jugadores/${titular.slug}`}
                className={[
                  'flex items-center gap-2.5 rounded-lg border px-2.5 py-1.5 transition-colors duration-200',
                  acertado
                    ? 'border-win bg-win/10 hover:border-win'
                    : 'border-border hover:border-border-strong',
                ].join(' ')}
              >
                <img
                  src={titular.fotoUrl ?? fotoDe(titular.ref)}
                  alt=""
                  width="30"
                  height="30"
                  loading="lazy"
                  className={`size-[30px] shrink-0 rounded-full bg-canvas-subtle object-cover ${acertado ? '' : 'grayscale'}`}
                />
                <span className={`truncate text-sm ${acertado ? 'text-ink' : 'text-ink-muted'}`}>
                  {titular.nombre}
                </span>
                {/* El color no es el único canal: el que faltó lleva su marca escrita. */}
                <span className="ml-auto shrink-0 text-2xs uppercase tracking-label text-ink-muted">
                  {acertado ? '' : 'faltó'}
                </span>
              </a>
            </li>
          );
        })}
      </ul>

      <div className="mt-8 grid gap-2 sm:grid-cols-2">
        <button
          type="button"
          data-siguiente
          disabled={cargando}
          onClick={onSiguiente}
          className={[
            'rounded-lg bg-primary px-5 py-3 font-display text-base font-semibold uppercase tracking-label',
            'text-primary-contrast shadow-magnet transition-transform duration-200 ease-athena',
            'hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2',
            'focus-visible:outline-primary-ink disabled:opacity-60 disabled:hover:translate-y-0',
          ].join(' ')}
        >
          {cargando ? 'Buscando…' : 'Siguiente XI'}
        </button>
        <button
          type="button"
          onClick={onVolver}
          className="rounded-lg border border-border-strong px-5 py-3 font-display text-base font-semibold uppercase tracking-label text-ink transition-colors duration-200 hover:border-border-strong hover:bg-canvas-subtle focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-ink"
        >
          Cambiar opciones
        </button>
      </div>
    </div>
  );
}

function Dato({ nombre, valor }: { nombre: string; valor: string }) {
  return (
    <div className="rounded-lg border border-border px-2 py-2.5">
      <dt className="text-2xs uppercase tracking-label text-ink-muted">{nombre}</dt>
      <dd className="mt-0.5 font-display text-lg font-semibold tabular text-ink">{valor}</dd>
    </div>
  );
}
