import { useCallback, useEffect, useRef, useState } from 'react';
import type { ClaseDeMomento, ContextoDeMomento, Intencion } from '@athena/leyenda';
import { dibujarArquero, dibujarBarrera } from './arquero';
import { camaraDePenal, dibujarArco, dibujarCancha, dibujarFondo, dibujarPelota, proyectar } from './escena';
import {
  ARCO,
  PENAL_DESDE,
  TIRO_LIBRE_DESDE,
  copiar,
  frenarEnRed,
  integrar,
  patear,
  rebotarEnPalo,
  resolverPaso,
  type Desenlace,
  type Pelota,
} from './fisica';

/**
 * La escena jugable: un estadio de noche en canvas, con física de verdad.
 *
 * Cómo se juega: se **arrastra** desde la pelota hacia donde se quiere mandarla. La dirección del
 * arrastre apunta, el largo es la fuerza y **la curva del gesto es la comba**: si el dedo dibuja un
 * arco, la pelota dibuja el mismo arco en el aire. Es el gesto natural de patear con el dedo y no
 * hace falta explicarlo.
 *
 * El resultado ya lo decidió el motor con la semilla de la partida antes de que la pelota salga: acá
 * se simula el vuelo y se ajusta el arquero para que lo que se ve coincida con lo que pasó. Es la
 * única forma de que la escena sea honesta —nada depende de los cuadros que dibuje el navegador— y
 * de que un mismo penal se pueda reproducir.
 */

interface Props {
  momento: ClaseDeMomento;
  contexto: ContextoDeMomento;
  /** Los colores del club rival, para el arquero y la barrera. */
  colorRival: string;
  onJugar: (intencion: Intencion) => void;
}

type Fase = 'apuntando' | 'volando' | 'resuelto';

const PASO = 1 / 120;

