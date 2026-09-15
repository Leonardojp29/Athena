import type { Resumen } from '@athena/sesenta-segundos';
import type { Marcas } from '../../lib/sesenta';
import { Icono } from '../once/Icono';

interface Props {
  resumen: Resumen;
  marcas: Marcas;
  record: boolean;
  cargando: boolean;
  onOtra: () => void;
  onRepasar: () => void;
}

export function Resultado({ resumen, marcas, record, cargando, onOtra, onRepasar }: Props) {
  return (
    <div
      data-resultado={resumen.puntos}
      className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center px-4 py-8 text-center"
    >
      <div className="animate-sesenta-entra w-full">
        <p className="font-display text-2xl font-semibold uppercase tracking-label text-ink-muted">
          ¡Tiempo!
        </p>
        <p
          className={`mt-1 font-display text-6xl font-semibold tabular leading-none ${record ? 'animate-sesenta-record text-card-yellow' : 'text-ink'}`}
        >
          {resumen.puntos.toLocaleString('es-PE')}
        </p>
        <p className="mt-1 text-2xs font-medium uppercase tracking-label text-ink-muted">puntos</p>

        {record && (
          <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-card-yellow/15 px-3 py-1 text-2xs font-medium uppercase tracking-label text-card-yellow-ink">
            <Icono nombre="trofeo" size={14} />
            Nuevo récord
          </p>
        )}

        <dl className="mt-6 grid grid-cols-2 gap-x-4 gap-y-3 rounded-xl border border-border p-4 text-left">
          <Cifra rotulo="Preguntas" valor={String(resumen.vistas)} />
          <Cifra rotulo="Precisión" valor={`${resumen.precision}%`} />
          <Cifra rotulo="Correctas" valor={String(resumen.aciertos)} tono="text-win-ink" />
          <Cifra rotulo="Incorrectas" valor={String(resumen.fallos)} tono="text-card-red-ink" />
          <Cifra rotulo="Mejor racha" valor={String(resumen.mejorRacha)} />
          <Cifra rotulo="Rápidas" valor={String(resumen.rapidas)} />
        </dl>

        <p className="mt-4 text-sm text-ink-muted">
          {record
            ? 'No habías llegado tan lejos.'
            : `Tu mejor puntaje son ${marcas.mejorPuntaje.toLocaleString('es-PE')}.`}
        </p>

        <button
          type="button"
          onClick={onOtra}
          disabled={cargando}
          className="mt-5 w-full rounded-lg bg-primary px-6 py-3 font-display text-lg font-semibold uppercase tracking-label text-primary-contrast transition-[transform,opacity] duration-200 hover:-translate-y-0.5 disabled:translate-y-0 disabled:opacity-60"
        >
          {cargando ? 'Preparando…' : 'Reintentar'}
        </button>

        {resumen.fallados.length > 0 && (
          <button
            type="button"
            onClick={onRepasar}
            className="mt-3 w-full rounded-lg border border-border px-6 py-2.5 text-sm font-medium transition-colors duration-200 hover:border-border-strong hover:bg-canvas-subtle"
          >
            Repasar {resumen.fallados.length === 1 ? 'el error' : `los ${resumen.fallados.length} errores`}
          </button>
        )}
      </div>
    </div>
  );
}

function Cifra({ rotulo, valor, tono }: { rotulo: string; valor: string; tono?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <dt className="text-2xs font-medium uppercase tracking-label text-ink-muted">{rotulo}</dt>
      <dd className={`font-display text-lg font-semibold tabular leading-none ${tono ?? 'text-ink'}`}>
        {valor}
      </dd>
    </div>
  );
}
