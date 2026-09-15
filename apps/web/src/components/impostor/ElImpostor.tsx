import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import {
  apremia,
  clavesJugadas,
  elegir,
  empezar,
  necesitaMasRondas,
  restante,
  resumen,
  rondaActual,
  siguiente,
  tictac,
  type Partida,
  type Ronda as RondaDelMotor,
} from '@athena/el-impostor';
import {
  anotarPartida,
  leerMarcas,
  pedirTanda,
  MARCAS_VACIAS,
  type Marcas,
} from '../../lib/impostor';
import { Inicio } from './Inicio';

/*
 * La puerta es flaca a propósito: la ronda y el desenlace bajan cuando alguien va a jugar, no
 * cuando entra a mirar. Es la misma regla que partió la isla de Adivina el XI.
 */
const Largada = lazy(() => import('./Largada').then((m) => ({ default: m.Largada })));
const Ronda = lazy(() => import('./Ronda').then((m) => ({ default: m.Ronda })));
const Desenlace = lazy(() => import('./Desenlace').then((m) => ({ default: m.Desenlace })));

if (typeof window !== 'undefined') {
  void import('./Ronda');
}

/* El reloj se mira diez veces por segundo: alcanza para que el número no salte y no cuesta nada. */
const LATIDO_MS = 100;
/* Lo que se ve el acierto antes de la ronda siguiente. Más sería frenar un juego de reflejos. */
const PAUSA_DE_ACIERTO_MS = 750;
/* Al perder, el tiempo de mirar cuál era. El desenlace repite el porqué, así que no hay que leerlo acá. */
const PAUSA_DE_FALLO_MS = 2200;
/* Cuántas rondas antes del final se pide la tanda siguiente, para que el encadenado no espere. */
const COLCHON_DE_TANDA = 3;

type Etapa = 'inicio' | 'largada' | 'jugando' | 'desenlace';

export default function ElImpostor() {
  const [marcas, setMarcas] = useState<Marcas>(MARCAS_VACIAS);
  const [etapa, setEtapa] = useState<Etapa>('inicio');
  const [partida, setPartida] = useState<Partida | null>(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [record, setRecord] = useState(false);
  /* Se redibuja con el latido; el motor no guarda la hora, la recibe. */
  const [ahora, setAhora] = useState(() => Date.now());

  /* La tanda de repuesto, pedida antes de que haga falta: encadenar no puede costar una espera. */
  const repuesto = useRef<Promise<RondaDelMotor[]> | null>(null);
  /* La primera tanda viaja mientras corre la largada, así los tres segundos no se pierden. */
  const primera = useRef<Promise<RondaDelMotor[]> | null>(null);

  useEffect(() => setMarcas(leerMarcas()), []);

  const jugar = useCallback(() => {
    setError(null);
    setRecord(false);
    setPartida(null);
    repuesto.current = null;
    primera.current = pedirTanda(leerMarcas().vistas);
    /* Un fallo se atiende cuando termina la largada; sin esto, la promesa quedaría sin capturar. */
    primera.current.catch(() => null);
    setEtapa('largada');
  }, []);

  const arrancar = useCallback(async () => {
    setCargando(true);
    try {
      const rondas = await (primera.current ?? pedirTanda([]));
      setPartida(empezar(rondas, Date.now()));
      setAhora(Date.now());
      setEtapa('jugando');
    } catch {
      setError('No pudimos repartir las cartas. Inténtalo de nuevo en un momento.');
      setEtapa('inicio');
    } finally {
      setCargando(false);
    }
  }, []);

  /* El latido: mueve el reloj y deja que el motor cierre la ronda al llegar a cero. */
  useEffect(() => {
    if (etapa !== 'jugando') return;
    const latido = window.setInterval(() => {
      const instante = Date.now();
      setAhora(instante);
      setPartida((actual) => (actual ? tictac(actual, instante) : actual));
    }, LATIDO_MS);
    return () => window.clearInterval(latido);
  }, [etapa]);

  const cerrar = useCallback((terminada: Partida) => {
    const cuenta = resumen(terminada);
    const anotado = anotarPartida({
      racha: cuenta.racha,
      rondasAcertadas: terminada.acertadas,
      vistas: clavesJugadas(terminada).slice(0, terminada.indice + 1),
    });
    setMarcas(anotado.marcas);
    setRecord(anotado.record && cuenta.racha > 0);
    setEtapa('desenlace');
  }, []);

  /* Lo que pasa después de resolverse una ronda: encadenar si se acertó, cerrar si no. */
  useEffect(() => {
    if (etapa !== 'jugando' || !partida || partida.desenlace === null) return;

    if (partida.desenlace !== 'acertada') {
      const cierre = window.setTimeout(() => cerrar(partida), PAUSA_DE_FALLO_MS);
      return () => window.clearTimeout(cierre);
    }

    const paso = window.setTimeout(() => {
      void encadenar(partida);
    }, PAUSA_DE_ACIERTO_MS);
    return () => window.clearTimeout(paso);

    async function encadenar(acertada: Partida): Promise<void> {
      let extra: RondaDelMotor[] = [];
      if (necesitaMasRondas(acertada)) {
        try {
          extra = await (repuesto.current ?? pedirTanda(clavesJugadas(acertada)));
        } catch {
          /* Sin repuesto la racha se cierra donde llegó, que es mejor que una pantalla trabada. */
          cerrar(acertada);
          return;
        }
        repuesto.current = null;
      }
      const instante = Date.now();
      setAhora(instante);
      setPartida(siguiente(acertada, instante, extra));
    }
  }, [etapa, partida, cerrar]);

  /* El repuesto se pide unas rondas antes de agotar la tanda, no en el momento de necesitarlo. */
  useEffect(() => {
    if (!partida || repuesto.current) return;
    if (partida.indice < partida.rondas.length - COLCHON_DE_TANDA) return;
    repuesto.current = pedirTanda(clavesJugadas(partida));
    repuesto.current.catch(() => null);
  }, [partida]);

  if (etapa === 'inicio') {
    return <Inicio marcas={marcas} cargando={cargando} error={error} onJugar={jugar} />;
  }

  if (etapa === 'largada') {
    return (
      <Suspense fallback={<Espera />}>
        <Largada onListo={() => void arrancar()} />
      </Suspense>
    );
  }

  if (etapa === 'desenlace' && partida) {
    const cuenta = resumen(partida);
    return (
      <Suspense fallback={<Espera />}>
        <Desenlace
          racha={cuenta.racha}
          marcas={marcas}
          record={record}
          desenlace={cuenta.desenlace}
          ultimaRonda={cuenta.ultimaRonda}
          cargando={cargando}
          onOtra={jugar}
        />
      </Suspense>
    );
  }

  const enJuego = partida ? rondaActual(partida) : null;
  if (!partida || !enJuego) return <Espera />;

  return (
    <Suspense fallback={<Espera />}>
      <Ronda
        ronda={enJuego}
        numero={partida.indice + 1}
        racha={partida.racha}
        restanteMs={restante(partida, ahora)}
        apremia={apremia(partida, ahora)}
        elegido={partida.elegido}
        desenlace={partida.desenlace}
        onElegir={(ref) => setPartida((actual) => (actual ? elegir(actual, ref, Date.now()) : actual))}
        onRendirse={() => cerrar(partida)}
      />
    </Suspense>
  );
}

function Espera() {
  return <p className="grid flex-1 place-items-center text-sm text-ink-muted">Repartiendo…</p>;
}
