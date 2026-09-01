import { useCallback, useEffect, useRef, useState } from 'react';
import {
  NOMBRE_DE_NIVEL,
  rotulosDe,
  siglaDePuesto,
  type Atributos,
  type Costado,
  type Nivel,
  type Puesto,
} from '@athena/leyenda';

/*
 * El contorno del blasón, en unidades relativas (0-1) para que escale con cualquier tamaño.
 *
 * Esquinas superiores redondeadas, borde de arriba **recto** y una base que baja en curva hasta una
 * punta suave. Tuvo dos versiones antes de esta: un polígono con la punta a noventa grados que
 * parecía un triángulo pegado abajo, y una con la muesca del centro arriba que se leía como un hueco
 * en la carta. Un escudo se reconoce por la base, no por el techo.
 */
const BLASON =
  'M0.05 0.07 C0.05 0.022 0.07 0.008 0.115 0.008 L0.885 0.008 ' +
  'C0.93 0.008 0.95 0.022 0.95 0.07 L0.95 0.83 ' +
  'C0.95 0.876 0.938 0.9 0.902 0.918 L0.565 0.982 C0.522 0.998 0.478 0.998 0.435 0.982 ' +
  'L0.098 0.918 C0.062 0.9 0.05 0.876 0.05 0.83 Z';

/**
 * La carta.
 *
 * Es el objeto que el jugador se lleva de la partida, así que tiene que sentirse un objeto: material
 * antes que color, número grande antes que etiqueta, y una reacción física al puntero. La anatomía es
 * la de una carta de fútbol —el número arriba, el puesto debajo, los seis atributos en dos filas—
 * porque es un lenguaje que cualquiera que haya visto una lee sin instrucciones.
 *
 * Lo propio de Athena: **la camiseta es el retrato**. No hay foto de un jugador que no existe, y una
 * silueta genérica sería un placeholder. La camiseta con tu número, pintada con los colores reales de
 * tu club, sí es tuya, y cambia cada vez que te transferís.
 *
 * El tilt se hace con dos variables CSS y una sola escritura por movimiento del puntero: nada de
 * estado de React por cuadro, que es lo que arruina los 60 fps.
 */

export interface DatosDeCarta {
  nombre: string;
  dorsal: number;
  puesto: Puesto;
  costado?: Costado;
  ovr: number;
  nivel: Nivel;
  atributos: Atributos;
  club: { nombre: string; corto: string; escudo: string | null; primario: string | null; secundario: string | null } | null;
  pais: string;
  bandera: string | null;
  edad?: number;
}

interface Props {
  datos: DatosDeCarta;
  /** `grande` es la carta protagonista; `chica` va en listas y líneas de tiempo. */
  tamano?: 'grande' | 'chica';
  /** Anima la entrada: solo cuando la carta aparece por primera vez en pantalla. */
  entra?: boolean;
  /** Anima el giro de ascenso de categoría. */
  asciende?: boolean;
  class?: string;
}

/** El máximo giro, en grados. Más que esto marea; menos no se siente. */
const TILT = 10;

