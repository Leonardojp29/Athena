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
  const acertados = useMemo(() => new Set(partida.aciertos.map((a) => a.id)), [partida.aciertos]);

  const revelados = useMemo(() => {
    const mapa = new Map<string, { nombre: string; fotoUrl: string | null }>();
    if (!fin || !solucion) return mapa;
    for (const t of solucion) {
      if (!acertados.has(t.playerId)) mapa.set(t.grid, { nombre: t.nombre, fotoUrl: t.fotoUrl });
    }
    return mapa;
  }, [fin, solucion, acertados]);

  if (fin && solucion) {
    return (
      <Resultado
        reto={reto}
        resumen={resumirPartida(partida, ahora)}
        solucion={solucion}
        acertados={acertados}
        cargando={cargandoSiguiente}
        onSiguiente={onSiguiente}
        onVolver={onVolver}
      />
    );
  }

  const faltan = reto.casilleros.length - partida.aciertos.length;

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-3 px-4 py-4">
      <header className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          {reto.objetivoEscudoUrl && (
            <span className="grid size-9 shrink-0 place-items-center rounded-full bg-chalk p-1 ring-1 ring-border">
              <img src={reto.objetivoEscudoUrl} alt="" width="28" height="28" className="size-full object-contain" />
            </span>
          )}
          <div className="min-w-0">
            <p className="truncate font-display text-sm font-semibold uppercase tracking-label text-ink">
              {reto.objetivoNombre}
            </p>
            <p className="truncate text-2xs text-ink-muted">
              {reto.deLocal ? '' : 'de visita a '}
              {reto.rivalNombre} · {reto.golesObjetivo}-{reto.golesRival} · {reto.temporada}
            </p>
          </div>
        </div>

        <p className="shrink-0 font-display text-xl font-semibold tabular text-ink">
          {partida.aciertos.length}
          <span className="text-ink-muted">/{reto.casilleros.length}</span>
        </p>
      </header>

      {quedan !== null && <BarraDeTiempo quedan={quedan} apremia={apremia} />}

      <CanchaDelReto
        casilleros={reto.casilleros}
        formacion={reto.formacion}
        aciertos={partida.aciertos}
        pistas={partida.pistas}
        revelados={revelados}
        eligiendoPista={eligiendoPista}
        onElegirCasilla={(grid) => void alPedirPista(grid)}
      />

      {/* El buscador debajo de la cancha, con la pista al costado: el pulgar los alcanza a los dos. */}
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <BuscadorDeJugadores bloqueado={fin} aviso={aviso} onElegir={alElegir} />
        </div>
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
            'shrink-0 rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors duration-200',
            'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-ink',
            eligiendoPista
              ? 'border-card-yellow bg-card-yellow/20 text-ink'
              : 'border-border-strong text-ink-muted hover:border-primary-ink hover:text-ink',
          ].join(' ')}
        >
          {eligiendoPista ? 'Elige casilla' : 'Pista'}
        </button>
      </div>

      <p className="text-2xs leading-relaxed text-ink-muted">
        Te faltan <span className="font-display text-sm font-semibold tabular text-ink">{faltan}</span>{' '}
        · Escribe el nombre que recuerdes: apellido, nombre completo, con o sin tildes. Enter elige el
        resaltado.
      </p>

      {!conTiempo &&
        (confirmandoRendirse ? (
          <div className="flex gap-2">
            <button
              type="button"
              data-rendirse-confirmar
              onClick={() => setPartida((actual) => rendirse(actual, Date.now()))}
              className="flex-1 rounded-lg border border-card-red bg-card-red/15 px-3 py-2 text-sm font-medium text-ink"
            >
              Sí, rendirme
            </button>
            <button
              type="button"
              onClick={() => setConfirmandoRendirse(false)}
              className="flex-1 rounded-lg border border-border-strong px-3 py-2 text-sm text-ink-muted"
            >
              Seguir jugando
            </button>
          </div>
        ) : (
          <button
            type="button"
            data-rendirse
            onClick={() => setConfirmandoRendirse(true)}
            className="self-start text-2xs uppercase tracking-label text-ink-muted underline-offset-4 transition-colors hover:text-ink hover:underline"
          >
            Terminar partida
          </button>
        ))}
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
