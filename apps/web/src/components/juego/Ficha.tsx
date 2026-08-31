import { NOMBRE_DE_NIVEL, NOMBRE_DE_PUESTO, NOMBRE_DE_ROL, type Carrera } from '@athena/leyenda';

/**
 * La ficha: quién sos, en un vistazo.
 *
 * Arriba la media grande —el número que la gente mira— y a su lado la identidad: bandera, dorsal,
 * puesto, edad y valor. Debajo, el club actual y los totales de la carrera. Sin pestañas ni barras de
 * medidas: en una pantalla de decisión rápida, cada dato que no ayuda a decidir estorba.
 */

export default function Ficha({ carrera }: { carrera: Carrera }) {
  const totales = carrera.temporadas.reduce(
    (suma, t) => ({
      partidos: suma.partidos + t.partidos,
      goles: suma.goles + t.goles,
      asistencias: suma.asistencias + t.asistencias,
    }),
    { partidos: 0, goles: 0, asistencias: 0 },
  );
  const club = carrera.clubActual;
  const titulos = carrera.trofeos.filter((t) => t.clase !== 'individual').length;
  const premios = carrera.trofeos.filter((t) => t.clase === 'individual').length;

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-surface">
      <div className="flex items-stretch gap-3 p-3">
        {/* La media, con el color de su escalón: es lo primero que se busca. */}
        <div className={`grid w-16 shrink-0 place-items-center rounded-lg ${fondoDeMedia(carrera.ovr)}`}>
          <div className="text-center">
            <span className="block font-display text-2xl font-semibold leading-none tabular">
              {carrera.ovr}
            </span>
            <span className="mt-0.5 block text-[9px] font-medium uppercase tracking-label opacity-80">
              media
            </span>
          </div>
        </div>

        <div className="flex min-w-0 flex-1 flex-col justify-between gap-1">
          <div className="flex items-center gap-1.5">
            {carrera.futbolista.bandera && (
              <img
                src={carrera.futbolista.bandera}
                alt={carrera.futbolista.pais}
                width={18}
                height={13}
                className="rounded-[1px] object-cover"
              />
            )}
            <span className="rounded bg-canvas-subtle px-1.5 py-0.5 text-[10px] font-semibold tabular">
              #{carrera.futbolista.dorsal}
            </span>
            <span className="text-[10px] font-medium uppercase tracking-label text-ink-muted">
              {carrera.futbolista.puesto}
            </span>
            <span className="sr-only">{NOMBRE_DE_PUESTO[carrera.futbolista.puesto]}</span>
            <span className="ml-auto text-[10px] tabular text-ink-muted">
              {carrera.futbolista.edad} años
            </span>
          </div>

          <p className="truncate font-display text-lg font-semibold uppercase leading-none tracking-label">
            {carrera.futbolista.nombre}
          </p>

          <div className="flex items-center gap-1.5">
            {club?.escudo && (
              <img src={club.escudo} alt="" width={16} height={16} className="object-contain" />
            )}
            <span className="truncate text-xs text-ink-muted">
              {club?.nombre ?? 'Sin club'}
              {club ? ` · ${NOMBRE_DE_ROL[carrera.rol]}` : ''}
            </span>
          </div>
        </div>
      </div>

      <dl className="grid grid-cols-4 border-t border-border">
        {[
          ['PJ', totales.partidos],
          ['Goles', totales.goles],
          ['Asis', totales.asistencias],
          ['Valor', carrera.valor >= 1 ? `${Math.round(carrera.valor)} M` : `${Math.round(carrera.valor * 1000)} K`],
        ].map(([rotulo, valor]) => (
          <div key={String(rotulo)} className="border-r border-border px-2 py-1.5 last:border-0">
            <dt className="text-[9px] uppercase tracking-label text-ink-muted">{rotulo}</dt>
            <dd className="font-display text-base font-semibold leading-tight tabular">{valor}</dd>
          </div>
        ))}
      </dl>

      <div className="flex items-center gap-2 border-t border-border px-3 py-2">
        <span className="text-[10px] uppercase tracking-label text-ink-muted">
          {NOMBRE_DE_NIVEL[carrera.nivel]}
        </span>
        <span className="ml-auto flex items-center gap-2 text-[11px] tabular">
          {titulos > 0 && (
            <span className="flex items-center gap-1 text-card-yellow">
              <TrofeoIcono /> {titulos}
            </span>
          )}
          {premios > 0 && (
            <span className="flex items-center gap-1 text-data">
              <EstrellaIcono /> {premios}
            </span>
          )}
          {titulos === 0 && premios === 0 && <span className="text-ink-muted">vitrina vacía</span>}
        </span>
      </div>
    </div>
  );
}

function fondoDeMedia(ovr: number): string {
  if (ovr >= 88) return 'bg-card-yellow text-board';
  if (ovr >= 80) return 'bg-data text-board';
  if (ovr >= 72) return 'bg-primary text-primary-contrast';
  if (ovr >= 64) return 'bg-nota-buena text-primary-contrast';
  return 'bg-board text-chalk';
}

function TrofeoIcono() {
  return (
    <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M8 4.5h8v4.2a4 4 0 0 1-8 0z" />
      <path d="M8 5.5H5.2v1.8A3.2 3.2 0 0 0 8.4 10.5M16 5.5h2.8v1.8a3.2 3.2 0 0 1-3.2 3.2" />
      <path d="M12 12.7v3.3M8.5 19.5h7" />
    </svg>
  );
}

function EstrellaIcono() {
  return (
    <svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor" aria-hidden="true">
      <path d="M12 3.6l2.6 5.4 5.9.8-4.3 4.1 1.1 5.9-5.3-2.9-5.3 2.9 1.1-5.9L3.5 9.8l5.9-.8z" />
    </svg>
  );
}
