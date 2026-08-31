import { MAX_OFERTAS, NOMBRE_DE_ROL, type Club, type Oferta } from '@athena/leyenda';

/**
 * Los clubes que te quieren.
 *
 * La pantalla que define el juego: **nunca hay más de cuatro**, y no se elige de un listado de
 * cuatrocientos. Cada oferta trae lo que un futbolista realmente evalúa —qué club es, en qué liga
 * juega, qué rol le prometen, cuánto paga y qué proyecto tiene— y los matices que van a marcar la
 * historia: el clásico rival, el regreso a casa, la palabra que diste una vez.
 *
 * Van en dos columnas: cuatro filas apiladas empujaban la última fuera de la pantalla, y una oferta
 * que hay que buscar con scroll no compite de igual a igual con las otras tres.
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
  'regreso-rival': 'La casa del rival',
  'promesa-rota': 'Dijiste que jamás',
  afuera: 'Fútbol de afuera',
  debut: 'Tu primer club',
  prestamo: 'A préstamo, para jugar',
};

const plata = (millones: number) =>
  millones >= 1 ? `${millones.toFixed(1)} M` : `${Math.round(millones * 1000)} mil`;

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
    <section data-escena className="flex flex-col gap-3">
      <header className="flex items-baseline justify-between gap-3">
        <h2 className="font-display text-xl font-semibold uppercase leading-none tracking-label">
          {esDebut ? 'Tu primer club' : 'Mercado de pases'}
        </h2>
        <p className="shrink-0 text-2xs text-ink-muted">
          {cuantas === 0
            ? 'Nadie preguntó por vos.'
            : `${cuantas} te quiere${cuantas === 1 ? '' : 'n'} · elegís uno`}
        </p>
      </header>

      <ul className="grid gap-2 sm:grid-cols-2">
        {ofertas.slice(0, MAX_OFERTAS).map((oferta) => {
          const tinte =
            oferta.club.primario && /^[0-9a-f]{6}$/i.test(oferta.club.primario)
              ? `#${oferta.club.primario}`
              : null;
          return (
            <li key={oferta.id} className="min-w-0">
              <button
                type="button"
                onClick={() => onFirmar(oferta.id)}
                data-oferta
                className="group relative flex h-full w-full cursor-pointer flex-col gap-2 overflow-hidden rounded-xl border border-border bg-surface p-3 text-left transition-[colors,transform,box-shadow] duration-200 ease-out hover:-translate-y-0.5 hover:border-primary-ink hover:shadow-magnet active:translate-y-0"
              >
                {tinte && (
                  <span
                    aria-hidden="true"
                    className="absolute inset-x-0 top-0 h-0.5 opacity-70"
                    style={{ background: tinte }}
                  />
                )}

                <span className="flex items-center gap-2.5">
                  {oferta.club.escudo ? (
                    <img
                      src={oferta.club.escudo}
                      alt=""
                      width={36}
                      height={36}
                      loading="lazy"
                      className="size-9 shrink-0 object-contain transition-transform duration-300 group-hover:scale-110"
                    />
                  ) : (
                    <span className="grid size-9 shrink-0 place-items-center rounded-full bg-canvas-subtle font-display text-xs font-semibold">
                      {oferta.club.corto}
                    </span>
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-display text-base font-semibold uppercase leading-tight tracking-label">
                      {oferta.club.nombre}
                    </span>
                    <span className="block truncate text-[10px] uppercase tracking-label text-ink-muted">
                      {oferta.club.ligaNombre} · {oferta.club.pais}
                    </span>
                  </span>
                  <span className="shrink-0 rounded bg-canvas-subtle px-1.5 py-0.5 font-display text-sm font-semibold tabular">
                    {oferta.club.fuerza}
                  </span>
                </span>

                <span className="block text-xs leading-snug text-ink-muted">{oferta.proyecto}</span>

                <span className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px]">
                  <span className="font-medium">{NOMBRE_DE_ROL[oferta.rolPrometido]}</span>
                  <span className="tabular text-ink-muted">{plata(oferta.salario)}</span>
                  <span className="tabular text-ink-muted">{oferta.temporadas} años</span>
                  <span
                    className={`ml-auto text-[10px] font-medium uppercase tracking-label ${RIESGO[oferta.riesgo].clase}`}
                  >
                    {RIESGO[oferta.riesgo].texto}
                  </span>
                </span>

                {oferta.matices.some((m) => MATICES[m]) && (
                  <span className="flex flex-wrap gap-1">
                    {oferta.matices
                      .filter((m) => MATICES[m])
                      .map((matiz) => (
                        <span
                          key={matiz}
                          className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                            matiz === 'rival' || matiz === 'promesa-rota'
                              ? 'bg-card-red/14 text-card-red-ink'
                              : matiz === 'regreso' || matiz === 'regreso-rival'
                                ? 'bg-primary/16 text-primary-ink'
                                : 'bg-canvas-subtle text-ink-muted'
                          }`}
                        >
                          {MATICES[matiz]}
                        </span>
                      ))}
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ul>

      {(ofertas.length === 0 || (puedeQuedarse && clubActual)) && (
        <div className="flex flex-wrap gap-2">
          {puedeQuedarse && clubActual && (
            <button
              type="button"
              onClick={onQuedarse}
              className="flex-1 cursor-pointer rounded-lg border border-border-strong px-4 py-2.5 font-display text-sm font-semibold uppercase tracking-label transition-colors duration-200 hover:bg-canvas-subtle"
            >
              Quedarme en {clubActual.nombre}
            </button>
          )}
          {ofertas.length === 0 && (
            <button
              type="button"
              onClick={onRechazarTodo}
              className="flex-1 cursor-pointer rounded-lg bg-primary px-4 py-2.5 font-display text-sm font-semibold uppercase tracking-label text-primary-contrast transition-opacity duration-200 hover:opacity-90"
            >
              Seguir
            </button>
          )}
        </div>
      )}
    </section>
  );
}
