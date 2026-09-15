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
  cargarIndice,
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

/*
 * La ruleta de "Aleatorio": las opciones se encienden una tras otra y frenan en la que tocó.
 *
 * Existe porque elegir al azar y que el juego arranque sin más deja al jugador sin saber qué le
 * salió. Dura poco más de un segundo, que es justo lo que tarda el reto en llegar, así que no
 * agrega espera: tapa la que ya había.
 */
const PASO_DE_RULETA_MS = 90;
const VUELTAS_DE_RULETA = 14;
const REPOSO_DE_RULETA_MS = 520;

const CATALOGOS_SORTEABLES: Catalogo[] = ['internacional', 'peruano', 'mixto'];
const DIFICULTADES_SORTEABLES: DificultadElegida[] = ['facil', 'normal', 'dificil'];

const esperar = (ms: number): Promise<void> => new Promise((listo) => window.setTimeout(listo, ms));

export default function AdivinaElXI() {
  const [preferencias, setPreferencias] = useState<Preferencias>(PREFERENCIAS_POR_OMISION);
  const [etapa, setEtapa] = useState<Etapa>('configurando');
  const [reto, setReto] = useState<RetoParaJugar | null>(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /* La dificultad que tocó: con `aleatorio` cambia en cada partida y el reloj tiene que saberla. */
  const [dificultadDelReto, setDificultadDelReto] = useState<Dificultad>('normal');
  /* Lo que la ruleta está señalando mientras gira; null cuando no hay sorteo en curso. */
  const [girando, setGirando] = useState<{ catalogo: Catalogo | null; dificultad: DificultadElegida | null } | null>(null);

  useEffect(() => setPreferencias(leerPreferencias()), []);

  const cambiar = useCallback((cambios: Partial<Preferencias>) => {
    setPreferencias((actual) => {
      const siguiente = { ...actual, ...cambios };
      guardarPreferencias(siguiente);
      return siguiente;
    });
  }, []);

  const traerReto = useCallback(
    async (opciones: Preferencias, conRuleta = false) => {
      setCargando(true);
      setError(null);

      const catalogo = catalogoDelSorteo(opciones.catalogo, Math.random());
      const dificultad = dificultadDelSorteo(opciones.dificultad, Math.random());

      /* El pedido arranca junto con la ruleta: para cuando frena, el reto ya llegó. */
      const pedido = pedirReto(catalogo, dificultad, opciones.jugados);
      if (conRuleta) await girarRuleta(opciones, catalogo, dificultad, setGirando);

      try {
        const traido = await pedido;
        setDificultadDelReto(dificultad);
        setReto(traido);
        setEtapa('presentando');
        cambiar({ jugados: recordar(opciones.jugados, traido.clave) });
      } catch {
        setError('No pudimos traer un partido. Inténtalo de nuevo en un momento.');
      } finally {
        setGirando(null);
        setCargando(false);
      }
    },
    [cambiar],
  );

  const jugar = useCallback(() => {
    const sortea = preferencias.catalogo === 'aleatorio' || preferencias.dificultad === 'aleatorio';
    void traerReto(preferencias, sortea);
  }, [preferencias, traerReto]);

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
        onJugar={jugar}
        girando={girando}
      />
    );
  }

  if (etapa === 'presentando') {
    /* El índice del buscador baja mientras se lee el partido: al empezar ya está en memoria. */
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
        onSiguiente={jugar}
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

/** Enciende una opción tras otra y frena en la que salió sorteada. */
async function girarRuleta(
  opciones: Preferencias,
  catalogo: Catalogo,
  dificultad: DificultadElegida,
  señalar: (estado: { catalogo: Catalogo | null; dificultad: DificultadElegida | null } | null) => void,
): Promise<void> {
  const sorteaCatalogo = opciones.catalogo === 'aleatorio';
  const sorteaDificultad = opciones.dificultad === 'aleatorio';

  for (let vuelta = 0; vuelta < VUELTAS_DE_RULETA; vuelta++) {
    señalar({
      catalogo: sorteaCatalogo ? (CATALOGOS_SORTEABLES[vuelta % CATALOGOS_SORTEABLES.length] ?? null) : null,
      dificultad: sorteaDificultad
        ? (DIFICULTADES_SORTEABLES[vuelta % DIFICULTADES_SORTEABLES.length] ?? null)
        : null,
    });
    /* Se va frenando: los últimos pasos duran más y el final se lee en lugar de pasar volando. */
    await esperar(PASO_DE_RULETA_MS + vuelta * 14);
  }

  señalar({
    catalogo: sorteaCatalogo ? catalogo : null,
    dificultad: sorteaDificultad ? dificultad : null,
  });
  await esperar(REPOSO_DE_RULETA_MS);
}
