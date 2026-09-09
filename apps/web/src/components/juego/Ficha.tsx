import { useState } from 'react';
import {
  CAPITULOS,
  NOMBRE_DE_NIVEL,
  NOMBRE_DE_ROL,
  edadDelCapitulo,
  nombreDePuesto,
  type Carrera,
} from '@athena/leyenda';
import Carta, { type DatosDeCarta } from './Carta';
import { plata, seguidores } from './cifras';
import Confirmar from './Confirmar';
import Tooltip from './Tooltip';
import TrofeoContenido from './TrofeoContenido';
import { agruparTrofeos } from './trofeos';

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
  const grupos = agruparTrofeos(carrera.trofeos);
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
  const [confirmando, setConfirmando] = useState(false);

  /*
   * Seguidores y patrimonio van acá y no dentro de la carta: la carta está apretada y estos dos
   * números son de la vida, no del jugador. El valor y el patrimonio son cosas distintas —uno es lo
   * que un club pagaría por ti y el otro lo que tienes— y verlos juntos es media historia de una
   * carrera de futbolista.
   */
  /* Lo que hiciste en la cancha: cuerpo grande, con su signo para que no haga falta leer el rótulo. */
  const cifras = [
    { rotulo: 'Partidos', valor: totales.partidos, icono: <CanchaIcono /> },
    { rotulo: 'Goles', valor: totales.goles, icono: <PelotaIcono /> },
    { rotulo: 'Asistencias', valor: totales.asistencias, icono: <PaseIcono /> },
  ];

  /* Y lo que la carrera trajo: al costado del material, chico. */
  const vida = [
    {
      rotulo: 'Seguidores',
      valor: seguidores(carrera.vida.fama, carrera.vida.exposicion),
      icono: <SeguidoresIcono />,
      nota: 'Crece con tu fama: un título los multiplica y un escándalo también.',
    },
    {
      rotulo: 'Patrimonio',
      valor: plata(carrera.vida.dinero),
      icono: <BilleteIcono />,
      nota: 'Lo que juntaste con tus sueldos y tus decisiones.',
    },
    {
      rotulo: 'Valor de mercado',
      valor: plata(carrera.valor),
      icono: <EtiquetaIcono />,
      nota: 'Lo que un club pagaría por ti hoy. No es lo que tienes: es lo que vales.',
    },
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

              {/*
                Los seguidores, el patrimonio y el valor viven acá y no en la fila de las cifras
                grandes: son parte de la historia, no del rendimiento. Partidos, goles y asistencias
                son lo que hiciste en la cancha y merecen el cuerpo grande; esto es lo que trajo.
              */}
              <span className="flex items-center gap-x-3 gap-y-1 tabular">
                {vida.map(({ rotulo, valor, icono, nota }) => (
                  <Tooltip
                    key={rotulo}
                    contenido={
                      <>
                        <span className="block font-display text-sm font-semibold uppercase leading-tight tracking-label text-ink">
                          {rotulo}
                        </span>
                        <span className="mt-0.5 block text-[11px] leading-snug text-ink-muted">{nota}</span>
                      </>
                    }
                  >
                    <span className="flex items-center gap-1">
                      <span className="text-ink-muted/70">{icono}</span>
                      <span className="font-semibold text-ink">{valor}</span>
                      <span className="sr-only">{rotulo}</span>
                    </span>
                  </Tooltip>
                ))}
              </span>
              {/* En el teléfono no hay riel derecho: la salida a una leyenda nueva vive acá. */}
              <button
                type="button"
                onClick={() => setConfirmando(true)}
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
            {cifras.map(({ rotulo, valor, icono }) => (
              <div key={rotulo}>
                <dd className="font-display text-xl font-semibold leading-none tabular">{valor}</dd>
                <dt className="mt-1 flex items-center gap-1 text-[9px] uppercase tracking-label text-ink-muted">
                  <span aria-hidden="true">{icono}</span>
                  {rotulo}
                </dt>
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

          {/*
            La vitrina, chiquita y mientras juegas. Un contador que dice "3" no cuenta nada: con el
            escudo de cada competencia y su ×N se ve de un golpe **qué** ganaste, y el nombre y los
            años viven en el hover. La banda tenía este espacio vacío desde siempre.
          */}
          <div className="flex flex-col gap-2">
            {grupos.length > 0 ? (
              <span className="flex flex-wrap items-center gap-2.5 text-xs tabular">
                {grupos.map((grupo) => (
                  <Tooltip key={`${grupo.nombre}-${grupo.clase}`} contenido={<TrofeoContenido grupo={grupo} />}>
                  <span
                    className={`flex items-center gap-1.5 rounded-md border border-border bg-canvas-subtle px-2 py-1.5 ${
                      grupo.clase === 'individual'
                        ? 'text-data-ink'
                        : grupo.clase === 'seleccion'
                          ? 'text-primary-ink'
                          : 'text-card-yellow'
                    }`}
                  >
                    {grupo.escudo ? (
                      <img
                        src={grupo.escudo}
                        alt=""
                        width={22}
                        height={22}
                        loading="lazy"
                        className="size-[22px] object-contain"
                      />
                    ) : grupo.clase === 'individual' ? (
                      <EstrellaIcono grande />
                    ) : (
                      <TrofeoIcono grande />
                    )}
                    {grupo.escudo &&
                      (grupo.clase === 'individual' ? <EstrellaIcono grande /> : <TrofeoIcono grande />)}
                    {grupo.veces > 1 && (
                      <span className="font-display text-sm font-semibold text-ink">×{grupo.veces}</span>
                    )}
                    <span className="sr-only">{grupo.detalle}</span>
                  </span>
                  </Tooltip>
                ))}
              </span>
            ) : (
              <span className="text-[10px] uppercase tracking-label text-ink-muted">Vitrina vacía</span>
            )}

            <button
              type="button"
              onClick={() => setConfirmando(true)}
              className="flex cursor-pointer items-center justify-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-[10px] uppercase tracking-label text-ink-muted transition-colors duration-200 hover:border-primary-ink hover:bg-primary/8 hover:text-ink"
            >
              <ReinicioIcono />
              Nueva leyenda
            </button>
          </div>
        </div>
      </div>

      {confirmando && (
        <Confirmar
          titulo="¿Empezar una leyenda nueva?"
          texto="La carrera actual se pierde y no se puede recuperar: no hay historial de leyendas."
          confirmar="Empezar de nuevo"
          cancelar="Seguir jugando"
          onConfirmar={onEmpezarDeNuevo}
          onCancelar={() => setConfirmando(false)}
        />
      )}
    </section>
  );
}

/*
 * Los seis signos de las cifras. SVG en línea, heredando `currentColor` y sin ningún hex propio, que
 * es la regla del proyecto: nada de emojis y nada de iconos que no se adapten al tema.
 */

/** Partidos: la cancha vista desde arriba. */
function CanchaIcono() {
  return (
    <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="5" width="18" height="14" rx="1.5" />
      <path d="M12 5v14" />
      <circle cx="12" cy="12" r="2.6" />
    </svg>
  );
}

/** Goles: la pelota. */
function PelotaIcono() {
  return (
    <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7.4l3.4 2.5-1.3 4h-4.2l-1.3-4z" />
      <path d="M12 3.2v4.2M20.4 9.9l-4.9 0M18 19.4l-3.9-3.5M6 19.4l3.9-3.5M3.6 9.9l4.9 0" />
    </svg>
  );
}

/** Asistencias: el pase que deja a otro de cara al gol. */
function PaseIcono() {
  return (
    <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 17.5c4.5-9 11-11.5 18-11.5" />
      <path d="M15.5 4l5.5 2-2 5.5" />
    </svg>
  );
}

/** Seguidores: la gente que te sigue. */
function SeguidoresIcono() {
  return (
    <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="9" cy="8" r="3.2" />
      <path d="M3.5 19.5c0-3 2.5-5 5.5-5s5.5 2 5.5 5" />
      <path d="M16.5 5.6a3.2 3.2 0 0 1 0 5.4M18.5 19.5c0-2.2-.8-3.9-2.2-4.8" />
    </svg>
  );
}

/** Patrimonio: lo que tienes guardado. */
function BilleteIcono() {
  return (
    <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="2.5" y="6.5" width="19" height="11" rx="1.8" />
      <circle cx="12" cy="12" r="2.4" />
      <path d="M6 10v4M18 10v4" />
    </svg>
  );
}

/** Valor de mercado: lo que un club pagaría por ti. */
function EtiquetaIcono() {
  return (
    <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12.6 3.5H20a.5.5 0 0 1 .5.5v7.4a2 2 0 0 1-.6 1.4l-6.9 6.9a1.4 1.4 0 0 1-2 0l-6.5-6.5a1.4 1.4 0 0 1 0-2l6.9-6.9a2 2 0 0 1 1.2-.8z" />
      <circle cx="16.6" cy="7.4" r="1.4" />
    </svg>
  );
}

function TrofeoIcono({ grande = false }: { grande?: boolean }) {
  const lado = grande ? 16 : 13;
  return (
    <svg viewBox="0 0 24 24" width={lado} height={lado} fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M8 4.5h8v4.2a4 4 0 0 1-8 0z" />
      <path d="M8 5.5H5.2v1.8A3.2 3.2 0 0 0 8.4 10.5M16 5.5h2.8v1.8a3.2 3.2 0 0 1-3.2 3.2" />
      <path d="M12 12.7v3.3M8.5 19.5h7" />
    </svg>
  );
}

function EstrellaIcono({ grande = false }: { grande?: boolean }) {
  const lado = grande ? 16 : 13;
  return (
    <svg viewBox="0 0 24 24" width={lado} height={lado} fill="currentColor" aria-hidden="true">
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
