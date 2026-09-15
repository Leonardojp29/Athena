import type { Marcas } from '../../lib/sesenta';
import { Icono } from '../once/Icono';

interface Props {
  marcas: Marcas;
  cargando: boolean;
  error: string | null;
  onJugar: () => void;
}

export function Inicio({ marcas, cargando, error, onJugar }: Props) {
  return (
    <div
      data-inicio
      className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center px-4 py-8 text-center"
    >
      <div className="animate-sesenta-entra w-full">
        <span className="grid size-14 place-items-center justify-self-center rounded-xl bg-primary text-primary-contrast">
          <Icono nombre="reloj" size={28} />
        </span>
        <h1 className="mt-4 font-display text-4xl font-semibold uppercase leading-none tracking-label">
          60 Segundos
        </h1>
        <p className="mt-3 text-pretty text-sm leading-relaxed text-ink-muted">
          Responde todo lo que puedas antes de que se acabe el tiempo. Fallar no te saca: te cuesta
          la racha.
        </p>

        {marcas.partidas > 0 && (
          <dl className="mt-6 grid grid-cols-3 gap-2 rounded-xl border border-border p-3 text-center">
            <Marca rotulo="Mejor puntaje" valor={marcas.mejorPuntaje.toLocaleString('es-PE')} destacada />
            <Marca rotulo="Más correctas" valor={String(marcas.masCorrectas)} />
            <Marca rotulo="Mejor racha" valor={String(marcas.mejorRacha)} />
          </dl>
        )}

        <button
          type="button"
          onClick={onJugar}
          disabled={cargando}
          className="mt-6 w-full rounded-lg bg-primary px-6 py-3 font-display text-lg font-semibold uppercase tracking-label text-primary-contrast transition-[transform,opacity] duration-200 hover:-translate-y-0.5 disabled:translate-y-0 disabled:opacity-60"
        >
          {cargando ? 'Preparando…' : 'Jugar'}
        </button>

        {error && (
          <p role="alert" className="mt-3 text-sm text-card-red-ink">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}

function Marca({ rotulo, valor, destacada }: { rotulo: string; valor: string; destacada?: boolean }) {
  return (
    <div>
      <dt className="text-2xs font-medium uppercase tracking-label text-ink-muted">{rotulo}</dt>
      <dd
        className={`font-display text-xl font-semibold tabular leading-none ${destacada ? 'text-primary-ink' : 'text-ink'}`}
      >
        {valor}
      </dd>
    </div>
  );
}