export default function Carta({ datos, tamano = 'grande', entra = false, asciende = false, class: clase = '' }: Props) {
  const marco = useRef<HTMLDivElement>(null);
  const carta = useRef<HTMLDivElement>(null);
  const [tomada, setTomada] = useState(false);

  const mover = useCallback((cliente: { x: number; y: number } | null) => {
    const nodo = carta.current;
    const caja = marco.current?.getBoundingClientRect();
    if (!nodo || !caja) return;

    if (!cliente) {
      nodo.style.setProperty('--tilt-x', '0deg');
      nodo.style.setProperty('--tilt-y', '0deg');
      nodo.style.setProperty('--brillo-fuerza', '0');
      return;
    }
    /* De la posición del puntero dentro de la carta, a −1..1 en cada eje. */
    const x = (cliente.x - caja.left) / caja.width;
    const y = (cliente.y - caja.top) / caja.height;
    nodo.style.setProperty('--tilt-y', `${(x - 0.5) * 2 * TILT}deg`);
    nodo.style.setProperty('--tilt-x', `${(0.5 - y) * 2 * TILT}deg`);
    nodo.style.setProperty('--brillo-x', `${x * 100}%`);
    nodo.style.setProperty('--brillo-y', `${y * 100}%`);
    nodo.style.setProperty('--brillo-fuerza', '1');
  }, []);

  useEffect(() => {
    /* El puntero se escucha en el marco y no en la ventana: una lista de cartas no cuesta N listeners. */
    const nodo = marco.current;
    if (!nodo) return;

    const alMover = (evento: PointerEvent) => {
      if (evento.pointerType === 'touch' && !tomada) return;
      mover({ x: evento.clientX, y: evento.clientY });
    };
    const alSalir = () => {
      setTomada(false);
      mover(null);
    };
    nodo.addEventListener('pointermove', alMover);
    nodo.addEventListener('pointerleave', alSalir);
    nodo.addEventListener('pointerdown', () => setTomada(true));
    nodo.addEventListener('pointerup', () => setTomada(false));
    return () => {
      nodo.removeEventListener('pointermove', alMover);
      nodo.removeEventListener('pointerleave', alSalir);
    };
  }, [mover, tomada]);

  const rotulos = rotulosDe(datos.puesto);
  const apellido = datos.nombre.trim().split(' ').at(-1) ?? datos.nombre;
  const chica = tamano === 'chica';

  return (
    <div
      ref={marco}
      data-carta-marco
      className={`${chica ? 'w-[8.5rem]' : 'w-full max-w-[19rem]'} ${clase}`}
    >
      {/* El recorte, en unidades relativas: una sola definición para todas las cartas de la página. */}
      <svg width="0" height="0" aria-hidden="true" className="absolute">
        <defs>
          <clipPath id="carta-blason" clipPathUnits="objectBoundingBox">
            <path d={BLASON} />
          </clipPath>
        </defs>
      </svg>
      <div
        ref={carta}
        data-carta
        data-material={datos.nivel}
        data-tomada={tomada ? 'si' : undefined}
        {...(entra ? { 'data-carta-entra': '' } : {})}
        {...(asciende ? { 'data-carta-asciende': '' } : {})}
        style={{ color: 'var(--carta-tinta)' }}
      >
        <div data-carta-aura aria-hidden="true" />
        <div data-carta-holo aria-hidden="true" />

        {/* Las facetas del material: los planos de luz que tiene cualquier carta de fútbol. */}
        <Facetas color={datos.club?.primario ?? null} />

        {/* El filo del blasón: el mismo contorno, pintado por encima con el trazo hacia adentro. */}
        <svg
          data-carta-filo
          viewBox="0 0 1 1"
          preserveAspectRatio="none"
          aria-hidden="true"
          className="size-full"
        >
          <path d={BLASON} fill="none" stroke="var(--carta-filo)" strokeWidth="0.008" vectorEffect="non-scaling-stroke" />
        </svg>

        <div data-carta-capa="contenido" className="relative flex h-full flex-col">
          {/*
            La cabecera y el retrato comparten espacio: el número vive arriba a la izquierda con su
            puesto debajo de una regla, y la silueta ocupa el resto. Es la anatomía de una carta de
            fútbol de toda la vida, y por eso se lee sin instrucciones.
          */}
          <div className={`relative flex-1 ${chica ? 'px-2 pt-2' : 'px-4 pt-3.5'}`}>
            {/*
              La columna de la izquierda, como en cualquier carta de fútbol: la media, el puesto, una
              regla, la bandera y el escudo. Todo lo que identifica al jugador, apilado y fuera del
              camino del retrato.
            */}
            <div className="relative z-10 flex w-fit flex-col items-center">
              <span
                className={`font-display font-semibold leading-none tabular ${chica ? 'text-[1.65rem]' : 'text-[2.75rem]'}`}
              >
                {datos.ovr}
              </span>
              <span
                className={`font-display font-semibold uppercase leading-none tracking-label ${chica ? 'text-[9px]' : 'text-base'}`}
                style={{ color: 'var(--carta-tenue)' }}
              >
                {siglaDePuesto(datos.puesto, datos.costado)}
              </span>

              <span
                aria-hidden="true"
                className={`${chica ? 'my-1 w-5' : 'my-2 w-9'} block h-px`}
                style={{ background: 'var(--carta-filo)' }}
              />

              {datos.bandera && (
                <img
                  src={datos.bandera}
                  alt={datos.pais}
                  width={chica ? 22 : 36}
                  height={chica ? 16 : 26}
                  loading="lazy"
                  className="rounded-[2px] object-cover shadow-sm"
                />
              )}
              {datos.club?.escudo && (
                <img
                  data-carta-capa="escudo"
                  src={datos.club.escudo}
                  alt={datos.club.nombre}
                  width={chica ? 22 : 36}
                  height={chica ? 22 : 36}
                  loading="lazy"
                  className={`object-contain ${chica ? 'mt-1.5' : 'mt-2.5'}`}
                />
              )}
            </div>

            {/* El retrato: la cara, el cuello y los hombros con la camiseta del club. */}
            <Busto chica={chica} />
          </div>

          {/* La banda del nombre, entre dos líneas del material. */}
          <div
            className={`relative z-10 text-center ${chica ? 'px-1.5' : 'px-3'}`}
            style={{ borderTop: '1px solid var(--carta-filo)' }}
          >
            <p
              className={`truncate font-display font-semibold uppercase leading-tight tracking-label ${
                chica ? 'py-1 text-[11px]' : 'py-2 text-xl'
              }`}
            >
              {apellido}
            </p>
          </div>

          {/*
            Los seis atributos en dos columnas de tres, con la línea al medio. La punta del blasón se
            come el fondo de la carta, así que el bloque se cierra antes de llegar ahí.
          */}
          <div
            className={`relative z-10 grid grid-cols-2 ${chica ? 'gap-x-1 px-2 pb-7' : 'gap-x-3 px-5 pb-16'}`}
            style={{ borderTop: '1px solid var(--carta-filo)' }}
          >
            <span
              aria-hidden="true"
              className="absolute left-1/2 top-1 w-px -translate-x-1/2"
              style={{ background: 'var(--carta-filo)', bottom: chica ? '1.9rem' : '4.2rem' }}
            />
            {[rotulos.slice(0, 3), rotulos.slice(3)].map((columna, i) => (
              <div key={i} className={chica ? 'pt-1' : 'pt-2'}>
                {columna.map((rotulo) => (
                  <div
                    key={rotulo.clave}
                    className={`flex items-baseline justify-center gap-1 ${chica ? 'py-px' : 'py-0.5'}`}
                  >
                    <span
                      className={`font-display font-semibold leading-none tabular ${chica ? 'text-xs' : 'text-lg'}`}
                    >
                      {datos.atributos[rotulo.clave]}
                    </span>
                    <span
                      className={`font-display font-medium uppercase tracking-label ${chica ? 'text-[8px]' : 'text-xs'}`}
                      style={{ color: 'var(--carta-tenue)' }}
                    >
                      {rotulo.corto}
                    </span>
                    <span className="sr-only">{rotulo.largo}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>

        <div data-carta-brillo aria-hidden="true" />
      </div>

      {!chica && (
        <p className="mt-2 text-center text-2xs font-medium uppercase tracking-label text-ink-muted">
          {NOMBRE_DE_NIVEL[datos.nivel]}
          {datos.club ? ` · ${datos.club.nombre}` : ''}
          {datos.edad ? ` · ${datos.edad} años` : ''}
        </p>
      )}
    </div>
  );
}

/**
 * El retrato: la sombra de un jugador.
 *
 * No hay foto de alguien que no existe, y una carta de fútbol sin retrato es una tabla con bordes.
 * Es **una sola silueta**, de un trazo: cabeza, mandíbula, cuello y hombros. La primera versión la
 * armaba con una elipse, un rectángulo y dos orejas sueltas y se veía exactamente como lo que era,
 * un muñeco de piezas. Una sombra no tiene piezas.
 */
function Busto({ chica }: { chica: boolean }) {
  return (
    <svg
      viewBox="0 0 124 112"
      preserveAspectRatio="xMidYMax meet"
      role="presentation"
      aria-hidden="true"
      className="pointer-events-none absolute bottom-0 left-1/2 z-0 h-full -translate-x-1/2"
      style={{ width: chica ? '96%' : '92%' }}
    >
      <path
        d="M4 112C8 97 24 90 46 87c7-1 5-3 5-10V62C43 55 37 43 37 28 37 11 48 1 62 1s25 10 25 27c0 15-6 27-14 34v15c0 7-2 9 5 10 22 3 38 10 42 25z"
        fill="var(--carta-silueta, var(--carta-tinta))"
      />
    </svg>
  );
}

/**
 * Las facetas del material: los planos de luz que tiene cualquier carta de fútbol.
 *
 * Se tiñen con el color del club, así que la camiseta sigue estando aunque el retrato sea una
 * sombra. Con un club de blanco o de negro —que no distingue nada— las facetas quedan en la luz del
 * propio material.
 */
function Facetas({ color }: { color: string | null }) {
  const tinte = colorUsable(color);
  return (
    <svg
      viewBox="0 0 100 140"
      preserveAspectRatio="none"
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 size-full"
    >
      <g fill={tinte ?? 'oklch(1 0 0)'} opacity={tinte ? 0.2 : 0.09}>
        <path d="M100 0v46L58 4z" />
        <path d="M100 52v34L70 40z" />
        <path d="M0 96v-38l34 46z" />
        <path d="M28 0 0 34V0z" opacity="0.6" />
      </g>
      <g stroke={tinte ?? 'oklch(1 0 0)'} strokeWidth="0.6" fill="none" opacity={tinte ? 0.26 : 0.12}>
        <path d="M100 8 52 62M100 40 62 92M0 22l40 52M0 62l30 44" />
      </g>
    </svg>
  );
}

/** Un hex del proveedor, con o sin `#`, o `null` si no distingue nada (blanco, negro, gris). */
function colorUsable(hex: string | null): string | null {
  if (!hex) return null;
  const limpio = hex.replace('#', '').trim();
  if (!/^[0-9a-fA-F]{6}$/.test(limpio)) return null;
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(limpio.slice(i, i + 2), 16) / 255) as [number, number, number];
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  /* Sin saturación no hay identidad: el gris de un escudo no pinta una camiseta. */
  if (max - min < 0.12) return null;
  return `#${limpio.toLowerCase()}`;
}

function esOscuro(hex: string): boolean {
  const limpio = hex.replace('#', '');
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(limpio.slice(i, i + 2), 16) / 255) as [number, number, number];
  /* Luminancia relativa, la misma cuenta que usa el contraste WCAG. */
  const canal = (c: number) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
  return 0.2126 * canal(r) + 0.7152 * canal(g) + 0.0722 * canal(b) < 0.4;
}
