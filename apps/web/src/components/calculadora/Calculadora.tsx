import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ANUAL,
  APERTURA,
  CLAUSURA,
  calcularTablas,
  caminoAlTitulo,
  codificar,
  conFase,
  decodificar,
  semillaDe,
  type DatosDeLaCalculadora,
  type Probabilidad,
  type ReglasLiga,
} from '@athena/calculadora';
import CaminoAlTitulo from './CaminoAlTitulo';
import Controles from './Controles';
import Reiniciar from './Reiniciar';
import Partidos from './Partidos';
import Tablas from './Tablas';

/*
 * El estado es uno solo —qué pronosticó el lector— y todo lo demás se deriva. La versión con un
 * estado por tabla duraba hasta el primer marcador: dos fuentes de verdad para el mismo número.
 *
 * Nada de `Intl` ni de `toLocale*` acá adentro: Node y el navegador no formatean igual y eso
 * rompe la hidratación de un árbol que el servidor ya dibujó.
 */

export interface Crudo {
  competencia: { nombre: string; slug: string; logo: string | null };
  temporada: number | null;
  ronda: string | null;
  hayEnVivo: boolean;
  equipos: Array<[string, string, string, string | null]>;
  partidos: Array<[string, string, number, number, string, number | null, number | null, string]>;
  ordenOficial: Array<{ etiqueta: string; equipos: number[] }>;
}

interface Props {
  crudo: Crudo;
  reglas: ReglasLiga;
  inicial: Array<[string, [number, number]]>;
}

const CLAVES: Array<[RegExp, string]> = [
  [/anual/i, ANUAL],
  [/clausura/i, CLAUSURA],
  [/apertura/i, APERTURA],
];

/*
 * Las tuplas se abren acá y no en la página: expandidas son 350 KB de props escritas dentro del
 * HTML, compactas son 35. El `useMemo` corre igual en el servidor, así que el árbol que se dibuja
 * allá y el que se hidrata acá salen de la misma cuenta.
 */
function armar(crudo: Crudo): DatosDeLaCalculadora {
  const equipos = crudo.equipos.map(([id, nombre, slug, logo]) => ({
    id,
    nombre,
    slug,
    logo,
    codigo: '',
  }));
  return {
    competencia: crudo.competencia,
    temporada: crudo.temporada ?? 0,
    fase: crudo.ronda,
    fecha: null,
    equipos,
    partidos: conFase(
      crudo.partidos.map(([id, ronda, local, visita, estado, gl, gv, kickoff]) => ({
        id,
        ronda,
        local: equipos[local]?.id ?? '',
        visita: equipos[visita]?.id ?? '',
        estado: estado as DatosDeLaCalculadora['partidos'][number]['estado'],
        golesLocal: gl,
        golesVisita: gv,
        kickoff,
      })),
    ) as DatosDeLaCalculadora['partidos'],
    ordenOficial: crudo.ordenOficial.map(({ etiqueta, equipos: indices }) => ({
      clave: CLAVES.find(([patron]) => patron.test(etiqueta))?.[1] ?? etiqueta,
      equipos: indices.flatMap((i) => (equipos[i] ? [equipos[i].id] : [])),
    })),
  };
}

type Marcador = readonly [number, number];

const SIN_NADA: ReadonlyMap<string, Marcador> = new Map();

const clave = (datos: DatosDeLaCalculadora) =>
  `athena:calculadora:${datos.competencia.slug}:${datos.temporada}`;