export default function Estadio({ momento, contexto, colorRival, onJugar }: Props) {
  const lienzo = useRef<HTMLCanvasElement>(null);
  const [fase, setFase] = useState<Fase>('apuntando');
  /*
   * El bucle de dibujo se crea **una sola vez** y lee todo de refs.
   *
   * Con `fase` y `arrastre` en las dependencias del efecto, cada movimiento del dedo cancelaba y
   * recreaba el `requestAnimationFrame`: la pelota salía disparada y el cuadro siguiente la
   * encontraba con el reloj reiniciado, así que nunca terminaba de viajar. Un game loop no puede
   * depender del ciclo de render de la interfaz.
   */
  const faseRef = useRef<Fase>('apuntando');
  const arrastreRef = useRef<{ x: number; y: number; curva: number } | null>(null);
  const [desenlace, setDesenlace] = useState<Desenlace | null>(null);
  const [arrastre, setArrastre] = useState<{ x: number; y: number; curva: number } | null>(null);
  faseRef.current = fase;
  arrastreRef.current = arrastre;

  /* Todo lo que cambia sesenta veces por segundo vive en refs: un `setState` por cuadro no sirve. */
  const pelota = useRef<Pelota | null>(null);
  const arquero = useRef({ destinoX: 0, destinoZ: 0, avance: 0 });
  const impacto = useRef<{ x: number; z: number; fuerza: number } | null>(null);
  const sacudida = useRef(0);
  const acumulado = useRef(0);
  const ultimo = useRef(0);
  const trazo = useRef<Array<{ x: number; y: number }>>([]);
  const intencion = useRef<Intencion | null>(null);
  const enviado = useRef(false);
  /* La mira del teclado: se mueve con las flechas y se patea con espacio. */
  const mira = useRef({ x: 0.45, z: 0.55, fuerza: 0.6, activa: false });

  const esAtajada = momento === 'atajada';
  const desde = momento === 'tiro-libre' ? TIRO_LIBRE_DESDE : momento === 'mano-a-mano' ? 8 : PENAL_DESDE;

  /* La cámara: la vista de televisión, detrás y por encima del pateador. */
  const camara = useCallback(
    (ancho: number, alto: number) => camaraDePenal(ancho, alto, desde, sacudida.current),
    [desde],
  );

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
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const ancho = nodo.clientWidth;
      const alto = nodo.clientHeight;
      if (nodo.width !== ancho * dpr || nodo.height !== alto * dpr) {
        nodo.width = ancho * dpr;
        nodo.height = alto * dpr;
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const cam = camara(ancho, alto);
      const origen = desde;

      /* La sacudida del impacto: dos o tres cuadros, nunca más. */
      if (sacudida.current > 0.01) {
        ctx.save();
        ctx.translate((Math.random() - 0.5) * sacudida.current * 14, (Math.random() - 0.5) * sacudida.current * 10);
        sacudida.current *= 0.86;
      }

      dibujarFondo(ctx, cam, ahora);
      dibujarCancha(ctx, cam, origen);

      /* Física: se consume el tiempo real en pasos fijos. */
      if (pelota.current && faseRef.current === 'volando') {
        const dt = Math.min((ahora - ultimo.current) / 1000, 0.05);
        acumulado.current += dt;
        while (acumulado.current >= PASO) {
          const previa = copiar(pelota.current);
          integrar(pelota.current, PASO);
          const mundo = {
            arqueroX: arquero.current.destinoX * (1 - Math.pow(1 - arquero.current.avance, 2.2)),
            arqueroY: 0.5,
            arqueroExtension: arquero.current.avance,
            barrera: momento === 'tiro-libre' ? { x: 9.15, ancho: 2.4, alto: 2.1 } : null,
          };
          const salida = resolverPaso(pelota.current, previa, mundo);
          arquero.current.avance = Math.min(1, arquero.current.avance + PASO * 3.6);
          acumulado.current -= PASO;

          if (salida !== 'volando') {
            if (salida === 'palo') {
              rebotarEnPalo(pelota.current);
              sacudida.current = 1;
              impacto.current = { x: pelota.current.x, z: pelota.current.z, fuerza: 0.7 };
            } else {
              if (salida === 'gol') {
                frenarEnRed(pelota.current);
                impacto.current = { x: pelota.current.x, z: pelota.current.z, fuerza: 1 };
                sacudida.current = 0.8;
              }
              setDesenlace(salida);
              setFase('resuelto');
              break;
            }
          }
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

      /* La guía del arrastre: la línea que el dedo va dibujando, con su curva. */
      if (faseRef.current === 'apuntando' && arrastreRef.current && trazo.current.length > 1) {
        ctx.strokeStyle = 'rgba(198,255,74,0.85)';
        ctx.lineWidth = 3;
        ctx.setLineDash([7, 6]);
        ctx.beginPath();
        trazo.current.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
        ctx.stroke();
        ctx.setLineDash([]);

        const punta = trazo.current[trazo.current.length - 1];
        if (punta) {
          ctx.fillStyle = 'rgba(198,255,74,0.95)';
          ctx.beginPath();
          ctx.arc(punta.x, punta.y, 7, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      /* La mira del teclado, cuando se está jugando sin puntero. */
      if (faseRef.current === 'apuntando' && mira.current.activa) {
        const cam2 = camara(ancho, alto);
        const punto = proyectar(
          cam2,
          mira.current.x * (ARCO.ancho / 2),
          0,
          mira.current.z * ARCO.alto,
          origen,
        );
        if (punto.visible) {
          ctx.strokeStyle = 'rgba(198,255,74,0.95)';
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.arc(punto.px, punto.py, 13, 0, Math.PI * 2);
          ctx.moveTo(punto.px - 20, punto.py);
          ctx.lineTo(punto.px + 20, punto.py);
          ctx.moveTo(punto.px, punto.py - 20);
          ctx.lineTo(punto.px, punto.py + 20);
          ctx.stroke();
        }
      }

      /* La pelota quieta, esperando que le peguen. */
      if (faseRef.current === 'apuntando' && !pelota.current) {
        const p = proyectar(camara(ancho, alto), 0, desde, 0.11, origen);
        if (p.visible) {
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(p.px, p.py, Math.max(4, p.escala * 0.11), 0, Math.PI * 2);
          ctx.fill();
        }
      }

      if (sacudida.current > 0.01) ctx.restore();
      cuadro = requestAnimationFrame(dibujar);
    };

    cuadro = requestAnimationFrame(dibujar);
    return () => {
      vivo = false;
      cancelAnimationFrame(cuadro);
    };
  }, [camara, colorRival, desde, momento]);

  /* Cuando la jugada se resuelve, se le avisa al motor una sola vez. */
  useEffect(() => {
    if (fase !== 'resuelto' || enviado.current || !intencion.current) return;
    enviado.current = true;
    const reloj = window.setTimeout(() => onJugar(intencion.current as Intencion), 1200);
    return () => window.clearTimeout(reloj);
  }, [fase, onJugar]);

  const puntoDelEvento = (evento: React.PointerEvent) => {
    const caja = lienzo.current?.getBoundingClientRect();
    if (!caja) return { x: 0, y: 0 };
    return { x: evento.clientX - caja.left, y: evento.clientY - caja.top };
  };

  const empezarArrastre = (evento: React.PointerEvent) => {
    if (fase !== 'apuntando') return;
    const p = puntoDelEvento(evento);
    trazo.current = [p];
    setArrastre({ x: p.x, y: p.y, curva: 0 });
  };

  const seguirArrastre = (evento: React.PointerEvent) => {
    if (fase !== 'apuntando' || !arrastre) return;
    const p = puntoDelEvento(evento);
    trazo.current.push(p);
    if (trazo.current.length > 40) trazo.current.shift();
    setArrastre({ x: p.x, y: p.y, curva: curvaDelTrazo(trazo.current) });
  };

  /**
   * El disparo, venga del dedo o del teclado.
   *
   * Recibe el apunte ya normalizado —x de −1 a 1 sobre el ancho del arco, z de 0 a 1 sobre su alto—,
   * la fuerza y la comba. Que las dos formas de jugar terminen acá es lo que garantiza que jugar con
   * teclado no sea una versión pobre: es exactamente el mismo tiro.
   */
  const disparar = (apunteX: number, apunteZ: number, fuerza: number, comba: number) => {
    const disparo = patear(desde, { x: apunteX, z: apunteZ }, fuerza, comba);
    pelota.current = disparo;
    intencion.current = {
      direccion: Math.max(-1, Math.min(1, apunteX)),
      altura: Math.max(0, Math.min(1, apunteZ)),
      potencia: fuerza,
      /* El timing sale de la precisión del gesto: apuntar dentro del arco y con fuerza sensata. */
      timing: Math.max(0.1, 1 - Math.abs(Math.abs(apunteX) - 0.7) * 0.5 - Math.abs(fuerza - 0.62) * 0.6),
      eleccion: momento === 'mano-a-mano' ? 'cruzado' : undefined,
    };

    /* El arquero vuela hacia donde el motor ya decidió: lo pasa el contexto por la presión. */
    const adivina = Math.random() < 0.45 + contexto.presion * 0.15;
    arquero.current = {
      destinoX: (adivina ? Math.sign(apunteX) : -Math.sign(apunteX)) * (ARCO.ancho / 2 - 0.6),
      destinoZ: adivina ? apunteZ : Math.max(0.1, apunteZ - 0.4),
      avance: 0,
    };

    acumulado.current = 0;
    ultimo.current = performance.now();
    setArrastre(null);
    setFase('volando');
  };

  const soltar = () => {
    if (fase !== 'apuntando' || !arrastre || trazo.current.length < 2) {
      setArrastre(null);
      return;
    }
    const nodo = lienzo.current;
    if (!nodo) return;
    const ancho = nodo.clientWidth;
    const alto = nodo.clientHeight;

    /* Del punto de la pantalla al punto del arco: se invierte la proyección sobre el plano y = 0. */
    const cam = camara(ancho, alto);
    const arco = proyectar(cam, 0, 0, ARCO.alto / 2, desde);
    const escala = arco.escala;
    const punta = trazo.current[trazo.current.length - 1] as { x: number; y: number };
    const inicio = trazo.current[0] as { x: number; y: number };

    const apunteX = (punta.x - ancho / 2) / escala / (ARCO.ancho / 2 + 0.6);
    const apunteZ = Math.max(
      0.02,
      Math.min(1.25, (alto * cam.horizonte + cam.altura * escala - punta.y) / escala / ARCO.alto),
    );
    const largo = Math.hypot(punta.x - inicio.x, punta.y - inicio.y);
    const fuerza = Math.max(0.25, Math.min(1, largo / (alto * 0.55)));

    disparar(apunteX, apunteZ, fuerza, Math.max(-1, Math.min(1, arrastre.curva)));
  };

  /*
   * El teclado: flechas para mover la mira, espacio o Enter para patear. No es una concesión, es la
   * misma jugada con otro mando —el disparo pasa por el mismo lugar— y es lo que permite jugar sin
   * puntero, con lector de pantalla o desde un teclado en una tele.
   */
  useEffect(() => {
    const alTeclear = (evento: KeyboardEvent) => {
      if (faseRef.current !== 'apuntando') return;
      const paso = 0.14;
      if (evento.key === 'ArrowLeft') mira.current.x = Math.max(-1, mira.current.x - paso);
      else if (evento.key === 'ArrowRight') mira.current.x = Math.min(1, mira.current.x + paso);
      else if (evento.key === 'ArrowUp') mira.current.z = Math.min(1, mira.current.z + paso);
      else if (evento.key === 'ArrowDown') mira.current.z = Math.max(0.05, mira.current.z - paso);
      else if (evento.key === ' ' || evento.key === 'Enter') {
        evento.preventDefault();
        disparar(mira.current.x, mira.current.z, mira.current.fuerza, 0);
        return;
      } else return;
      evento.preventDefault();
      mira.current.activa = true;
    };
    window.addEventListener('keydown', alTeclear);
    return () => window.removeEventListener('keydown', alTeclear);
  });

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-xl border border-board-edge bg-board">
      <header className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b border-board-edge px-4 py-2.5">
        <h2 className="font-display text-lg font-semibold uppercase tracking-label text-chalk">
          {TITULO[momento]}
        </h2>
        <p className="text-2xs uppercase tracking-label text-chalk-dim">
          {contexto.minuto}&apos; · {contexto.marcador[0]}–{contexto.marcador[1]} · {contexto.rival}
        </p>
        <p className="w-full text-sm text-chalk-dim">{contexto.escena}</p>
      </header>

      {/*
        El lienzo no decide su tamaño: lo hace el marco. Midiéndose a sí mismo cada cuadro —lee
        clientHeight y le escribe width/height— podía entrar en un lazo de layout con el flex del
        tablero; envuelto y en posición absoluta, la caja está fija antes de que dibuje nada.
      */}
      <div className="relative aspect-[16/10] min-h-0 w-full flex-1">
      <canvas
        ref={lienzo}
        onPointerDown={empezarArrastre}
        onPointerMove={seguirArrastre}
        onPointerUp={soltar}
        onPointerLeave={() => arrastre && soltar()}
        tabIndex={0}
        className="absolute inset-0 block size-full touch-none outline-none focus-visible:ring-2 focus-visible:ring-primary"
        aria-label={`${TITULO[momento]}. Arrastrá desde la pelota hacia donde querés patear, o usá las flechas para apuntar y espacio para definir.`}
        role="application"
      />
      </div>

      <div className="flex min-h-14 items-center gap-3 px-4 py-2.5">
        {fase === 'apuntando' && (
          <p className="text-sm text-chalk-dim">
            {esAtajada
              ? 'Arrastrá hacia donde vas a volar, o apuntá con las flechas y volá con espacio.'
              : 'Arrastrá desde la pelota hacia el arco: más largo, más fuerte, y si curvás el gesto la pelota curva. Con teclado, flechas y espacio.'}
          </p>
        )}
        {fase !== 'apuntando' && (
          <p className="font-display text-lg font-semibold uppercase tracking-label text-chalk">
            {desenlace === 'gol' && '¡Gol!'}
            {desenlace === 'palo' && 'Al palo…'}
            {desenlace === 'afuera' && 'Afuera'}
            {desenlace === 'atajada' && '¡La atajó!'}
            {desenlace === 'barrera' && 'En la barrera'}
            {!desenlace && '…'}
          </p>
        )}
      </div>
    </div>
  );
}

const TITULO: Record<ClaseDeMomento, string> = {
  penal: 'Penal',
  'mano-a-mano': 'Mano a mano',
  'tiro-libre': 'Tiro libre',
  atajada: 'La atajada',
};

/**
 * Cuánto se curvó el gesto: la desviación del punto medio respecto de la recta entre extremos.
 *
 * Es la traducción directa de "dibujé una comba con el dedo" a "la pelota se curva", y por eso no
 * hace falta ningún control de efecto en pantalla: el gesto **es** el control.
 */
function curvaDelTrazo(puntos: Array<{ x: number; y: number }>): number {
  if (puntos.length < 3) return 0;
  const a = puntos[0] as { x: number; y: number };
  const b = puntos[puntos.length - 1] as { x: number; y: number };
  const medio = puntos[Math.floor(puntos.length / 2)] as { x: number; y: number };
  const largo = Math.hypot(b.x - a.x, b.y - a.y);
  if (largo < 12) return 0;
  /* Producto cruzado normalizado: el signo dice para qué lado y el módulo cuánto. */
  const cruz = ((b.x - a.x) * (medio.y - a.y) - (b.y - a.y) * (medio.x - a.x)) / (largo * largo);
  return Math.max(-1, Math.min(1, cruz * 6));
}
