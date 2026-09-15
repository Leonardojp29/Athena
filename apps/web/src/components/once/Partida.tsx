import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  DURACION_MS,
  empezar,
  intentar,
  pedirPista,
  rendirse,
  restante,
  resumen as resumirPartida,
  terminada,
  tictac,
  type Dificultad,
  type Partida as PartidaDelMotor,
} from '@athena/adivina-el-xi';
import type { FutbolistaBuscado, RetoParaJugar, TitularRevelado } from '../../lib/api';
import { apellidoDe, pedirSolucion, relojDe } from '../../lib/adivina';
import { BuscadorDeJugadores } from './BuscadorDeJugadores';
import { CanchaDelReto } from './CanchaDelReto';
import { Icono } from './Icono';
import { Resultado } from './Resultado';

/* Bajo este umbral la barra late y el reloj se pone rojo: el color no puede ser el único aviso. */
const APREMIO_MS = 30_000;
/* La barra avanza más fino que el reloj: es lo que la hace sentir viva mientras se vacía. */
const LATIDO_MS = 200;

interface Props {
  reto: RetoParaJugar;
  dificultad: Dificultad;
  conTiempo: boolean;
  cargandoSiguiente: boolean;
  onSiguiente: () => void;
  onVolver: () => void;
}

type Aviso = { tono: 'acierto' | 'repetido' | 'fallo'; texto: string } | null;

