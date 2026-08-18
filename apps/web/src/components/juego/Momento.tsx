import { useCallback, useEffect, useRef, useState } from 'react';
import type { ClaseDeMomento, ContextoDeMomento, Intencion, Puesto } from '@athena/leyenda';

/**
 * Los momentos jugables.
 *
 * Cuatro escenas cortas, en SVG y con CSS: el penal, el mano a mano, el tiro libre y la atajada. La
 * mecánica de todas es la misma —**parar algo que se mueve en el momento justo**— porque es lo único que
 * funciona igual con el dedo, con el mouse y con el teclado, y porque un penal se define en el instante
 * en el que le pegás.
 *
 * La interfaz no decide nada: manda la intención (dónde, cuánta fuerza, con qué timing) y el motor la
 * resuelve con los atributos y el azar semillado. Acá solo vive la mano del jugador.
 */

interface Props {
  momento: ClaseDeMomento;
  contexto: ContextoDeMomento;
  puesto: Puesto;
  onJugar: (intencion: Intencion) => void;
}

const TITULO: Record<ClaseDeMomento, string> = {
  penal: 'Penal',
  'mano-a-mano': 'Mano a mano',
  'tiro-libre': 'Tiro libre',
  atajada: 'La atajada',
};

export default function Momento({ momento, contexto, onJugar }: Props) {
  return (
    <div data-escena className="overflow-hidden rounded-xl border border-board-edge bg-board">
      <header className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b border-board-edge px-4 py-3">
        <h2 className="font-display text-lg font-semibold uppercase tracking-label text-chalk">
          {TITULO[momento]}
        </h2>
        <p className="text-2xs uppercase tracking-label text-chalk-dim">
          {contexto.minuto}&apos; · {contexto.marcador[0]}–{contexto.marcador[1]} · {contexto.rival}
        </p>
        <p className="w-full text-sm text-chalk-dim">{contexto.escena}</p>
      </header>

      {momento === 'penal' && <Penal onJugar={onJugar} />}
      {momento === 'tiro-libre' && <TiroLibre onJugar={onJugar} />}
      {momento === 'mano-a-mano' && <Opciones tipo="mano-a-mano" onJugar={onJugar} />}
      {momento === 'atajada' && <Opciones tipo="atajada" onJugar={onJugar} />}
    </div>
  );
}

/* ---------------------------------------------------------------------- arco */

/**
 * El arco, en SVG, con la mira encima. Es el escenario compartido del penal y del tiro libre: mismo
 * espacio de coordenadas y misma lectura, así el jugador aprende una vez y sirve para las dos.
 */
function Arco({
  children,
  conBarrera = false,
}: {
  children?: React.ReactNode;
  conBarrera?: boolean;
}) {
  return (
    <div className="relative mx-auto aspect-[16/9] w-full max-w-xl">
      <svg viewBox="0 0 320 180" className="absolute inset-0 h-full w-full" aria-hidden="true">
        {/* El césped y sus líneas: el mismo trazo de tiza del resto de Athena. */}
        <rect x="0" y="0" width="320" height="180" fill="var(--a-color-pitch-dark)" />
        <g stroke="var(--a-color-chalk)" strokeOpacity="0.55" strokeWidth="1.4" fill="none">
          <path d="M44 132h232" />
          <path d="M86 96h148" />
          <path d="M86 96v36M234 96v36" />
        </g>
        {/* El arco: postes, travesaño y red. */}
        <g>
          <rect x="96" y="42" width="128" height="54" fill="var(--a-color-board)" fillOpacity="0.55" />
          <g stroke="var(--a-color-chalk)" strokeOpacity="0.22" strokeWidth="0.7">
            {Array.from({ length: 11 }, (_, i) => (
              <path key={`v${i}`} d={`M${100 + i * 12} 42v54`} />
            ))}
            {Array.from({ length: 5 }, (_, i) => (
              <path key={`h${i}`} d={`M96 ${46 + i * 12}h128`} />
            ))}
          </g>
          <g stroke="var(--a-color-chalk)" strokeWidth="3" strokeLinecap="round" fill="none">
            <path d="M96 96V42h128v54" />
          </g>
        </g>
        {conBarrera && (
          <g>
            {[0, 1, 2, 3].map((i) => (
              <rect
                key={i}
                x={132 + i * 14}
                y="104"
                width="11"
                height="28"
                rx="4"
                fill="var(--a-color-board)"
                stroke="var(--a-color-chalk)"
                strokeOpacity="0.5"
              />
            ))}
          </g>
        )}
        {/* El arquero, esperando. */}
        <g transform="translate(160 96)">
          <rect x="-7" y="-26" width="14" height="26" rx="5" fill="var(--a-color-chalk)" fillOpacity="0.9" />
          <circle cx="0" cy="-31" r="5" fill="var(--a-color-chalk)" />
        </g>
      </svg>
      {children}
    </div>
  );
}

