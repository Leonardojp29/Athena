import { useEffect, useMemo, useRef, useState } from 'react';
import {
  REMATES,
  ZONAS,
  rotuloDeRemate,
  type ClaseDeMomento,
  type ContextoDeMomento,
  type Intencion,
  type Jugada,
  type Remate,
  type Zona,
} from '@athena/leyenda';
import { dibujarArquero, dibujarBarrera } from './arquero';
import { camaraDePenal, dibujarArco, dibujarCancha, dibujarFondo, dibujarPelota, proyectar } from './escena';
import {
  ARCO,
  PENAL_DESDE,
  PUNTO_DE_ZONA,
  TIRO_LIBRE_DESDE,
  apuntarA,
  combaDe,
  frenarEnRed,
  integrar,
  objetivoDe,
  rebotarEnPalo,
  vueloDe,
  type Pelota,
} from './fisica';

/**
 * La escena jugable: un estadio de noche en canvas, con física de verdad.
 *
 * Se juega con **dos toques**: a qué zona del arco y cómo la pegas. Nada de arrastrar el puntero —el
 * gesto era impreciso, no se podía jugar con teclado y la potencia salía del largo del arrastre, que
 * es un dato que nadie sabe medir con el dedo—. La segunda elección es la que decide: colocada le gana
 * al arquero que se queda y muere con el que adivina, potente no le da tiempo a nadie pero se va
 * afuera, y picarla humilla al que se tira y es un papelón contra el que no se mueve.
 *
 * **El resultado no se calcula acá.** Llega ya decidido por el motor, con la semilla de la partida, y
 * esta escena solo lo anima: la pelota se apunta al punto que le corresponde a ese desenlace y el
 * arquero vuela a donde tiene que volar. Antes el canvas tiraba sus propios dados y podía cantar "¡La
 * atajó!" mientras la crónica contaba el gol; con una sola fuente eso es imposible.
 *
 * Y no puede colgarse. El vuelo termina por tiempo, no por geometría: tiene tope de pasos, tope de
 * reloj y un último temporizador que suelta la escena aunque todo lo demás falle. El cuelgue viejo era
 * exactamente eso —un remate al palo rebotaba hacia atrás y ninguna condición volvía a cumplirse—.
 */

interface Props {
  momento: ClaseDeMomento;
  contexto: ContextoDeMomento;
  /** Los colores del club rival, para el arquero y la barrera. */
  colorRival: string;
  /** El veredicto del motor. Mientras es nulo se está eligiendo; cuando llega, se anima. */
  jugada: Jugada | null;
  onElegir: (intencion: Intencion) => void;
  onListo: () => void;
}

type Fase = 'zona' | 'remate' | 'esperando' | 'volando' | 'resuelto';

const PASO = 1 / 120;
/** Tope de pasos del vuelo: cinco segundos simulados. Ninguna trayectoria honesta llega acá. */
const PASOS_MAXIMOS = 600;
/** Cuánto se queda el desenlace en pantalla antes de seguir. */
const MS_DE_REMATE = 1500;
/** La red de seguridad final: pase lo que pase, la escena se suelta. */
const MS_LIMITE = 6000;

const TITULO: Record<ClaseDeMomento, string> = {
  penal: 'Penal',
  'mano-a-mano': 'Mano a mano',
  'tiro-libre': 'Tiro libre',
  atajada: 'La atajada',
};

const FILAS: Array<{ alta: boolean; zonas: Zona[] }> = [
  { alta: true, zonas: ['izq-alta', 'centro-alta', 'der-alta'] },
  { alta: false, zonas: ['izq-baja', 'centro-baja', 'der-baja'] },
];

const ROTULO_DE_ZONA: Record<Zona, string> = {
  'izq-alta': 'Izquierda alta',
  'centro-alta': 'Centro alto',
  'der-alta': 'Derecha alta',
  'izq-baja': 'Izquierda baja',
  'centro-baja': 'Centro bajo',
  'der-baja': 'Derecha baja',
};

/** La zona que le corresponde a un lado. Sirve para dibujar el remate del rival en la atajada. */
function zonaDelLado(lado: -1 | 0 | 1, alta: boolean): Zona {
  const fila = FILAS.find((f) => f.alta === alta) ?? FILAS[1];
  return (fila as { zonas: Zona[] }).zonas[lado + 1] as Zona;
}

