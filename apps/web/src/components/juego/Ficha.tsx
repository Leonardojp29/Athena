import {
  CAPITULOS,
  NOMBRE_DE_NIVEL,
  NOMBRE_DE_ROL,
  edadDelCapitulo,
  nombreDePuesto,
  type Carrera,
} from '@athena/leyenda';
import Carta, { type DatosDeCarta } from './Carta';

/**
 * La identidad: quién sos, en una sola banda.
 *
 * Antes era una columna: la carta arriba, los números abajo y la decisión empujada fuera de la
 * pantalla. Acostada ocupa un tercio del alto y deja todo el tablero a la vista, que es la única
 * forma de que una partida entre en una pantalla sin hacer scroll.
 *
 * El escudo del club vive detrás, gigante y al 6%: la camiseta que llevás puesta se ve antes de que
 * leas su nombre, y ningún dato compite con ella.
 */
export default function Ficha({
  carrera,
  ascenso,
  salto,
  onEmpezarDeNuevo,
}: {
  carrera: Carrera;
  ascenso: boolean;
  /** Cuánto se movió la media en el bienio, para marcarlo sobre la carta. */
  salto: number | null;
  onEmpezarDeNuevo: () => void;
}) {
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
  const tinte = club?.primario && /^[0-9a-f]{6}$/i.test(club.primario) ? `#${club.primario}` : null;

  const datosDeCarta: DatosDeCarta = {
    nombre: carrera.futbolista.nombre,
    dorsal: carrera.futbolista.dorsal,
    puesto: carrera.futbolista.puesto,
    costado: carrera.futbolista.costado,
    ovr: carrera.ovr,
    nivel: carrera.nivel,
    atributos: carrera.futbolista.atributos,
    club: carrera.clubActual,
    pais: carrera.futbolista.pais,
    bandera: carrera.futbolista.bandera,
  };

  const jugados = carrera.temporadas.length;
  const reiniciar = () => {
    if (window.confirm('¿Empezar una leyenda nueva? La carrera actual se pierde.')) {
      onEmpezarDeNuevo();
    }
  };

  const cifras: Array<[string, string | number]> = [
    ['Partidos', totales.partidos],
    ['Goles', totales.goles],
    ['Asistencias', totales.asistencias],
    [
      'Valor',
      carrera.valor >= 1
        ? `${Math.round(carrera.valor)} M`
        : `${Math.round(carrera.valor * 1000)} K`,
    ],
  ];

  return (
    <section className="relative overflow-hidden rounded-xl border border-border bg-surface">
      {tinte && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-[0.13] transition-opacity duration-700"
          style={{ background: `linear-gradient(105deg, ${tinte} 0%, transparent 58%)` }}
        />
      )}
      <div className="relative flex items-stretch gap-4 p-3 sm:gap-5 sm:p-4">
        {/*
          El salto de media vive acá y no en una pantalla completa: subir dos puntos es una buena
          noticia, no un acontecimiento. La marca sale de la carta, sube y se va.
        */}
        <div className="relative shrink-0">
          <Carta datos={datosDeCarta} tamano="chica" asciende={ascenso} />
          {salto !== null && salto !== 0 && (
            <span
              key={`${carrera.capitulo}-${salto}`}
              data-salto-de-media
              aria-hidden="true"
              className={`pointer-events-none absolute -right-2 top-6 rounded-lg px-2 py-1 font-display text-lg font-semibold leading-none tabular shadow-magnet ${
                salto > 0 ? 'bg-primary text-primary-contrast' : 'bg-card-red text-chalk'
              }`}
            >
              {salto > 0 ? '+' : '−'}
              {Math.abs(salto)}
            </span>
          )}
          <span className="sr-only" aria-live="polite">
            {salto ? `Tu media ${salto > 0 ? 'subió' : 'bajó'} ${Math.abs(salto)} puntos.` : ''}
          </span>
        </div>

        <div className="relative flex min-w-0 flex-1 flex-col justify-between gap-3 overflow-hidden py-0.5">
          {/* El escudo, gigante y casi invisible: la camiseta se ve antes de que leas su nombre. */}
          {club?.escudo && (
            <img
              src={club.escudo}
              alt=""
              aria-hidden="true"
              className="pointer-events-none absolute -right-4 top-1/2 h-[150%] -translate-y-1/2 object-contain opacity-[0.05]"
            />
          )}

          <div className="relative min-w-0">
            <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-ink-muted">
              {carrera.futbolista.bandera && (
                <img
                  src={carrera.futbolista.bandera}
                  alt={carrera.futbolista.pais}
                  width={16}
                  height={12}
                  className="rounded-[1px] object-cover"
                />
              )}
              <span className="font-semibold tabular text-ink">#{carrera.futbolista.dorsal}</span>
              <span className="uppercase tracking-label">{nombreDePuesto(carrera.futbolista.puesto, carrera.futbolista.costado)}</span>
              <span aria-hidden="true">·</span>
              <span className="tabular">{carrera.futbolista.edad} años</span>
              <span
                className="rounded-full border border-primary/40 bg-primary/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-label text-primary-ink"
                data-nivel={carrera.nivel}
              >
                {NOMBRE_DE_NIVEL[carrera.nivel]}
              </span>
              {/* En el teléfono no hay riel derecho: la salida a una leyenda nueva vive acá. */}
              <button
                type="button"
                onClick={reiniciar}
                aria-label="Nueva leyenda"
                className="ml-auto grid size-7 cursor-pointer place-items-center rounded-md border border-border text-ink-muted transition-colors hover:border-primary-ink hover:text-ink sm:hidden"
              >
                <ReinicioIcono />
              </button>
            </p>

            <h2 className="mt-1 truncate font-display text-2xl font-semibold uppercase leading-none tracking-label sm:text-[1.75rem]">
              {carrera.futbolista.nombre}
            </h2>

            <p className="mt-2 flex items-center gap-2 text-sm">
              {club?.escudo ? (
                <img src={club.escudo} alt="" width={20} height={20} className="shrink-0 object-contain" />
              ) : (
                <span className="size-5 shrink-0 rounded-full border border-dashed border-border-strong" />
              )}
              <span className="truncate font-medium">{club?.nombre ?? 'Todavía sin club'}</span>
              {club && (
                <span className="shrink-0 text-2xs uppercase tracking-label text-ink-muted">
                  {NOMBRE_DE_ROL[carrera.rol]}
                </span>
              )}
            </p>
          </div>

          <dl className="relative flex flex-wrap items-end gap-x-7 gap-y-2">
            {cifras.map(([rotulo, valor]) => (
              <div key={rotulo}>
                <dd className="font-display text-xl font-semibold leading-none tabular">{valor}</dd>
                <dt className="mt-1 text-[9px] uppercase tracking-label text-ink-muted">{rotulo}</dt>
              </div>
            ))}
          </dl>
        </div>

        {/*
          El riel del progreso. Va en la banda de identidad y no en la línea de la carrera porque
          "cuánto me queda" es un dato del jugador, no de la lista, y acá equilibra una franja que a
          1920 quedaba medio vacía.
        */}
        <div className="hidden w-56 shrink-0 flex-col justify-between gap-3 border-l border-border pl-5 sm:flex">
          <div>
            <p className="text-[10px] uppercase tracking-label text-ink-muted">Progreso</p>
            <p className="mt-0.5 font-display text-lg font-semibold uppercase leading-none tracking-label tabular">
              Capítulo {Math.min(jugados + 1, CAPITULOS)}
              <span className="text-ink-muted"> / {CAPITULOS}</span>
            </p>
            <div className="mt-2 flex gap-0.5" aria-hidden="true">
              {Array.from({ length: CAPITULOS }, (_, i) => (
                <span
                  key={i}
                  data-tramo={i < jugados ? 'jugado' : i === jugados ? 'ahora' : 'pendiente'}
                  className="h-1.5 flex-1 rounded-full bg-border transition-colors duration-500 data-[tramo=ahora]:bg-primary-ink/45 data-[tramo=jugado]:bg-primary-ink"
                />
              ))}
            </div>
            <p className="mt-1.5 flex justify-between text-[10px] tabular text-ink-muted">
              <span>{edadDelCapitulo(0)}</span>
              <span>{edadDelCapitulo(CAPITULOS - 1)} años</span>
            </p>
          </div>

          <div className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-2.5 text-xs tabular">
              {titulos > 0 && (
                <span className="flex items-center gap-1 text-card-yellow" title="Títulos">
                  <TrofeoIcono /> {titulos}
                </span>
              )}
              {premios > 0 && (
                <span className="flex items-center gap-1 text-data" title="Premios individuales">
                  <EstrellaIcono /> {premios}
                </span>
              )}
              {titulos === 0 && premios === 0 && (
                <span className="text-[10px] uppercase tracking-label text-ink-muted">
                  Vitrina vacía
                </span>
              )}
            </span>

            <button
              type="button"
              onClick={reiniciar}
              className="flex cursor-pointer items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-[10px] uppercase tracking-label text-ink-muted transition-colors duration-200 hover:border-primary-ink hover:bg-primary/8 hover:text-ink"
            >
              <ReinicioIcono />
              Nueva leyenda
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

function TrofeoIcono() {
  return (
    <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M8 4.5h8v4.2a4 4 0 0 1-8 0z" />
      <path d="M8 5.5H5.2v1.8A3.2 3.2 0 0 0 8.4 10.5M16 5.5h2.8v1.8a3.2 3.2 0 0 1-3.2 3.2" />
      <path d="M12 12.7v3.3M8.5 19.5h7" />
    </svg>
  );
}

function EstrellaIcono() {
  return (
    <svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor" aria-hidden="true">
      <path d="M12 3.6l2.6 5.4 5.9.8-4.3 4.1 1.1 5.9-5.3-2.9-5.3 2.9 1.1-5.9L3.5 9.8l5.9-.8z" />
    </svg>
  );
}

function ReinicioIcono() {
  return (
    <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3.5 12a8.5 8.5 0 1 1 2.9 6.4" />
      <path d="M3 6.5V12h5.5" />
    </svg>
  );
}
