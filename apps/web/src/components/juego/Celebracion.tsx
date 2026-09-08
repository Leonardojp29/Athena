import { useCallback, useEffect, useMemo, useState } from 'react';
import { NOMBRE_DE_NIVEL, type Cambio, type Capitulo, type Resultado, type Trofeo } from '@athena/leyenda';

/**
 * Lo que se celebra.
 *
 * Un título que aparece como una línea de texto en una lista no se siente un título. Esta pantalla
 * existe para que el pago del bienio ocurra **en el medio**, con el escudo real de la competencia
 * ocupando la pantalla: es el único momento del juego en el que no hay nada que decidir y todo el
 * espacio es para lo que ganaste.
 *
 * Se encadena sola y se salta con un clic, con Escape o con espacio. Nunca dura más de dos segundos
 * y media: la recompensa tiene que ser un golpe, no una espera.
 */

interface Props {
  capitulo: Capitulo;
  onCerrar: () => void;
}

type Escena =
  | { clase: 'resultado'; resultado: Resultado }
  | { clase: 'trofeo'; trofeo: Trofeo }
  | { clase: 'nivel'; de: string; a: string };

/*
 * Un trofeo se mira dos segundos; una consecuencia se lee. La escena de resultado espera al jugador
 * en lugar de irse sola: es la respuesta a la pregunta que acaba de hacerse y llevaba texto que
 * desaparecía antes de terminar de leerlo.
 */
const MS_POR_ESCENA = 2600;

/** Lo que merece pantalla, en orden de importancia: primero lo que ganaste, después lo que subiste. */
export function escenasDe(capitulo: Capitulo): Escena[] {
  const escenas: Escena[] = [];

  /*
   * Lo primero es lo que acabás de decidir. Va antes que cualquier trofeo porque es la respuesta a la
   * pregunta que el jugador se hizo hace dos segundos: cómo salió, y qué se movió.
   */
  if (capitulo.resultado) escenas.push({ clase: 'resultado', resultado: capitulo.resultado });

  const jerarquia: Record<Trofeo['clase'], number> = {
    seleccion: 0,
    continental: 1,
    liga: 2,
    copa: 3,
    individual: 4,
  };
  for (const trofeo of [...capitulo.trofeos].sort((a, b) => jerarquia[a.clase] - jerarquia[b.clase])) {
    escenas.push({ clase: 'trofeo', trofeo });
  }

  if (capitulo.ascenso) {
    escenas.push({
      clase: 'nivel',
      de: NOMBRE_DE_NIVEL[capitulo.ascenso.de],
      a: NOMBRE_DE_NIVEL[capitulo.ascenso.a],
    });
  }

  /*
   * El salto de media **no** entra acá. Subir dos puntos es una buena noticia, no un acontecimiento
   * que justifique tapar la pantalla: eso se ve en la carta, que es donde vive el número, con el
   * contador subiendo y su marca al lado. Lo que se lleva la pantalla es lo que pasa una vez.
   */

  /* Cuatro escenas es el techo: a la quinta la celebración deja de premiar y empieza a estorbar. */
  return escenas.slice(0, 4);
}