export default function Estadio({ momento, contexto, colorRival, jugada, onElegir, onListo }: Props) {
  const lienzo = useRef<HTMLCanvasElement>(null);
  const marco = useRef<HTMLDivElement>(null);
  const [fase, setFase] = useState<Fase>('zona');
  const [zona, setZona] = useState<Zona | null>(null);
  const [medida, setMedida] = useState<{ ancho: number; alto: number } | null>(null);
  const faseRef = useRef<Fase>('zona');
  faseRef.current = fase;

  /* Todo lo que cambia sesenta veces por segundo vive en refs: un `setState` por cuadro no sirve. */
  const pelota = useRef<Pelota | null>(null);
  const arquero = useRef({ destinoX: 0, destinoZ: 0, avance: 0 });
  const impacto = useRef<{ x: number; z: number; fuerza: number } | null>(null);
  const sacudida = useRef(0);
  const acumulado = useRef(0);
  const ultimo = useRef(0);
  const pasos = useRef(0);
  const detener = useRef<number | null>(null);

  const esAtajada = momento === 'atajada';
  const desde = momento === 'tiro-libre' ? TIRO_LIBRE_DESDE : momento === 'mano-a-mano' ? 8 : PENAL_DESDE;

  /* Raso y al medio está la barrera: ofrecer esa zona en un tiro libre sería ofrecer un rechazo. */
  const zonasVedadas = momento === 'tiro-libre' ? (['centro-baja'] as Zona[]) : [];

  /*
   * Dónde cae la boca del arco en la pantalla, para poner los botones encima.
   *
   * Sale de la misma proyección con la que se dibuja la escena, así los botones quedan sobre el arco
   * en cualquier tamaño de pantalla en lugar de en un porcentaje adivinado.
   */
  useEffect(() => {
    const nodo = marco.current;
    if (!nodo) return;
    const medir = () => setMedida({ ancho: nodo.clientWidth, alto: nodo.clientHeight });
    medir();
    const observador = new ResizeObserver(medir);
    observador.observe(nodo);
    return () => observador.disconnect();
  }, []);

  const boca = useMemo(() => {
    if (!medida || medida.ancho < 2 || medida.alto < 2) return null;
    const cam = camaraDePenal(medida.ancho, medida.alto, desde);
    const abajo = proyectar(cam, -ARCO.ancho / 2, 0, 0, desde);
    const arriba = proyectar(cam, ARCO.ancho / 2, 0, ARCO.alto, desde);
    if (!abajo.visible || !arriba.visible) return null;
    /* Con el arco muy bajo los botones no serían tocables: se estiran alrededor de su centro. */
    const alto = Math.max(arriba.py < abajo.py ? abajo.py - arriba.py : 0, 108);
    const centro = (arriba.py + abajo.py) / 2;
    return {
      izquierda: abajo.px,
      ancho: arriba.px - abajo.px,
      arriba: centro - alto / 2,
      alto,
    };
  }, [medida, desde]);

  /* El bucle: física a paso fijo, dibujo a la velocidad de la pantalla. */
  useEffect(() => {
    const nodo = lienzo.current;
    if (!nodo) return;
    const ctx = nodo.getContext('2d');
    if (!ctx) return;

    let vivo = true;
    let cuadro = 0;

    const dibujar = (ahora: number) => {
      if (!vivo) return;
      const ancho = nodo.clientWidth;
      const alto = nodo.clientHeight;
      /*
       * Un lienzo sin alto rompe la cámara: el horizonte sale de una división por cero, el gradiente
       * del fondo recibe un valor no finito y lanza. Y como el cuadro siguiente se pide al final de
       * esta función, esa excepción mataba el bucle sin volver nunca. Un cuadro sin caja no dibuja.
       */
      if (ancho < 2 || alto < 2) {
        cuadro = requestAnimationFrame(dibujar);
        return;
      }
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      if (nodo.width !== ancho * dpr || nodo.height !== alto * dpr) {
        nodo.width = ancho * dpr;
        nodo.height = alto * dpr;
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const cam = camaraDePenal(ancho, alto, desde, sacudida.current);
      const origen = desde;

      /* La sacudida del impacto: dos o tres cuadros, nunca más. */
      const sacudiendo = sacudida.current > 0.01;
      if (sacudiendo) {
        ctx.save();
        ctx.translate((Math.random() - 0.5) * sacudida.current * 14, (Math.random() - 0.5) * sacudida.current * 10);
        sacudida.current *= 0.86;
      }

      dibujarFondo(ctx, cam, ahora);
      dibujarCancha(ctx, cam, origen);

      /* El vuelo. Termina por tiempo o por tope de pasos: nunca por una condición geométrica. */
      if (pelota.current && faseRef.current === 'volando') {
        const dt = Math.min((ahora - ultimo.current) / 1000, 0.05);
        acumulado.current += dt;
        while (acumulado.current >= PASO) {
          integrar(pelota.current, PASO);
          acumulado.current -= PASO;
          pasos.current++;
          if (detener.current !== null && pelota.current.y <= detener.current) break;
          if (pasos.current >= PASOS_MAXIMOS) break;
        }
        if ((detener.current !== null && pelota.current.y <= detener.current) || pasos.current >= PASOS_MAXIMOS) {
          setFase('resuelto');
        }
      }
      ultimo.current = ahora;

      dibujarArquero(ctx, cam, origen, {
        destinoX: arquero.current.destinoX,
        destinoZ: arquero.current.destinoZ,
        avance: arquero.current.avance,
        color: colorRival,
      });
      if (momento === 'tiro-libre') {
        dibujarBarrera(ctx, cam, origen, 0, Math.min(1, arquero.current.avance * 1.4), colorRival);
      }
      dibujarArco(ctx, cam, origen, impacto.current);
      if (pelota.current) dibujarPelota(ctx, cam, origen, pelota.current);

      /* La pelota quieta, esperando que le peguen. */
      if (!pelota.current) {
        const p = proyectar(cam, 0, desde, 0.11, origen);
        if (p.visible) {
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(p.px, p.py, Math.max(4, p.escala * 0.11), 0, Math.PI * 2);
          ctx.fill();
        }
      }

      if (sacudiendo) ctx.restore();
      if (faseRef.current === 'volando') arquero.current.avance = Math.min(1, arquero.current.avance + 0.028);
      cuadro = requestAnimationFrame(dibujar);
    };

    cuadro = requestAnimationFrame(dibujar);
    return () => {
      vivo = false;
      cancelAnimationFrame(cuadro);
    };
  }, [colorRival, desde, momento]);

  /*
   * El veredicto llega y la escena lo obedece: la pelota se apunta al punto de ese desenlace y el
   * arquero vuela a donde el motor dijo que voló.
   */
  useEffect(() => {
    if (!jugada) return;
    const { zona: zonaElegida, remate, desenlace } = jugada;

    /*
     * En la atajada los papeles se invierten: la zona elegida es a dónde te tiraste vos y `arquero`
     * es el lado al que pateó el rival. Si la sacaste, la pelota fue a tus manos; si no, se fue al
     * lado contrario y te quedaste mirando.
     */
    const zonaDeLaPelota = esAtajada
      ? desenlace === 'atajada'
        ? zonaElegida
        : zonaDelLado(jugada.arquero, ZONAS[zonaElegida].alta)
      : zonaElegida;

    const objetivo = objetivoDe(zonaDeLaPelota, desenlace);
    pelota.current = apuntarA(desde, objetivo, vueloDe(remate, desde), combaDe(remate, zonaDeLaPelota));

    /* El que ataja tiene que estar donde está la pelota: una atajada que no llega no es una atajada. */
    const ladoQueVuela = esAtajada
      ? ZONAS[zonaElegida].lado
      : desenlace === 'atajada'
        ? (Math.sign(PUNTO_DE_ZONA[zonaDeLaPelota].x) as -1 | 0 | 1)
        : jugada.arquero;
    arquero.current = {
      destinoX: ladoQueVuela * (ARCO.ancho / 2 - 0.6),
      destinoZ: desenlace === 'atajada' ? PUNTO_DE_ZONA[zonaDeLaPelota].z / ARCO.alto : 0.28,
      avance: 0,
    };

    /* Dónde se corta el vuelo: en la barrera, en las manos del arquero, o en la línea. */
    detener.current = desenlace === 'barrera' ? 9.15 : desenlace === 'atajada' ? 0.55 : -ARCO.profundidad * 0.6;
    if (desenlace === 'gol') impacto.current = { x: objetivo.x, z: objetivo.z, fuerza: 1 };
    if (desenlace === 'palo') impacto.current = { x: objetivo.x, z: objetivo.z, fuerza: 0.7 };

    pasos.current = 0;
    acumulado.current = 0;
    ultimo.current = performance.now();
    setFase('volando');
  }, [jugada, desde, esAtajada]);

  /* El remate del vuelo: el golpe que corresponda y la sacudida. */
  useEffect(() => {
    if (fase !== 'resuelto' || !jugada || !pelota.current) return;
    if (jugada.desenlace === 'gol') {
      frenarEnRed(pelota.current);
      sacudida.current = 0.8;
    } else if (jugada.desenlace === 'palo') {
      rebotarEnPalo(pelota.current);
      sacudida.current = 1;
    } else if (jugada.desenlace === 'atajada' || jugada.desenlace === 'barrera') {
      pelota.current.vx *= -0.3;
      pelota.current.vy = Math.abs(pelota.current.vy) * 0.25;
      pelota.current.vz *= 0.3;
      sacudida.current = 0.5;
    }
  }, [fase, jugada]);

  /*
   * Soltar la escena. Dos relojes: el que espera a que se vea el desenlace y el que la suelta pase lo
   * que pase. El segundo es la diferencia entre un bug molesto y un juego que hay que recargar.
   */
  const salir = useRef(onListo);
  salir.current = onListo;
  const soltado = useRef(false);

  useEffect(() => {
    if (fase !== 'resuelto' || soltado.current) return;
    soltado.current = true;
    const reloj = window.setTimeout(() => salir.current(), MS_DE_REMATE);
    return () => window.clearTimeout(reloj);
  }, [fase]);

  useEffect(() => {
    if (!jugada) return;
    const limite = window.setTimeout(() => {
      if (soltado.current) return;
      soltado.current = true;
      salir.current();
    }, MS_LIMITE);
    return () => window.clearTimeout(limite);
  }, [jugada]);

  const elegirZona = (elegida: Zona) => {
    if (fase !== 'zona') return;
    setZona(elegida);
    setFase('remate');
  };

  const elegirRemate = (remate: Remate) => {
    if (fase !== 'remate' || !zona) return;
    setFase('esperando');
    onElegir({ zona, remate });
  };

  /*
   * El teclado no es una concesión: es la misma jugada con otro mando. Los números eligen zona y
   * remate igual que los botones, y el disparo pasa por el mismo lugar.
   */
  useEffect(() => {
    const alTeclear = (evento: KeyboardEvent) => {
      if (evento.metaKey || evento.ctrlKey || evento.altKey) return;
      const numero = Number(evento.key);
      if (!Number.isInteger(numero) || numero < 1) return;
      if (faseRef.current === 'zona' && numero <= 6) {
        const fila = FILAS[numero <= 3 ? 0 : 1] as { zonas: Zona[] };
        const elegida = fila.zonas[(numero - 1) % 3] as Zona;
        if (zonasVedadas.includes(elegida)) return;
        evento.preventDefault();
        elegirZona(elegida);
      } else if (faseRef.current === 'remate' && numero <= REMATES.length) {
        evento.preventDefault();
        elegirRemate(REMATES[numero - 1] as Remate);
      }
    };
    window.addEventListener('keydown', alTeclear);
    return () => window.removeEventListener('keydown', alTeclear);
  });

  const eligiendo = fase === 'zona' || fase === 'remate';
  const rotuloDeLaJugada = jugada
    ? esAtajada
      ? DESENLACE_DEL_ARQUERO[jugada.desenlace]
      : DESENLACE[jugada.desenlace]
    : null;

  return (
    <div
      data-cancha-juego
      data-fase={fase}
      className="flex h-full flex-col overflow-hidden rounded-xl border border-board-edge bg-board"
    >
      <header className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b border-board-edge px-4 py-2.5">
        <h2 className="font-display text-lg font-semibold uppercase tracking-label text-chalk">{TITULO[momento]}</h2>
        <p className="text-2xs uppercase tracking-label text-chalk-dim">
          {contexto.minuto}&apos; · {contexto.marcador[0]}–{contexto.marcador[1]} · {contexto.rival}
        </p>
        <p className="w-full text-sm text-chalk-dim">{contexto.escena}</p>
      </header>

      {/*
        El lienzo no decide su tamaño: lo hace el marco. Midiéndose a sí mismo cada cuadro podía entrar
        en un lazo de layout con el flex del tablero; envuelto y en posición absoluta, la caja está
        fija antes de que dibuje nada.
      */}
      <div ref={marco} className="relative aspect-[16/10] min-h-0 w-full flex-1">
        <canvas
          ref={lienzo}
          className="absolute inset-0 block size-full touch-none"
          aria-hidden="true"
        />

        {/* Los botones van sobre el arco, en la boca real que calcula la proyección. */}
        {fase === 'zona' && boca && (
          <div
            className="absolute grid grid-rows-2 gap-1.5 duration-200 animate-in fade-in"
            style={{ left: boca.izquierda, top: boca.arriba, width: boca.ancho, height: boca.alto }}
            role="group"
            aria-label={esAtajada ? 'A dónde te tiras' : 'A dónde la pateas'}
          >
            {FILAS.map((fila) => (
              <div key={String(fila.alta)} className="grid grid-cols-3 gap-1.5">
                {fila.zonas.map((z, i) => {
                  const vedada = zonasVedadas.includes(z);
                  return (
                    <button
                      key={z}
                      type="button"
                      data-zona={z}
                      disabled={vedada}
                      onClick={() => elegirZona(z)}
                      className="group grid place-items-center rounded-md border-2 border-primary/45 bg-primary/10 text-chalk backdrop-blur-[1px] transition enabled:hover:border-primary enabled:hover:bg-primary/25 disabled:cursor-not-allowed disabled:border-chalk-dim/20 disabled:bg-board/40 disabled:text-chalk-dim/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                      aria-label={`${ROTULO_DE_ZONA[z]}${vedada ? ' (la tapa la barrera)' : ''}`}
                      title={ROTULO_DE_ZONA[z]}
                    >
                      <span className="font-display text-base font-semibold tabular-nums">
                        {fila.alta ? i + 1 : i + 4}
                      </span>
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        )}

        {!eligiendo && rotuloDeLaJugada && fase === 'resuelto' && (
          <p className="pointer-events-none absolute inset-x-0 top-1/3 text-center font-display text-4xl font-bold uppercase tracking-label text-chalk drop-shadow-[0_2px_12px_rgba(0,0,0,0.8)] duration-300 animate-in fade-in zoom-in-95 sm:text-5xl">
            {rotuloDeLaJugada}
          </p>
        )}
      </div>

      <div className="min-h-[5.5rem] border-t border-board-edge px-4 py-3">
        {fase === 'zona' && (
          <p className="text-sm text-chalk-dim">
            {esAtajada ? 'Elige a qué palo te tiras.' : 'Elige a dónde la mandas. Después, cómo la pegas.'}
          </p>
        )}

        {fase === 'remate' && (
          <div className="flex flex-col gap-2">
            <p className="text-2xs uppercase tracking-label text-chalk-dim">
              {zona ? ROTULO_DE_ZONA[zona] : ''} · ¿cómo la pegas?
            </p>
            <ul className="grid gap-2 sm:grid-cols-3">
              {REMATES.map((remate, i) => {
                const rotulo = rotuloDeRemate(momento, remate);
                return (
                  <li key={remate}>
                    <button
                      type="button"
                      data-remate={remate}
                      onClick={() => elegirRemate(remate)}
                      className="flex w-full flex-col gap-0.5 rounded-lg border border-board-edge bg-board-raised px-3 py-2 text-left transition hover:border-primary hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    >
                      <span className="flex items-baseline gap-1.5">
                        <span className="font-display text-2xs text-primary tabular-nums">{i + 1}</span>
                        <span className="font-display text-sm font-semibold uppercase tracking-label text-chalk">
                          {rotulo.texto}
                        </span>
                      </span>
                      <span className="text-2xs leading-snug text-chalk-dim">{rotulo.pista}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {!eligiendo && (
          <p className="font-display text-lg font-semibold uppercase tracking-label text-chalk">
            {fase === 'resuelto' ? rotuloDeLaJugada : 'Va…'}
          </p>
        )}
      </div>
    </div>
  );
}

const DESENLACE: Record<Jugada['desenlace'], string> = {
  gol: '¡Gol!',
  atajada: '¡La atajó!',
  palo: 'Al palo',
  afuera: 'Afuera',
  barrera: 'En la barrera',
};

/** Del otro lado la misma jugada se cuenta al revés: atajarla es el éxito y el gol, el fracaso. */
const DESENLACE_DEL_ARQUERO: Record<Jugada['desenlace'], string> = {
  gol: 'Gol del rival',
  atajada: '¡La atajaste!',
  palo: 'Al palo',
  afuera: 'Afuera',
  barrera: 'En la barrera',
};