export function Partida({ reto, dificultad, conTiempo, cargandoSiguiente, onSiguiente, onVolver }: Props) {
  const [partida, setPartida] = useState<PartidaDelMotor>(() =>
    empezar(reto, { conTiempo, dificultad, arrancaEn: Date.now() }),
  );
  const [aviso, setAviso] = useState<Aviso>(null);
  const [ahora, setAhora] = useState(() => Date.now());
  const [eligiendoPista, setEligiendoPista] = useState(false);
  const [confirmandoRendirse, setConfirmandoRendirse] = useState(false);
  const [solucion, setSolucion] = useState<TitularRevelado[] | null>(null);
  const solucionPedida = useRef(false);

  const fin = terminada(partida);

  useEffect(() => {
    if (!conTiempo || fin) return;
    const latido = window.setInterval(() => setAhora(Date.now()), LATIDO_MS);
    return () => window.clearInterval(latido);
  }, [conTiempo, fin]);

  useEffect(() => {
    if (!conTiempo || fin) return;
    setPartida((actual) => tictac(actual, ahora));
  }, [ahora, conTiempo, fin]);

  /*
   * La solución se pide una sola vez y recién cuando hace falta: al terminar, o al pedir la primera
   * pista. Mientras la partida siga abierta, los nombres no están en el navegador.
   */
  const asegurarSolucion = useCallback(async (): Promise<TitularRevelado[]> => {
    if (solucion) return solucion;
    const traida = await pedirSolucion(reto.clave);
    setSolucion(traida);
    return traida;
  }, [reto.clave, solucion]);

  useEffect(() => {
    if (!fin || solucionPedida.current) return;
    solucionPedida.current = true;
    void asegurarSolucion().catch(() => undefined);
  }, [fin, asegurarSolucion]);

  const alElegir = useCallback(
    (futbolista: FutbolistaBuscado) => {
      const veredicto = intentar(partida, futbolista);
      setPartida(veredicto.partida);
      if (veredicto.tipo === 'acierto') {
        setAviso({ tono: 'acierto', texto: `¡Sí! ${apellidoDe(futbolista.nombre)} estaba` });
      } else if (veredicto.tipo === 'repetido') {
        setAviso({ tono: 'repetido', texto: `${apellidoDe(futbolista.nombre)} ya lo encontraste` });
      } else if (veredicto.tipo === 'fallo') {
        setAviso({ tono: 'fallo', texto: 'No fue titular en este partido' });
      }
    },
    [partida],
  );

  const alPedirPista = useCallback(
    async (grid: string) => {
      setEligiendoPista(false);
      const titulares = await asegurarSolucion().catch(() => null);
      const titular = titulares?.find((t) => t.grid === grid);
      if (!titular) return;
      setPartida((actual) => pedirPista(actual, grid, apellidoDe(titular.nombre).slice(0, 1)));
    },
    [asegurarSolucion],
  );

  const quedan = restante(partida, ahora);
  const apremia = quedan !== null && quedan <= APREMIO_MS;
  const acertados = useMemo(() => new Set(partida.aciertos.map((a) => a.ref)), [partida.aciertos]);

  const revelados = useMemo(() => {
    const mapa = new Map<string, { nombre: string; ref: string }>();
    if (!fin || !solucion) return mapa;
    for (const t of solucion) {
      if (!acertados.has(t.ref)) mapa.set(t.grid, { nombre: t.nombre, ref: t.ref });
    }
    return mapa;
  }, [fin, solucion, acertados]);

  /* Apenas termina se muestra el resultado: la solución, si falta, llega mientras ya se está leyendo. */
  if (fin) {
    return (
      <Resultado
        reto={reto}
        resumen={resumirPartida(partida, ahora)}
        solucion={solucion}
        aciertos={partida.aciertos}
        acertados={acertados}
        cargando={cargandoSiguiente}
        onSiguiente={onSiguiente}
        onVolver={onVolver}
      />
    );
  }

  const faltan = reto.casilleros.length - partida.aciertos.length;

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-4">
      <header className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          {reto.objetivoEscudoUrl && (
            <span className="grid size-11 shrink-0 place-items-center rounded-full bg-chalk p-1 ring-1 ring-border sm:size-12">
              <img src={reto.objetivoEscudoUrl} alt="" width="40" height="40" className="size-full object-contain" />
            </span>
          )}
          <div className="min-w-0">
            <p className="truncate font-display text-lg font-semibold uppercase leading-tight tracking-label text-ink sm:text-xl">
              {reto.objetivoNombre}
            </p>
            <p className="truncate text-xs text-ink-muted sm:text-sm">
              {reto.deLocal ? 'contra ' : 'de visita a '}
              <span className="font-medium text-ink">{reto.rivalNombre}</span>
              <span className="tabular"> · {reto.golesObjetivo}-{reto.golesRival}</span> ·{' '}
              {reto.competencia} {reto.temporada}
              {reto.fase ? ` · ${reto.fase}` : ''}
            </p>
          </div>
        </div>

        <p className="shrink-0 font-display text-2xl font-semibold tabular text-ink">
          {partida.aciertos.length}
          <span className="text-ink-muted">/{reto.casilleros.length}</span>
        </p>
      </header>

      {quedan !== null && (
        <div className="mt-3">
          <BarraDeTiempo quedan={quedan} apremia={apremia} />
        </div>
      )}

      <div className="mt-4 flex flex-col items-center gap-4 lg:flex-row lg:items-start lg:justify-center lg:gap-6">
        <CanchaDelReto
          casilleros={reto.casilleros}
          formacion={reto.formacion}
          aciertos={partida.aciertos}
          pistas={partida.pistas}
          revelados={revelados}
          eligiendoPista={eligiendoPista}
          onElegirCasilla={(grid) => void alPedirPista(grid)}
        />

        {/*
          El buscador a la derecha en escritorio y debajo en teléfono. Fijo al desplazar, porque la
          lista de resultados abre hacia abajo y a pantalla completa quedaba cortada contra el borde.
        */}
        <aside className="w-full max-w-[24rem] lg:sticky lg:top-20 lg:w-[23rem] lg:max-w-none">
          {/*
            El buscador es la única herramienta de la partida, así que se presenta como un panel con
            su pregunta arriba en lugar de un campo suelto: se ve de entrada qué hay que hacer.
          */}
          <div className="rounded-xl border border-border bg-surface p-3">
            <p className="mb-2 font-display text-xs font-semibold uppercase tracking-label text-ink-muted">
              ¿Quién jugó?
            </p>
            <BuscadorDeJugadores bloqueado={fin} aviso={aviso} onElegir={alElegir} />
          </div>

          <div className="mt-2 flex items-center gap-2">
            <button
              type="button"
              data-pista
              aria-pressed={eligiendoPista}
              onClick={() => {
                /*
                 * La solución se empieza a pedir acá y no cuando se elige la casilla: el viaje se
                 * solapa con el segundo que tarda el jugador en decidir, y la letra aparece al toque.
                 */
                if (!eligiendoPista) void asegurarSolucion().catch(() => undefined);
                setEligiendoPista((v) => !v);
              }}
              className={[
                'flex flex-1 items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium',
                'transition-colors duration-200',
                'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-ink',
                eligiendoPista
                  ? 'border-card-yellow bg-card-yellow/20 text-ink'
                  : 'border-border-strong text-ink-muted hover:border-primary-ink hover:text-ink',
              ].join(' ')}
            >
              <span className="text-card-yellow-ink">
                <Icono nombre="destello" size={16} />
              </span>
              {eligiendoPista ? 'Elige una casilla' : 'Pedir pista'}
            </button>

            <p className="shrink-0 rounded-lg border border-border px-3 py-2 text-2xs uppercase tracking-label text-ink-muted">
              Faltan <span className="font-display text-sm font-semibold tabular text-ink">{faltan}</span>
            </p>
          </div>

          <p className="mt-2 text-2xs leading-relaxed text-ink-muted">
            Escribe el nombre que recuerdes: apellido, nombre completo, con o sin tildes. Enter elige
            el resaltado.
          </p>

          {!conTiempo &&
            (confirmandoRendirse ? (
              <div className="mt-3 rounded-lg border border-border bg-canvas-subtle p-3">
                <p className="text-sm">¿Terminamos la partida? Se revela el once completo.</p>
                <div className="mt-2 flex gap-2">
                  <button
                    type="button"
                    data-rendirse-confirmar
                    onClick={() => setPartida((actual) => rendirse(actual, Date.now()))}
                    className="flex-1 rounded-md border border-card-red bg-card-red/15 px-3 py-2 text-sm font-medium transition-colors hover:bg-card-red/25"
                  >
                    Sí, terminar
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmandoRendirse(false)}
                    className="flex-1 rounded-md border border-border-strong px-3 py-2 text-sm transition-colors hover:bg-surface"
                  >
                    Seguir jugando
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                data-rendirse
                onClick={() => setConfirmandoRendirse(true)}
                className={[
                  'mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg border border-border',
                  'px-3 py-2 text-sm font-medium text-ink-muted transition-colors duration-200',
                  'hover:border-card-red hover:bg-card-red/10 hover:text-ink',
                  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-ink',
                ].join(' ')}
              >
                <Icono nombre="cerrar" size={15} />
                Terminar partida
              </button>
            ))}
        </aside>
      </div>
    </div>
  );
}

/**
 * El reloj como una barra que se vacía.
 *
 * Se anima con `scaleX` y no con `width`: animar el ancho obliga al navegador a rehacer el diseño
 * en cada cuadro, y acá corre durante cinco minutos seguidos. Los últimos treinta segundos cambian
 * de color y laten, y el número queda al lado para que el color no sea el único canal.
 */
function BarraDeTiempo({ quedan, apremia }: { quedan: number; apremia: boolean }) {
  const parte = Math.max(0, Math.min(1, quedan / DURACION_MS));

  return (
    <div className="flex items-center gap-2.5" data-reloj>
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-canvas-subtle">
        <div
          className={[
            'h-full w-full origin-left rounded-full transition-transform duration-200 ease-linear',
            apremia ? 'bg-live' : 'bg-primary',
          ].join(' ')}
          style={{ transform: `scaleX(${parte})` }}
        />
      </div>
      <p
        className={[
          'flex shrink-0 items-center gap-1.5 font-display text-base font-semibold tabular',
          apremia ? 'text-live-ink' : 'text-ink',
        ].join(' ')}
      >
        {apremia && <span data-live-dot className="size-1.5 animate-live-pulse rounded-full bg-live" />}
        {relojDe(quedan)}
      </p>
    </div>
  );
}
