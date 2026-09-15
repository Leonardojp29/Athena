import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import {
  empezar,
  preguntaActual,
  responder,
  resumen,
  siguiente,
  tictac,
  type Partida,
  type Pregunta,
} from '@athena/sesenta-segundos';
import { anotarPartida, leerMarcas, pedirPreguntas, MARCAS_VACIAS, type Marcas } from '../../lib/sesenta';
import { sonar } from '../../lib/sonido';
import { Inicio } from './Inicio';

/*
 * La puerta es flaca a propósito: la partida y el resultado bajan cuando alguien va a jugar, no
 * cuando entra a mirar. Es la misma regla que partió las islas de los otros dos juegos.
 */
const Largada = lazy(() => import('./Largada').then((m) => ({ default: m.Largada })));
const Partida = lazy(() => import('./Partida').then((m) => ({ default: m.Partida })));
const Resultado = lazy(() => import('./Resultado').then((m) => ({ default: m.Resultado })));
const Repaso = lazy(() => import('./Repaso').then((m) => ({ default: m.Repaso })));

if (typeof window !== 'undefined') {
  void import('./Partida');
}

/* El reloj muestra décimas, así que se mira diez veces por segundo y ni una más. */
const LATIDO_MS = 100;
/* Lo que se ve el acierto antes de la siguiente. El encargo pide entre 250 y 450 ms. */
const PAUSA_DE_ACIERTO_MS = 320;
/* Al fallar, lo justo para ver cuál era la buena. Entre 400 y 600. */
const PAUSA_DE_FALLO_MS = 520;

type Etapa = 'inicio' | 'largada' | 'jugando' | 'resultado' | 'repaso';

export default function SesentaSegundos() {
  const [marcas, setMarcas] = useState<Marcas>(MARCAS_VACIAS);
  const [etapa, setEtapa] = useState<Etapa>('inicio');
  const [partida, setPartida] = useState<Partida | null>(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [record, setRecord] = useState(false);
  /* Se redibuja con el latido; el motor no guarda la hora, la recibe. */
  const [ahora, setAhora] = useState(() => Date.now());

  /* Las preguntas viajan mientras corre la largada: esos tres segundos no se pierden. */
  const enVuelo = useRef<Promise<Pregunta[]> | null>(null);
  /* Para no anotar la partida dos veces cuando el latido y el efecto coinciden. */
  const anotada = useRef(false);

  useEffect(() => setMarcas(leerMarcas()), []);

  const jugar = useCallback(() => {
    setError(null);
    setRecord(false);
    setPartida(null);
    anotada.current = false;
    enVuelo.current = pedirPreguntas();
    /* Un fallo se atiende cuando termina la largada; sin esto la promesa quedaría sin capturar. */
    enVuelo.current.catch(() => null);
    setEtapa('largada');
  }, []);

  const arrancar = useCallback(async () => {
    setCargando(true);
    try {
      const preguntas = await (enVuelo.current ?? pedirPreguntas());
      const instante = Date.now();
      setPartida(empezar(preguntas, instante));
      setAhora(instante);
      setEtapa('jugando');
      sonar('largada');
    } catch {
      setError('No pudimos traer las preguntas. Inténtalo de nuevo en un momento.');
      setEtapa('inicio');
    } finally {
      setCargando(false);
    }
  }, []);

  /* El latido: mueve el reloj y deja que el motor cierre la partida al llegar a cero. */
  useEffect(() => {
    if (etapa !== 'jugando') return;
    const latido = window.setInterval(() => {
      const instante = Date.now();
      setAhora(instante);
      setPartida((actual) => (actual ? tictac(actual, instante) : actual));
    }, LATIDO_MS);
    return () => window.clearInterval(latido);
  }, [etapa]);

  /* Contestada una pregunta, la siguiente entra sola: el reloj no se detiene por nadie. */
  useEffect(() => {
    if (etapa !== 'jugando' || !partida || partida.elegida === null || partida.terminada) return;
    const acerto = partida.ultimoPuntaje > 0;
    sonar(acerto ? 'acierto' : 'fallo');

    const paso = window.setTimeout(
      () => setPartida((actual) => (actual ? siguiente(actual, Date.now()) : actual)),
      acerto ? PAUSA_DE_ACIERTO_MS : PAUSA_DE_FALLO_MS,
    );
    return () => window.clearTimeout(paso);
  }, [etapa, partida]);

  /* Sonó el reloj: se anota la partida una sola vez y se muestra el resultado. */
  useEffect(() => {
    if (etapa !== 'jugando' || !partida?.terminada || anotada.current) return;
    anotada.current = true;

    const cuenta = resumen(partida);
    const anotado = anotarPartida({
      puntos: cuenta.puntos,
      aciertos: cuenta.aciertos,
      mejorRacha: cuenta.mejorRacha,
    });
    setMarcas(anotado.marcas);
    setRecord(anotado.record && cuenta.puntos > 0);
    sonar(anotado.record ? 'record' : 'fin');
    setEtapa('resultado');
  }, [etapa, partida]);

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

  if (!partida) return <Espera />;

  if (etapa === 'repaso') {
    return (
      <Suspense fallback={<Espera />}>
        <Repaso fallados={resumen(partida).fallados} onVolver={() => setEtapa('resultado')} />
      </Suspense>
    );
  }

  if (etapa === 'resultado') {
    return (
      <Suspense fallback={<Espera />}>
        <Resultado
          resumen={resumen(partida)}
          marcas={marcas}
          record={record}
          cargando={cargando}
          onOtra={jugar}
          onRepasar={() => setEtapa('repaso')}
        />
      </Suspense>
    );
  }

  if (!preguntaActual(partida)) return <Espera />;

  return (
    <Suspense fallback={<Espera />}>
      <Partida
        partida={partida}
        ahora={ahora}
        onElegir={(texto) =>
          setPartida((actual) => (actual ? responder(actual, texto, Date.now()) : actual))
        }
      />
    </Suspense>
  );
}

function Espera() {
  return <p className="grid flex-1 place-items-center text-sm text-ink-muted">Preparando…</p>;
}
