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

        {/* El filo del material: la única línea de la carta, y cambia con la categoría. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 rounded-[inherit]"
          style={{ boxShadow: 'inset 0 0 0 1px var(--carta-filo)' }}
        />

        <div data-carta-capa="contenido" className="relative flex h-full flex-col">
          {/* Cabecera: el número manda, y a su lado la identidad. */}
          <div className={`flex items-start gap-2 ${chica ? 'px-2 pt-2' : 'px-3.5 pt-3.5'}`}>
            <div className="flex flex-col items-center">
              <span
                className={`font-display font-semibold leading-none tabular ${chica ? 'text-2xl' : 'text-4xl'}`}
              >
                {datos.ovr}
              </span>
              <span
                className={`mt-0.5 font-display font-semibold uppercase tracking-label ${chica ? 'text-[9px]' : 'text-xs'}`}
                style={{ color: 'var(--carta-tenue)' }}
              >
                {siglaDePuesto(datos.puesto, datos.costado)}
              </span>
            </div>

            <div className="ml-auto flex flex-col items-end gap-1">
              {datos.bandera && (
                <img
                  src={datos.bandera}
                  alt={datos.pais}
                  width={chica ? 14 : 20}
                  height={chica ? 10 : 14}
                  loading="lazy"
                  className="rounded-[1px] object-cover"
                />
              )}
              {datos.club?.escudo && (
                <img
                  data-carta-capa="escudo"
                  src={datos.club.escudo}
                  alt={datos.club.nombre}
                  width={chica ? 16 : 26}
                  height={chica ? 16 : 26}
                  loading="lazy"
                  className="object-contain"
                />
              )}
            </div>
          </div>

          {/* La camiseta: el retrato. Con los colores del club y el dorsal. */}
          <div className="relative flex flex-1 items-center justify-center">
            <Camiseta
              dorsal={datos.dorsal}
              primario={datos.club?.primario ?? null}
              secundario={datos.club?.secundario ?? null}
              chica={chica}
            />
          </div>

          {/* El nombre, sobre la línea del material. */}
          <div
            className={`text-center ${chica ? 'px-1.5' : 'px-3'}`}
            style={{ borderTop: '1px solid var(--carta-filo)' }}
          >
            <p
              className={`truncate font-display font-semibold uppercase leading-tight tracking-label ${
                chica ? 'py-1 text-[11px]' : 'py-1.5 text-lg'
              }`}
            >
              {apellido}
            </p>
          </div>

          {/* Los seis atributos: dos filas de tres, con el rótulo del puesto. */}
          <div
            className={`grid grid-cols-3 ${chica ? 'gap-x-1 gap-y-0.5 px-2 pb-2' : 'gap-x-2 gap-y-1 px-3.5 pb-3'}`}
            style={{ borderTop: '1px solid var(--carta-filo)' }}
          >
            {rotulos.map((rotulo) => (
              <div key={rotulo.clave} className="flex items-baseline justify-center gap-1 pt-1">
                <span
                  className={`font-display font-semibold leading-none tabular ${chica ? 'text-xs' : 'text-base'}`}
                >
                  {datos.atributos[rotulo.clave]}
                </span>
                <span
                  className={`font-medium uppercase tracking-label ${chica ? 'text-[8px]' : 'text-2xs'}`}
                  style={{ color: 'var(--carta-tenue)' }}
                >
                  {rotulo.corto}
                </span>
                <span className="sr-only">{rotulo.largo}</span>
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
 * La camiseta, en SVG y con los colores del club.
 *
 * El croma se filtra igual que en el resto de Athena: un club de blanco o de negro no se distingue por
 * su color, así que en ese caso la camiseta toma la tinta del material y se apoya en el dorsal. El
 * dorsal siempre lleva el color de contraste calculado, nunca uno fijo.
 */
function Camiseta({
  dorsal,
  primario,
  secundario,
  chica,
}: {
  dorsal: number;
  primario: string | null;
  secundario: string | null;
  chica: boolean;
}) {
  const base = colorUsable(primario);
  const detalle = colorUsable(secundario);
  const tela = base ?? 'var(--carta-tinta)';
  const opacidadTela = base ? 1 : 0.14;
  const tinta = base ? (esOscuro(base) ? '#f7f7f5' : '#141414') : 'var(--carta-tinta)';
  const ancho = chica ? 62 : 132;

  return (
    <svg
      viewBox="0 0 120 120"
      width={ancho}
      height={ancho}
      role="img"
      aria-label={`Camiseta número ${dorsal}`}
      className="drop-shadow-sm"
    >
      {/* El cuerpo de la camiseta: hombros, mangas y caída. */}
      <path
        d="M60 16c6 0 10-2 13-4l19 8c5 2 8 7 7 12l-4 15-9-3v54c0 3-2 5-5 5H39c-3 0-5-2-5-5V44l-9 3-4-15c-1-5 2-10 7-12l19-8c3 2 7 4 13 4z"
        fill={tela}
        fillOpacity={opacidadTela}
        stroke="var(--carta-filo)"
        strokeWidth="1.5"
      />
      {/* El cuello y una franja de detalle, con el color secundario si distingue. */}
      <path
        d="M47 12c4 4 8 6 13 6s9-2 13-6"
        fill="none"
        stroke={detalle ?? 'var(--carta-filo)'}
        strokeWidth="3"
        strokeLinecap="round"
      />
      {detalle && (
        <path d="M34 50h52" stroke={detalle} strokeWidth="3.5" strokeLinecap="round" opacity="0.75" />
      )}
      <text
        x="60"
        y="86"
        textAnchor="middle"
        fill={tinta}
        style={{
          font: `600 ${chica ? 30 : 34}px var(--a-font-display)`,
          letterSpacing: '-0.02em',
        }}
      >
        {dorsal}
      </text>
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