/* --------------------------------------------------------------------- penal */

/**
 * El penal en tres toques: dirección, altura y fuerza.
 *
 * La mira barre el arco sola y el jugador la para; después la barra de fuerza sube y baja y también la
 * para. Los dos gestos son el mismo —tocar en el momento justo— y de esos dos números sale el timing
 * que el motor usa para saber si le pegaste bien.
 */
function Penal({ onJugar }: { onJugar: (intencion: Intencion) => void }) {
  const [fase, setFase] = useState<'apuntar' | 'fuerza' | 'pateando'>('apuntar');
  const [direccion, setDireccion] = useState(0);
  const [altura, setAltura] = useState(0.5);
  const mira = useRef<HTMLDivElement>(null);
  const barra = useRef<HTMLDivElement>(null);

  /* Lo que importa del timing: qué tan al borde del arco quedó la mira, y qué tan alta la fuerza. */
  const leer = useCallback((nodo: HTMLDivElement | null, propiedad: 'left' | 'transform') => {
    if (!nodo) return 0.5;
    const estilo = getComputedStyle(nodo);
    if (propiedad === 'left') {
      const caja = nodo.parentElement?.getBoundingClientRect();
      const propia = nodo.getBoundingClientRect();
      if (!caja || caja.width === 0) return 0.5;
      return (propia.left + propia.width / 2 - caja.left) / caja.width;
    }
    /* La barra late con scaleY: su escala vertical ES la fuerza en el instante del toque. */
    try {
      /* Con reduced-motion la animación no corre y `transform` puede llegar como "none". */
      if (!estilo.transform || estilo.transform === 'none') return 0.55;
      return new DOMMatrixReadOnly(estilo.transform).d || 0.55;
    } catch {
      return 0.55;
    }
  }, []);

  const parar = () => {
    if (fase === 'apuntar') {
      const x = leer(mira.current, 'left');
      /* De 0..1 a −1..1, y la altura se elige en la fase siguiente con el mismo gesto. */
      setDireccion(Math.max(-1, Math.min(1, (x - 0.5) * 2.2)));
      setFase('fuerza');
      return;
    }
    if (fase === 'fuerza') {
      const fuerza = Math.max(0.05, Math.min(1, leer(barra.current, 'transform')));
      setFase('pateando');
      /*
       * El timing sale de qué tan cerca quedó la fuerza del punto dulce (0,62): pegarle con todo o muy
       * suave castiga, y el jugador lo aprende sin que se lo expliquen.
       */
      const timing = 1 - Math.min(1, Math.abs(fuerza - 0.62) * 2.4);
      const intencion: Intencion = {
        direccion,
        altura,
        potencia: fuerza,
        timing: Math.max(0.05, timing),
      };
      window.setTimeout(() => onJugar(intencion), 620);
    }
  };

  /*
   * El teclado juega igual: flechas para la altura, espacio o Enter para parar. El listener se
   * resuscribe cuando cambia la fase y en ninguna otra ocasión: sin esas dependencias se apilaba uno
   * por render y una sola tecla disparaba varios pateos.
   */
  const pararRef = useRef(parar);
  pararRef.current = parar;
  useEffect(() => {
    const alTeclear = (evento: KeyboardEvent) => {
      if (evento.key === ' ' || evento.key === 'Enter') {
        evento.preventDefault();
        pararRef.current();
      }
      if (evento.key === 'ArrowUp') setAltura((a) => Math.min(1, a + 0.15));
      if (evento.key === 'ArrowDown') setAltura((a) => Math.max(0, a - 0.15));
    };
    window.addEventListener('keydown', alTeclear);
    return () => window.removeEventListener('keydown', alTeclear);
  }, []);

  return (
    <div className="p-4">
      <Arco>
        {/* La mira: barre el arco hasta que la paran. */}
        {fase === 'apuntar' && (
          <div
            ref={mira}
            data-mira
            className="pointer-events-none absolute size-8 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-primary"
            style={{ top: `${52 - altura * 22}%` }}
          >
            <span className="absolute inset-1/2 size-1 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary" />
          </div>
        )}
        {fase !== 'apuntar' && (
          <div
            className="pointer-events-none absolute size-8 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-primary"
            style={{ left: `${50 + direccion * 45}%`, top: `${52 - altura * 22}%` }}
          />
        )}
      </Arco>

      <div className="mt-3 flex items-end gap-3">
        {/* La barra de fuerza: solo aparece cuando toca decidirla. */}
        <div className="flex h-20 w-8 shrink-0 items-end overflow-hidden rounded-md border border-chalk/25 bg-board-edge">
          {fase === 'fuerza' ? (
            <div ref={barra} data-potencia-barra className="h-full w-full bg-primary" />
          ) : (
            <div className="h-full w-full" />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-chalk">
            {fase === 'apuntar' && 'Elegí el palo: tocá cuando la mira esté donde querés.'}
            {fase === 'fuerza' && 'Ahora la fuerza. Ni muy suave ni un misil.'}
            {fase === 'pateando' && 'Y le pegó…'}
          </p>
          <p className="mt-0.5 text-2xs text-chalk-dim">
            Con el teclado: flechas arriba y abajo para la altura, espacio para definir.
          </p>
          <div className="mt-2 flex gap-1.5">
            <button
              type="button"
              onClick={() => setAltura((a) => Math.max(0, a - 0.2))}
              disabled={fase === 'pateando'}
              className="cursor-pointer rounded-md border border-chalk/25 px-2.5 py-1 text-xs font-medium text-chalk transition-colors hover:bg-chalk/10 disabled:opacity-40"
            >
              Más raso
            </button>
            <button
              type="button"
              onClick={() => setAltura((a) => Math.min(1, a + 0.2))}
              disabled={fase === 'pateando'}
              className="cursor-pointer rounded-md border border-chalk/25 px-2.5 py-1 text-xs font-medium text-chalk transition-colors hover:bg-chalk/10 disabled:opacity-40"
            >
              Más arriba
            </button>
          </div>
        </div>

        <button
          type="button"
          onClick={parar}
          disabled={fase === 'pateando'}
          className="shrink-0 cursor-pointer rounded-md bg-primary px-5 py-3 font-display text-base font-semibold uppercase tracking-label text-primary-contrast transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {fase === 'apuntar' ? 'Apuntar' : fase === 'fuerza' ? 'Patear' : '…'}
        </button>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- tiro libre */

/**
 * El tiro libre se apunta arrastrando: del punto de la pelota al lugar del arco donde la querés. El
 * largo del arrastre es la fuerza y el ángulo es la comba, que es exactamente cómo se piensa un tiro
 * libre. Con teclado, dos deslizadores hacen lo mismo.
 */
function TiroLibre({ onJugar }: { onJugar: (intencion: Intencion) => void }) {
  const [direccion, setDireccion] = useState(0.35);
  const [altura, setAltura] = useState(0.55);
  const [fuerza, setFuerza] = useState(0.6);
  const [pateando, setPateando] = useState(false);
  const zona = useRef<HTMLDivElement>(null);

  const arrastrar = (evento: React.PointerEvent) => {
    const caja = zona.current?.getBoundingClientRect();
    if (!caja || pateando) return;
    const x = (evento.clientX - caja.left) / caja.width;
    const y = (evento.clientY - caja.top) / caja.height;
    setDireccion(Math.max(-1, Math.min(1, (x - 0.5) * 2.2)));
    setAltura(Math.max(0, Math.min(1, 1.35 - y * 1.9)));
  };

  const patear = () => {
    setPateando(true);
    /* El timing acá es la precisión del apunte: qué tan dentro del arco cayó la intención. */
    const dentro = Math.abs(direccion) < 0.95 && altura > 0.25 && altura < 0.9;
    window.setTimeout(() => onJugar({ direccion, altura, potencia: fuerza, timing: dentro ? 0.85 : 0.4 }), 620);
  };

  return (
    <div className="p-4">
      <div
        ref={zona}
        onPointerMove={arrastrar}
        onPointerDown={arrastrar}
        className="cursor-crosshair touch-none"
      >
        <Arco conBarrera>
          <div
            className="pointer-events-none absolute size-7 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-primary"
            style={{ left: `${50 + direccion * 42}%`, top: `${52 - altura * 22}%` }}
          />
          {/* La pelota, abajo, en el punto del tiro. */}
          <div
            className={`absolute bottom-[6%] left-1/2 size-3 -translate-x-1/2 rounded-full bg-chalk ${pateando ? '' : ''}`}
            {...(pateando ? { 'data-pelota-viaja': '' } : {})}
            style={
              {
                '--pelota-x': `${direccion * 42}%`,
                '--pelota-y': `${-(altura * 55 + 30)}%`,
              } as React.CSSProperties
            }
          />
        </Arco>
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_auto]">
        <div className="grid gap-2">
          <label className="text-2xs uppercase tracking-label text-chalk-dim">
            Comba
            <input
              type="range"
              min={-100}
              max={100}
              value={Math.round(direccion * 100)}
              onChange={(e) => setDireccion(Number(e.target.value) / 100)}
              disabled={pateando}
              className="mt-1 block w-full cursor-pointer accent-[var(--a-color-primary)]"
            />
          </label>
          <label className="text-2xs uppercase tracking-label text-chalk-dim">
            Altura y fuerza
            <input
              type="range"
              min={10}
              max={100}
              value={Math.round(fuerza * 100)}
              onChange={(e) => {
                const valor = Number(e.target.value) / 100;
                setFuerza(valor);
                setAltura(Math.max(0.28, Math.min(0.85, valor)));
              }}
              disabled={pateando}
              className="mt-1 block w-full cursor-pointer accent-[var(--a-color-primary)]"
            />
          </label>
        </div>
        <button
          type="button"
          onClick={patear}
          disabled={pateando}
          className="cursor-pointer self-end rounded-md bg-primary px-5 py-3 font-display text-base font-semibold uppercase tracking-label text-primary-contrast transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {pateando ? '…' : 'Pegarle'}
        </button>
      </div>
      <p className="mt-2 text-2xs text-chalk-dim">
        Arrastrá sobre el arco para apuntar por encima de la barrera, o usá los deslizadores.
      </p>
    </div>
  );
}

/* --------------------------------------------- mano a mano y atajada: leer y elegir */

const OPCIONES: Record<
  'mano-a-mano' | 'atajada',
  { intro: string; ayuda: string; opciones: Array<{ id: string; texto: string; pista: string }> }
> = {
  'mano-a-mano': {
    intro: 'Saliste solo. El arquero se te viene encima y tenés un segundo.',
    ayuda: 'Cuanto antes decidas, mejor: la barra que corre es el arquero acercándose.',
    opciones: [
      { id: 'cruzado', texto: 'Cruzarla al segundo palo', pista: 'Lo seguro. Depende de tu tiro.' },
      { id: 'encarar', texto: 'Encararlo y tirársela al costado', pista: 'Depende de tu regate.' },
      { id: 'picarla', texto: 'Picársela', pista: 'Si sale, es inolvidable. Si no, también.' },
    ],
  },
  atajada: {
    intro: 'Mano a mano contra vos. Se define en cómo lo leas.',
    ayuda: 'La barra que corre es el tiempo antes de que patee.',
    opciones: [
      { id: 'anticipar', texto: 'Anticipar el palo', pista: 'Todo o nada: si acertás, la sacás.' },
      { id: 'esperar', texto: 'Esperar hasta el final', pista: 'Lo razonable, sin gloria.' },
      { id: 'volar', texto: 'Volar', pista: 'Cubre más arco, exige timing.' },
    ],
  },
};

/**
 * La ventana de tiempo es la mecánica: el cursor cruza la barra una sola vez y lo que el jugador tarda
 * en decidir es su timing. Nadie pierde por no llegar —siempre se puede elegir— pero llegar tarde
 * cuesta, igual que en la cancha.
 */
function Opciones({ tipo, onJugar }: { tipo: 'mano-a-mano' | 'atajada'; onJugar: (i: Intencion) => void }) {
  const config = OPCIONES[tipo];
  const arranque = useRef(performance.now());
  const [elegida, setElegida] = useState<string | null>(null);
  const DURACION_MS = 2400;

  const elegir = (id: string) => {
    if (elegida) return;
    setElegida(id);
    const transcurrido = performance.now() - arranque.current;
    /* 1 si decidió de inmediato, 0 si se le fue la ventana entera. */
    const timing = Math.max(0.15, 1 - transcurrido / DURACION_MS);
    window.setTimeout(() => onJugar({ direccion: 0, altura: 0.5, potencia: 0.7, timing, eleccion: id }), 520);
  };

  return (
    <div className="p-4">
      <p className="text-base leading-relaxed text-chalk">{config.intro}</p>

      <div data-ventana className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-board-edge">
        <div
          data-ventana-cursor
          className="h-full w-10 rounded-full bg-primary"
          style={{ '--ventana-duracion': `${DURACION_MS}ms` } as React.CSSProperties}
        />
      </div>
      <p className="mt-1 text-2xs text-chalk-dim">{config.ayuda}</p>

      <ul className="mt-3 flex flex-col gap-2">
        {config.opciones.map((opcion, i) => (
          <li key={opcion.id}>
            <button
              type="button"
              onClick={() => elegir(opcion.id)}
              disabled={elegida !== null}
              aria-pressed={elegida === opcion.id}
              className="flex w-full cursor-pointer items-start gap-3 rounded-lg border border-chalk/20 p-3 text-left transition-colors hover:border-primary hover:bg-chalk/8 disabled:cursor-default aria-pressed:border-primary aria-pressed:bg-primary/16"
            >
              <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-chalk/12 font-display text-xs font-semibold tabular text-chalk">
                {i + 1}
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-medium text-chalk">{opcion.texto}</span>
                <span className="mt-0.5 block text-2xs text-chalk-dim">{opcion.pista}</span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
