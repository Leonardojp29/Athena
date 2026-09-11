import { Suspense, lazy, useEffect, useState } from 'react';
import type { DatosDeCreacion, Mundo, MundoLiviano } from '@athena/leyenda';
import { leerPartida, type CarreraGuardada } from '../../lib/leyenda';
import { pedirMundo } from '../../lib/mundo';
import Creacion from './Creacion';
import type { Arranque } from './Tablero';

/**
 * Mi Leyenda: la puerta.
 *
 * Mira si hay una partida guardada y decide si la pantalla que toca es la creación o el tablero.
 * Es deliberadamente flaca: el motor y su catálogo de eventos viven en el tablero, y la creación
 * —que no usa una línea de ese catálogo— no tiene por qué esperarlo.
 *
 * Los clubes y el tablero se piden al evaluar el módulo, no al necesitarlos: así bajan en paralelo
 * con React en lugar de encadenarse detrás de la hidratación.
 */

const Tablero = lazy(() => import('./Tablero'));

if (typeof window !== 'undefined') {
  void import('./Tablero');
  void pedirMundo().catch(() => undefined);
}

interface Props {
  mundo: MundoLiviano;
  anio: number;
}

export default function MiLeyenda({ mundo, anio }: Props) {
  const [arranque, setArranque] = useState<Arranque | null>(null);
  const [listo, setListo] = useState(false);
  const [clubes, setClubes] = useState<Mundo | null>(null);
  const [fallaronLosClubes, setFallaronLosClubes] = useState(false);

  useEffect(() => {
    const guardada = leerPartida();
    if (guardada) setArranque({ clase: 'guardada', carrera: guardada });
    setListo(true);
  }, []);

  useEffect(() => {
    let vigente = true;
    pedirMundo()
      .then((completo) => vigente && setClubes(completo))
      .catch(() => vigente && setFallaronLosClubes(true));
    return () => {
      vigente = false;
    };
  }, []);

  function reintentarClubes() {
    setFallaronLosClubes(false);
    pedirMundo(true)
      .then(setClubes)
      .catch(() => setFallaronLosClubes(true));
  }

  if (!listo) return <Espera>Cargando tu carrera…</Espera>;

  if (!arranque) {
    return (
      <Creacion
        mundo={mundo}
        anio={anio}
        onEmpezar={(datos: DatosDeCreacion) => setArranque({ clase: 'nueva', datos })}
      />
    );
  }

  if (fallaronLosClubes) {
    return (
      <div className="grid min-h-[60vh] place-items-center px-4 text-center">
        <div>
          <p className="text-sm text-ink-muted">No pudimos cargar los clubes del mundo.</p>
          <button
            type="button"
            onClick={reintentarClubes}
            className="mt-4 rounded-md border border-border-strong px-4 py-2 text-sm font-medium transition-colors hover:bg-canvas-subtle"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  if (!clubes) return <Espera>Armando el mundo…</Espera>;

  return (
    <Suspense fallback={<Espera>Armando el mundo…</Espera>}>
      <Tablero mundo={clubes} arranque={arranque} onReiniciar={() => setArranque(null)} />
    </Suspense>
  );
}

function Espera({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-[60vh] place-items-center">
      <p className="text-sm text-ink-muted">{children}</p>
    </div>
  );
}

export type { CarreraGuardada };
