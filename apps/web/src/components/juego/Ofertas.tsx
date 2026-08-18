import { MAX_OFERTAS, NOMBRE_DE_ROL, type Club, type Oferta } from '@athena/leyenda';

/**
 * Los clubes que te quieren.
 *
 * La pantalla que define el juego: **nunca hay más de cuatro**, y no se elige de un listado de
 * cuatrocientos. Cada oferta trae lo que un futbolista realmente evalúa —qué club es, en qué liga
 * juega, qué rol le prometen, cuánto paga y qué proyecto tiene— y los matices que van a marcar la
 * historia: el clásico rival, el regreso a casa, la palabra que diste una vez.
 */

interface Props {
  ofertas: Oferta[];
  esDebut: boolean;
  clubActual: Club | null;
  puedeQuedarse: boolean;
  onFirmar: (ofertaId: string) => void;
  onQuedarse: () => void;
  onRechazarTodo: () => void;
}

const RIESGO: Record<Oferta['riesgo'], { texto: string; clase: string }> = {
  bajo: { texto: 'Riesgo bajo', clase: 'text-primary-ink' },
  medio: { texto: 'Riesgo medio', clase: 'text-ink-muted' },
  alto: { texto: 'Riesgo alto', clase: 'text-card-red-ink' },
};

const MATICES: Record<string, string> = {
  rival: 'El clásico rival',
  regreso: 'Volver a casa',
  'promesa-rota': 'Dijiste que jamás',
  afuera: 'Fútbol de afuera',
  debut: 'Tu primer club',
};

export default function Ofertas({
  ofertas,
  esDebut,
  clubActual,
  puedeQuedarse,
  onFirmar,
  onQuedarse,
  onRechazarTodo,
}: Props) {
  const cuantas = Math.min(ofertas.length, MAX_OFERTAS);

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-surface">
      <header className="border-b border-border px-4 py-3">
        <h2 className="font-display text-lg font-semibold uppercase tracking-label">
          {esDebut ? 'Tu primer club' : 'Mercado de pases'}
        </h2>
        <p className="mt-0.5 text-2xs text-ink-muted">
          {cuantas === 0
            ? 'Nadie preguntó por ti en esta ventana.'
            : `${cuantas} club${cuantas === 1 ? '' : 'es'} te quiere${cuantas === 1 ? '' : 'n'}. Elegís uno.`}
        </p>
      </header>

      <ul className="grid gap-2 p-3 sm:grid-cols-2">
        {ofertas.slice(0, MAX_OFERTAS).map((oferta) => (
          <li key={oferta.id}>
            <button
              type="button"
              onClick={() => onFirmar(oferta.id)}
              className="group flex h-full w-full cursor-pointer flex-col items-start gap-2 rounded-lg border border-border p-3 text-left transition-colors hover:border-primary-ink hover:bg-primary/8"
            >
              <div className="flex w-full items-start gap-2.5">
                {oferta.club.escudo ? (
                  <img
                    src={oferta.club.escudo}
                    alt=""
                    width={32}
                    height={32}
                    loading="lazy"
                    className="shrink-0 object-contain"
                  />
                ) : (
                  <span className="grid size-8 shrink-0 place-items-center rounded-full bg-canvas-subtle font-display text-xs font-semibold">
                    {oferta.club.corto}
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate font-display text-base font-semibold uppercase leading-tight tracking-label">
                    {oferta.club.nombre}
                  </p>
                  <p className="truncate text-2xs text-ink-muted">
                    {oferta.club.ligaNombre} · {oferta.club.pais}
                  </p>
                </div>
                <span className="shrink-0 rounded bg-canvas-subtle px-1.5 py-0.5 font-display text-xs font-semibold tabular">
                  {oferta.club.fuerza}
                </span>
              </div>

              <p className="text-sm leading-snug text-ink">{oferta.proyecto}</p>

              <dl className="mt-auto grid w-full grid-cols-3 gap-1.5 border-t border-border pt-2">
                <div>
                  <dt className="text-[10px] uppercase tracking-label text-ink-muted">Rol</dt>
                  <dd className="truncate text-xs font-medium">{NOMBRE_DE_ROL[oferta.rolPrometido]}</dd>
                </div>
                <div>
                  <dt className="text-[10px] uppercase tracking-label text-ink-muted">Sueldo</dt>
                  <dd className="text-xs font-medium tabular">
                    {oferta.salario >= 1 ? `${oferta.salario.toFixed(1)} M` : `${Math.round(oferta.salario * 1000)} mil`}
                  </dd>
                </div>
                <div>
                  <dt className="text-[10px] uppercase tracking-label text-ink-muted">Contrato</dt>
                  <dd className="text-xs font-medium tabular">{oferta.temporadas} años</dd>
                </div>
              </dl>

              <div className="flex w-full flex-wrap items-center gap-1.5">
                <span className={`text-[10px] font-medium uppercase tracking-label ${RIESGO[oferta.riesgo].clase}`}>
                  {RIESGO[oferta.riesgo].texto}
                </span>
                {oferta.matices
                  .filter((m) => MATICES[m])
                  .map((matiz) => (
                    <span
                      key={matiz}
                      className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                        matiz === 'rival' || matiz === 'promesa-rota'
                          ? 'bg-card-red/14 text-card-red-ink'
                          : matiz === 'regreso'
                            ? 'bg-primary/16 text-primary-ink'
                            : 'bg-canvas-subtle text-ink-muted'
                      }`}
                    >
                      {MATICES[matiz]}
                    </span>
                  ))}
              </div>
            </button>
          </li>
        ))}
      </ul>

      {/* El pie solo existe si hay algo que ofrecer además de firmar: un pie vacío es una franja muerta. */}
      {(ofertas.length === 0 || (puedeQuedarse && clubActual)) && (
      <footer className="flex flex-wrap gap-2 border-t border-border p-3">
        {puedeQuedarse && clubActual && (
          <button
            type="button"
            onClick={onQuedarse}
            className="flex-1 cursor-pointer rounded-md border border-border-strong px-4 py-2.5 font-display text-sm font-semibold uppercase tracking-label transition-colors hover:bg-canvas-subtle"
          >
            Quedarme en {clubActual.corto}
          </button>
        )}
        {ofertas.length === 0 && (
          <button
            type="button"
            onClick={onRechazarTodo}
            className="flex-1 cursor-pointer rounded-md bg-primary px-4 py-2.5 font-display text-sm font-semibold uppercase tracking-label text-primary-contrast transition-opacity hover:opacity-90"
          >
            Seguir
          </button>
        )}
      </footer>
      )}
    </div>
  );
}