export default function Celebracion({ capitulo, onCerrar }: Props) {
  const escenas = useMemo(() => escenasDe(capitulo), [capitulo]);
  const [i, setI] = useState(0);

  const siguiente = useCallback(() => {
    setI((actual) => {
      if (actual + 1 >= escenas.length) {
        onCerrar();
        return actual;
      }
      return actual + 1;
    });
  }, [escenas.length, onCerrar]);

  useEffect(() => {
    if (escenas.length === 0) {
      onCerrar();
      return;
    }
    /*
     * Un trofeo se mira y se pasa; una consecuencia se lee. La escena de resultado no se va sola: es
     * la respuesta a la pregunta que el jugador acaba de hacerse y su texto desaparecía antes de que
     * terminara de leerlo.
     */
    if (escenas[i]?.clase === 'resultado') return;
    const reloj = window.setTimeout(siguiente, MS_POR_ESCENA);
    return () => window.clearTimeout(reloj);
  }, [i, escenas, siguiente, onCerrar]);

  useEffect(() => {
    const teclas = (evento: KeyboardEvent) => {
      if (evento.key === 'Escape') {
        evento.preventDefault();
        onCerrar();
        return;
      }
      if (evento.key === ' ' || evento.key === 'Enter') {
        evento.preventDefault();
        siguiente();
      }
    };
    window.addEventListener('keydown', teclas);
    return () => window.removeEventListener('keydown', teclas);
  }, [onCerrar, siguiente]);

  const escena = escenas[i];
  if (!escena) return null;

  return (
    <div
      data-celebracion
      role="dialog"
      aria-live="polite"
      aria-label="Lo que ganaste"
      onClick={siguiente}
      className="fixed inset-0 z-50 grid cursor-pointer place-items-center px-6 backdrop-blur-sm"
      style={{ background: 'oklch(0.13 0.012 285 / 0.94)' }}
    >
      <div key={i} data-celebracion-escena className="relative flex flex-col items-center text-center">
        {/* La luz de atrás: es lo que hace que un escudo parezca un trofeo y no un icono. */}
        <span aria-hidden="true" data-celebracion-luz className="pointer-events-none absolute" />

        {escena.clase === 'resultado' && <EscenaDeResultado resultado={escena.resultado} />}
        {escena.clase === 'trofeo' && <EscenaDeTrofeo trofeo={escena.trofeo} />}
        {escena.clase === 'nivel' && (
          <>
            <p className="text-2xs font-medium uppercase tracking-label text-chalk-dim">Tu carta cambió</p>
            <p
              data-celebracion-titulo
              className="mt-2 font-display text-5xl font-semibold uppercase leading-none tracking-label text-primary sm:text-6xl"
            >
              {escena.a}
            </p>
            <p className="mt-3 text-sm text-chalk-dim">
              Dejaste atrás <span className="text-chalk">{escena.de}</span>.
            </p>
          </>
        )}
      </div>

      <p className="absolute bottom-8 text-2xs uppercase tracking-label text-chalk-dim">
        {escenas.length > 1 ? `${i + 1} de ${escenas.length} · ` : ''}toca para seguir
      </p>
    </div>
  );
}

/**
 * Cómo salió lo que elegiste.
 *
 * El rótulo dice si la apuesta salió bien o mal —cuando había una apuesta— y debajo van los números
 * que se movieron. Es la parte que el juego no tenía: se decidía, se leían dos líneas de texto y
 * venía la pregunta siguiente sin que nada pareciera haber pasado.
 */
