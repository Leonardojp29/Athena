import { impostorDe, type DesenlaceDeRonda, type Ronda } from '@athena/el-impostor';
import type { Marcas } from '../../lib/impostor';
import { fotoDe } from '../../lib/impostor';

interface Props {
  racha: number;
  marcas: Marcas;
  record: boolean;
  desenlace: DesenlaceDeRonda | null;
  ultimaRonda: Ronda | null;
  cargando: boolean;
  onOtra: () => void;
}

export function Desenlace({ racha, marcas, record, desenlace, ultimaRonda, cargando, onOtra }: Props) {
  const impostor = impostorDe(ultimaRonda);
  /* Faltando una para el récord, decirlo es lo que hace que alguien juegue otra. */
  const aUna = !record && marcas.mejorRacha - racha === 1;

  return (
    <div
      data-desenlace={desenlace ?? 'rendido'}
      className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center px-4 py-8 text-center"
    >
      <div className="animate-impostor-entra w-full">
        <p className="text-2xs font-medium uppercase tracking-label text-ink-muted">
          {record ? 'Nuevo récord' : desenlace === 'sin-tiempo' ? 'Demasiado lento' : 'Racha'}
        </p>
        <p
          data-racha-final={racha}
          className={`font-display text-7xl font-semibold tabular leading-none ${record ? 'animate-impostor-record text-card-yellow' : 'text-ink'}`}
        >
          {racha}
        </p>
        <p className="mt-1 text-sm text-ink-muted">
          {racha === 1 ? '1 impostor encontrado' : `${racha} impostores encontrados`}
        </p>

        {impostor && desenlace !== null && desenlace !== 'acertada' && (
          <div className="mt-6 flex items-center gap-3 rounded-xl border border-border p-3 text-left">
            <img
              src={fotoDe(impostor.ref)}
              alt=""
              aria-hidden="true"
              width="56"
              height="56"
              className="size-14 shrink-0 rounded-full bg-canvas-subtle object-cover ring-2 ring-win"
            />
            <p className="min-w-0">
              <span className="block text-2xs font-medium uppercase tracking-label text-win-ink">
                El impostor era
              </span>
              <span className="block truncate font-display text-lg font-semibold uppercase leading-tight tracking-label">
                {impostor.nombre}
              </span>
              {ultimaRonda && (
                <span className="mt-0.5 block text-2xs leading-snug text-ink-muted">
                  {ultimaRonda.reveal}
                </span>
              )}
            </p>
          </div>
        )}

        <p className="mt-6 text-sm text-ink-muted">
          {record
            ? 'No habías llegado tan lejos.'
            : aUna
              ? 'Una más y rompes tu récord.'
              : `Tu mejor racha son ${marcas.mejorRacha}.`}
        </p>

        <button
          type="button"
          onClick={onOtra}
          disabled={cargando}
          className="mt-5 w-full rounded-lg bg-primary px-6 py-3 font-display text-lg font-semibold uppercase tracking-label text-primary-contrast transition-[transform,opacity] duration-200 hover:-translate-y-0.5 disabled:translate-y-0 disabled:opacity-60"
        >
          {cargando ? 'Repartiendo…' : 'Otra vez'}
        </button>

      </div>
    </div>
  );
}