export default function Calculadora({ crudo, reglas, inicial }: Props) {
  const datos = useMemo(() => armar(crudo), [crudo]);
  const [pronosticos, setPronosticos] = useState<Map<string, Marcador>>(
    () => new Map(inicial.map(([id, m]) => [id, m as Marcador])),
  );
  const [probabilidades, setProbabilidades] = useState<Probabilidad[] | null>(null);
  const [frescos, setFrescos] = useState<DatosDeLaCalculadora['partidos'] | null>(null);
  const enVivo = frescos ?? datos.partidos;

  /* La fase manda en las dos columnas: el calendario de la izquierda y la tabla de la derecha. */
  const faseEnJuego = useMemo(() => {
    const pendiente = enVivo.find((p) => p.estado === 'scheduled');
    return (
      reglas.tablas.find((t) => t.fases.includes(pendiente?.fase ?? ''))?.clave ??
      reglas.claveAcumulada
    );
  }, [enVivo, reglas]);
  const [fase, setFase] = useState(faseEnJuego);

  /* Con predicciones apagado, la tabla vuelve a la de hoy sin perder el escenario cargado. */
  const [conPredicciones, setConPredicciones] = useState(true);
  const [streamer, setStreamer] = useState(false);

  const conPronosticos = useMemo(() => ({ ...datos, partidos: enVivo }), [datos, enVivo]);
  const aplicados = conPredicciones ? pronosticos : SIN_NADA;

  const codigo = useMemo(
    () => codificar(pronosticos, conPronosticos.equipos, conPronosticos.partidos),
    [pronosticos, conPronosticos],
  );

  const tablas = useMemo(
    () =>
      calcularTablas(
        reglas.tablas,
        conPronosticos.equipos,
        conPronosticos.partidos,
        aplicados,
        conPronosticos.ordenOficial,
      ),
    [reglas, conPronosticos, aplicados],
  );

  const camino = useMemo(() => {
    const de = (c: string) => tablas.find((t) => t.clave === c);
    const apertura = de(APERTURA);
    const clausura = de(CLAUSURA);
    const anual = de(ANUAL);
    return apertura && clausura && anual ? caminoAlTitulo(apertura, clausura, anual) : null;
  }, [tablas]);

  /*
   * El escenario guardado se lee después de montar y solo cuando la URL no trae uno: si vino un
   * enlace, manda el enlace. Leerlo en el primer render desajustaría lo que ya dibujó el servidor.
   */
  const [restaurado, setRestaurado] = useState(inicial.length > 0);
  useEffect(() => {
    if (restaurado) return;
    try {
      const guardado = window.localStorage.getItem(clave(datos));
      const recuperado = guardado ? decodificar(guardado, datos.equipos, datos.partidos) : null;
      if (recuperado && recuperado.size > 0) setPronosticos(new Map(recuperado));
    } catch {
      /* Sin almacenamiento la calculadora funciona igual, solo no recuerda. */
    }
    setRestaurado(true);
  }, [datos, restaurado]);

  /*
   * El escenario vive en la URL desde el primer marcador: así el botón de compartir no tiene nada
   * que construir y recargar la página no pierde nada. `replaceState` y no `pushState` porque el
   * lector no espera que "atrás" deshaga un marcador tecla por tecla.
   *
   * Espera a que el escenario guardado se haya leído: sin esa guarda, la primera pasada escribía
   * un código vacío y borraba justo lo que estaba por recuperar.
   */
  useEffect(() => {
    if (!restaurado) return;
    const url = new URL(window.location.href);
    if (codigo) url.searchParams.set('p', codigo);
    else url.searchParams.delete('p');
    window.history.replaceState(null, '', url);
    try {
      if (codigo) window.localStorage.setItem(clave(datos), codigo);
      else window.localStorage.removeItem(clave(datos));
    } catch {
      /* idem */
    }
  }, [codigo, datos, restaurado]);

  /*
   * Las probabilidades salen en un Worker: cinco mil temporadas son casi trescientos milisegundos
   * y en el hilo principal se notarían como un tirón en cada tecla.
   */
  const worker = useRef<Worker | null>(null);
  const corrida = useRef(0);
  useEffect(() => {
    if (typeof Worker === 'undefined') return;
    const propio = new Worker(new URL('./montecarlo.worker.ts', import.meta.url), {
      type: 'module',
    });
    propio.onmessage = (evento: MessageEvent<{ id: number; probabilidades: Probabilidad[] }>) => {
      if (evento.data.id === corrida.current) setProbabilidades(evento.data.probabilidades);
    };
    worker.current = propio;
    return () => {
      propio.terminate();
      worker.current = null;
    };
  }, []);

  useEffect(() => {
    const actual = worker.current;
    if (!actual) return;
    const id = corrida.current + 1;
    corrida.current = id;
    const espera = window.setTimeout(() => {
      actual.postMessage({
        id,
        datos: conPronosticos,
        reglas,
        pronosticos: [...aplicados],
        semilla: semillaDe(conPredicciones ? codigo : ''),
      });
    }, 150);
    return () => window.clearTimeout(espera);
  }, [conPronosticos, reglas, aplicados, codigo, conPredicciones]);

  /* Mientras se juega la fecha, un resultado real pisa el pronóstico de ese partido. */
  useEffect(() => {
    const hayEnCurso = datos.partidos.some((p) => p.estado === 'in_play' || p.estado === 'paused');
    if (!hayEnCurso) return;
    const tic = window.setInterval(() => {
      void fetch('/calculadora/datos.json')
        .then((r) => (r.ok ? r.json() : null))
        .then((llegaron: Crudo | null) => {
          if (llegaron?.partidos) setFrescos(armar(llegaron).partidos);
        })
        .catch(() => undefined);
    }, 60_000);
    return () => window.clearInterval(tic);
  }, [datos.partidos]);

  const pronosticar = useCallback((id: string, marcador: Marcador | null) => {
    setPronosticos((previas) => {
      const siguientes = new Map(previas);
      if (marcador) siguientes.set(id, marcador);
      else siguientes.delete(id);
      return siguientes;
    });
  }, []);

  const reiniciar = useCallback(() => setPronosticos(new Map()), []);

  const tabla = tablas.find((t) => t.clave === fase) ?? tablas[0];
  const definicion = reglas.tablas.find((t) => t.clave === fase);
  /* La acumulada no tiene calendario propio: se sigue jugando el torneo en curso. */
  const enCurso = reglas.tablas.find((t) => t.clave === faseEnJuego);
  const calendario = definicion && definicion.fases.length > 0 ? definicion : enCurso;

  return (
    <div className="grid gap-4">
      <nav
        className="grid grid-cols-3 overflow-hidden rounded-xl border border-border bg-surface"
        aria-label="Fase del torneo"
      >
        {reglas.tablas.map((cual) => (
          <button
            key={cual.clave}
            type="button"
            onClick={() => setFase(cual.clave)}
            aria-current={cual.clave === fase ? 'true' : undefined}
            className="cursor-pointer border-b-[3px] border-transparent px-3 py-3 font-display text-sm font-semibold uppercase tracking-label text-ink-muted transition-colors hover:bg-canvas-subtle hover:text-ink aria-[current]:border-b-primary aria-[current]:bg-primary/8 aria-[current]:text-ink sm:text-base"
          >
            {cual.titulo}
          </button>
        ))}
      </nav>

      {/* El calendario se queda aunque la tabla esté tapada: en una transmisión se sigue cargando
          el escenario en vivo y el resultado se revela al final. */}
      <div className="grid items-start gap-4 lg:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.12fr)]">
        {calendario && (
          <div className="grid gap-4">
            <Partidos
              datos={conPronosticos}
              fases={calendario.fases}
              titulo={calendario.titulo}
              pronosticos={pronosticos}
              onPronosticar={pronosticar}
              reiniciar={<Reiniciar cuantos={pronosticos.size} onReiniciar={reiniciar} />}
            />
            <CaminoAlTitulo camino={camino} equipos={conPronosticos.equipos} />
          </div>
        )}

        {tabla && (
          <Tablas
            tabla={tabla}
            reglas={reglas}
            probabilidades={probabilidades}
            conPredicciones={conPredicciones}
            hayPronosticos={pronosticos.size > 0}
            streamer={streamer}
            onRevelar={() => setStreamer(false)}
            controles={
              <div className="flex flex-wrap items-center gap-1.5">
                <Controles
                  codigo={codigo}
                  conPredicciones={conPredicciones}
                  streamer={streamer}
                  onConPredicciones={() => setConPredicciones((v) => !v)}
                  onStreamer={() => setStreamer((v) => !v)}
                />
                <Reiniciar cuantos={pronosticos.size} onReiniciar={reiniciar} />
              </div>
            }
          />
        )}
      </div>
    </div>
  );
}
