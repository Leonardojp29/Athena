import { lazy, Suspense, useCallback, useEffect, useState } from 'react';
import {
  catalogoDelSorteo,
  dificultadDelSorteo,
  type Catalogo,
  type Dificultad,
  type DificultadElegida,
} from '@athena/adivina-el-xi';
import type { RetoParaJugar } from '../../lib/api';
import {
  guardarPreferencias,
  leerPreferencias,
  pedirReto,
  recordar,
  PREFERENCIAS_POR_OMISION,
  type Preferencias,
} from '../../lib/adivina';
import { Configuracion } from './Configuracion';
import { Presentacion } from './Presentacion';

/*
 * La puerta es flaca a propósito: la partida y su cancha bajan cuando alguien va a jugar, no cuando
 * entra a mirar. Es la misma regla que partió la isla de Mi Leyenda cuando pasó de los 600 KB.
 */
const Partida = lazy(() => import('./Partida').then((m) => ({ default: m.Partida })));

if (typeof window !== 'undefined') void import('./Partida');

type Etapa = 'configurando' | 'presentando' | 'jugando';

export default function AdivinaElXI() {
  const [preferencias, setPreferencias] = useState<Preferencias>(PREFERENCIAS_POR_OMISION);
  const [etapa, setEtapa] = useState<Etapa>('configurando');
  const [reto, setReto] = useState<RetoParaJugar | null>(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /* La dificultad que tocó: con `aleatorio` cambia en cada partida y el reloj tiene que saberla. */
  const [dificultadDelReto, setDificultadDelReto] = useState<Dificultad>('normal');

  useEffect(() => setPreferencias(leerPreferencias()), []);

  const cambiar = useCallback((cambios: Partial<Preferencias>) => {
    setPreferencias((actual) => {
      const siguiente = { ...actual, ...cambios };
      guardarPreferencias(siguiente);
      return siguiente;
    });
  }, []);

  const traerReto = useCallback(
    async (opciones: Preferencias) => {
      setCargando(true);
      setError(null);
      try {
        const catalogo = catalogoDelSorteo(opciones.catalogo, Math.random());
        const dificultad = dificultadDelSorteo(opciones.dificultad, Math.random());
        const traido = await pedirReto(catalogo, dificultad, opciones.jugados);
        setDificultadDelReto(dificultad);
        setReto(traido);
        setEtapa('presentando');
        cambiar({ jugados: recordar(opciones.jugados, traido.clave) });
      } catch {
        setError('No pudimos traer un partido. Inténtalo de nuevo en un momento.');
      } finally {
        setCargando(false);
      }
    },
    [cambiar],
  );

  if (etapa === 'configurando' || !reto) {
    return (
      <Configuracion
        catalogo={preferencias.catalogo}
        dificultad={preferencias.dificultad}
        conTiempo={preferencias.conTiempo}
        cargando={cargando}
        error={error}
        onCatalogo={(catalogo: Catalogo) => cambiar({ catalogo })}
        onDificultad={(dificultad: DificultadElegida) => cambiar({ dificultad })}
        onTiempo={(conTiempo) => cambiar({ conTiempo })}
        onJugar={() => void traerReto(preferencias)}
      />
    );
  }

  if (etapa === 'presentando') {
    return <Presentacion reto={reto} onListo={() => setEtapa('jugando')} />;
  }

  return (
    <Suspense fallback={<Espera />}>
      <Partida
        /* La clave reinicia el estado del motor al cambiar de reto: una partida nueva empieza limpia. */
        key={reto.clave}
        reto={reto}
        dificultad={dificultadDelReto}
        conTiempo={preferencias.conTiempo}
        cargandoSiguiente={cargando}
        onSiguiente={() => void traerReto(preferencias)}
        onVolver={() => {
          setReto(null);
          setEtapa('configurando');
        }}
      />
    </Suspense>
  );
}

function Espera() {
  return (
    <p className="grid min-h-[50vh] place-items-center text-sm text-chalk-dim">Armando la cancha…</p>
  );
}
