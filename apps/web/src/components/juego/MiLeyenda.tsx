import { Suspense, lazy, useEffect, useState } from 'react';
import type { DatosDeCreacion, Mundo } from '@athena/leyenda';
import { leerPartida, type CarreraGuardada } from '../../lib/leyenda';
import Creacion from './Creacion';
import type { Arranque } from './Tablero';

/**
 * Mi Leyenda: la puerta.
 *
 * Esta isla hace dos cosas y nada más: mirar si hay una partida guardada y decidir si la pantalla que
 * toca es la creación o el tablero. Es deliberadamente flaca, y por una razón medible: **el motor y
 * su catálogo de eventos viven en el tablero**, que se carga cuando hace falta. Con todo en un solo
 * paquete, la pantalla de creación —que no usa una sola línea del catálogo— arrastraba doscientos
 * kilobytes de texto que nadie iba a leer hasta cinco minutos después.
 *
 * El tablero se pide en cuanto se sabe que va a hacer falta, así que para cuando el jugador termina
 * de escribir su nombre el trozo ya está en el navegador.
 */

const Tablero = lazy(() => import('./Tablero'));

interface Props {
  mundo: Mundo;
  anio: number;
}

export default function MiLeyenda({ mundo, anio }: Props) {
  const [arranque, setArranque] = useState<Arranque | null>(null);
  const [listo, setListo] = useState(false);

  useEffect(() => {
    const guardada = leerPartida();
    if (guardada) setArranque({ clase: 'guardada', carrera: guardada });
    setListo(true);
  }, []);

  if (!listo) {
    return (
      <div className="grid min-h-[60vh] place-items-center">
        <p className="text-sm text-ink-muted">Cargando tu carrera…</p>
      </div>
    );
  }

  if (!arranque) {
    return (
      <Creacion
        mundo={mundo}
        anio={anio}
        onEmpezar={(datos: DatosDeCreacion) => setArranque({ clase: 'nueva', datos })}
      />
    );
  }

  return (
    <Suspense
      fallback={
        <div className="grid min-h-[60vh] place-items-center">
          <p className="text-sm text-ink-muted">Armando el mundo…</p>
        </div>
      }
    >
      <Tablero mundo={mundo} arranque={arranque} onReiniciar={() => setArranque(null)} />
    </Suspense>
  );
}

/* El tipo de la partida guardada se re-exporta para quien lo necesite sin abrir la librería. */
export type { CarreraGuardada };