function EscenaDeResultado({ resultado }: { resultado: Resultado }) {
  const rotulo =
    resultado.salioBien === true
      ? 'Salió bien'
      : resultado.salioBien === false
        ? 'Salió mal'
        : 'Lo que decidiste';
  const color =
    resultado.salioBien === true
      ? 'text-primary'
      : resultado.salioBien === false
        ? 'text-card-red-ink'
        : 'text-chalk';

  return (
    <>
      <p className={`text-2xs font-medium uppercase tracking-label ${color}`}>{rotulo}</p>
      {/*
        La consecuencia se **lee**: va en caja baja, con interlínea de lectura y ancho de línea
        acotado. En mayúsculas de display estaba bien para un "CAMPEÓN" de una palabra y muy mal para
        cuarenta, que es lo que dura una consecuencia contada de verdad.
      */}
      <p
        data-celebracion-titulo
        className="mt-4 max-w-[46ch] text-balance text-xl font-medium leading-snug text-chalk sm:text-2xl sm:leading-snug"
      >
        {resultado.texto}
      </p>

      {resultado.cambios.length > 0 && (
        <ul className="mt-6 flex flex-wrap justify-center gap-2">
          {resultado.cambios.map((cambio) => (
            <li key={cambio.rotulo}>
              <Chip cambio={cambio} />
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

/** Un número que se movió. El signo manda: verde si subió, rojo si bajó. */
function Chip({ cambio }: { cambio: Cambio }) {
  /* El estrés es el único al revés: que suba es una mala noticia. */
  const bueno = cambio.rotulo === 'Estrés' ? cambio.delta < 0 : cambio.delta > 0;
  const valor =
    cambio.formato === 'millones'
      ? `${cambio.delta > 0 ? '+' : '−'}${Math.abs(cambio.delta).toFixed(1)} M`
      : `${cambio.delta > 0 ? '+' : '−'}${Math.abs(Math.round(cambio.delta))}`;

  return (
    <span
      className={`flex items-baseline gap-2 rounded-lg border px-3 py-2 ${
        bueno ? 'border-primary/40 bg-primary/12' : 'border-card-red/40 bg-card-red/12'
      }`}
    >
      <span className="text-[10px] uppercase tracking-label text-chalk-dim">{cambio.rotulo}</span>
      <span
        className={`font-display text-xl font-semibold leading-none tabular ${
          bueno ? 'text-primary' : 'text-card-red-ink'
        }`}
      >
        {valor}
      </span>
    </span>
  );
}

/**
 * El título, en el orden en que se lee.
 *
 * Primero el escudo, después **CAMPEÓN** grande, y al final el nombre de la competencia y el año. Antes
 * era al revés —"Campeón" en diez píxeles arriba del logo y el nombre de la liga como protagonista— y
 * el jugador lo dijo con todas las letras: "se ve el título de Primera División sobre el logo, a las
 * justas vi lo de campeón". Lo que se celebra es haber ganado; qué se ganó es el subtítulo.
 */
function EscenaDeTrofeo({ trofeo }: { trofeo: Trofeo }) {
  const individual = trofeo.clase === 'individual';
  const grito = individual ? 'Premiado' : trofeo.clase === 'seleccion' ? 'Campeón' : 'Campeón';

  return (
    <>
      <span data-celebracion-objeto className="relative grid size-36 place-items-center sm:size-44">
        {trofeo.escudo ? (
          <img
            src={trofeo.escudo}
            alt=""
            className="size-full object-contain drop-shadow-[0_0_28px_oklch(0.906_0.191_118/0.45)]"
          />
        ) : (
          <TrofeoDibujado dorado={!individual} />
        )}
      </span>

      <p
        data-celebracion-titulo
        className="mt-9 font-display text-6xl font-bold uppercase leading-[0.85] tracking-label text-primary sm:mt-10 sm:text-7xl"
      >
        {grito}
      </p>

      <p className="mt-5 max-w-md font-display text-lg font-semibold uppercase leading-tight tracking-label text-chalk sm:text-xl">
        {trofeo.nombre}
      </p>
      <p className="mt-1.5 text-xs tabular text-chalk-dim">
        {trofeo.clubNombre} · {trofeo.temporada}
      </p>
      {trofeo.detalle && <p className="mt-3 max-w-sm text-xs italic text-chalk-dim">{trofeo.detalle}</p>}
    </>
  );
}

/** El trofeo de la casa, para los premios individuales: no hay logo de un Balón de Oro en la base. */
function TrofeoDibujado({ dorado }: { dorado: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={`size-full ${dorado ? 'text-card-yellow' : 'text-data'} drop-shadow-[0_0_28px_currentColor]`}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M8 4.5h8v4.2a4 4 0 0 1-8 0z" fill="currentColor" fillOpacity="0.18" />
      <path d="M8 5.5H5.2v1.8A3.2 3.2 0 0 0 8.4 10.5M16 5.5h2.8v1.8a3.2 3.2 0 0 1-3.2 3.2" />
      <path d="M12 12.7v3.3M8.5 19.5h7" />
      <path d="M10 16h4l.8 3.5h-5.6z" fill="currentColor" fillOpacity="0.18" />
    </svg>
  );
}
