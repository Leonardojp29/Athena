import { useCallback, useEffect, useRef, useState } from 'react';
import type { FutbolistaBuscado } from '../../lib/api';
import { buscarFutbolistas } from '../../lib/adivina';

/* El mismo compás que el buscador del sitio: lo justo para no pedir en cada tecla. */
const ESPERA_MS = 120;

const sinAcentos = (texto: string): string =>
  texto.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

/** El mismo criterio grueso del servidor: que el nombre contenga lo escrito, sin tildes. */
const calza = (nombre: string, consulta: string): boolean =>
  sinAcentos(nombre).includes(sinAcentos(consulta));

interface Props {
  bloqueado: boolean;
  /** Lo que devolvió el último intento, para contarlo sin robarle el foco al campo. */
  aviso: { tono: 'acierto' | 'repetido' | 'fallo'; texto: string } | null;
  onElegir: (futbolista: FutbolistaBuscado) => void;
}

export function BuscadorDeJugadores({ bloqueado, aviso, onElegir }: Props) {
  const [consulta, setConsulta] = useState('');
  const [resultados, setResultados] = useState<FutbolistaBuscado[]>([]);
  const [resaltado, setResaltado] = useState(0);
  const campo = useRef<HTMLInputElement>(null);
  const enVuelo = useRef<AbortController | null>(null);
  /* Borrar una letra tiene que ser gratis: lo ya resuelto no se vuelve a pedir. */
  const memoria = useRef(new Map<string, FutbolistaBuscado[]>());
  /* La última respuesta del servidor, para adelantar mientras llega la siguiente. */
  const anterior = useRef<{ consulta: string; resultados: FutbolistaBuscado[] } | null>(null);

  useEffect(() => {
    const limpia = consulta.trim();
    if (limpia.length === 0) {
      setResultados([]);
      return;
    }

    const guardado = memoria.current.get(limpia.toLowerCase());
    if (guardado) {
      setResultados(guardado);
      setResaltado(0);
      return;
    }

    /*
     * Lo que ya se tiene se muestra de inmediato mientras el servidor contesta.
     *
     * Cada consulta cuesta la ida y vuelta a una base que está fuera de región, y esperarla en
     * blanco hace sentir lento a un buscador que no lo es. Al seguir escribiendo, lo que respondió
     * la palabra más corta ya contiene casi siempre lo que vale, así que se filtra acá y la lista
     * no parpadea: cuando llega la respuesta buena, reemplaza.
     */
    const adelanto = anterior.current;
    if (adelanto && limpia.toLowerCase().startsWith(adelanto.consulta)) {
      const filtrados = adelanto.resultados.filter((f) => calza(f.nombre, limpia));
      if (filtrados.length > 0) {
        setResultados(filtrados);
        setResaltado(0);
      }
    }

    const temporizador = window.setTimeout(() => {
      enVuelo.current?.abort();
      const control = new AbortController();
      enVuelo.current = control;
      void buscarFutbolistas(limpia, control.signal)
        .then((encontrados) => {
          memoria.current.set(limpia.toLowerCase(), encontrados);
          anterior.current = { consulta: limpia.toLowerCase(), resultados: encontrados };
          setResultados(encontrados);
          setResaltado(0);
        })
        .catch(() => undefined);
    }, ESPERA_MS);

    return () => window.clearTimeout(temporizador);
  }, [consulta]);

  /* Después de cada intento el foco vuelve solo: escribir el siguiente nombre no cuesta un clic. */
  useEffect(() => {
    if (!bloqueado) campo.current?.focus();
  }, [aviso, bloqueado]);

  const elegir = useCallback(
    (futbolista: FutbolistaBuscado) => {
      onElegir(futbolista);
      setConsulta('');
      setResultados([]);
    },
    [onElegir],
  );

  const alTeclear = (evento: React.KeyboardEvent<HTMLInputElement>): void => {
    if (resultados.length === 0) return;
    if (evento.key === 'ArrowDown') {
      evento.preventDefault();
      setResaltado((i) => (i + 1) % resultados.length);
    } else if (evento.key === 'ArrowUp') {
      evento.preventDefault();
      setResaltado((i) => (i - 1 + resultados.length) % resultados.length);
    } else if (evento.key === 'Enter') {
      evento.preventDefault();
      const elegido = resultados[resaltado];
      if (elegido) elegir(elegido);
    } else if (evento.key === 'Escape') {
      setConsulta('');
      setResultados([]);
    }
  };

  const TONO = {
    acierto: 'text-win-ink',
    repetido: 'text-card-yellow-ink',
    fallo: 'text-ink-muted',
  } as const;

  return (
    <div className="w-full" data-buscador>
      <label className="sr-only" htmlFor="once-buscador">
        Busca un futbolista
      </label>
      <div className="relative">
        <input
          ref={campo}
          id="once-buscador"
          type="search"
          autoComplete="off"
          disabled={bloqueado}
          value={consulta}
          onChange={(e) => setConsulta(e.target.value)}
          onKeyDown={alTeclear}
          placeholder="Escribe un futbolista…"
          role="combobox"
          aria-expanded={resultados.length > 0}
          aria-controls="once-resultados"
          aria-autocomplete="list"
          className={[
            'w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-base text-ink',
            'placeholder:text-ink-muted focus-visible:border-primary-ink focus-visible:outline-2',
            'focus-visible:outline-offset-1 focus-visible:outline-primary-ink disabled:opacity-50',
            'transition-[border-color] duration-200',
            aviso?.tono === 'fallo' ? 'animate-once-niega' : '',
          ].join(' ')}
        />
      </div>

      <p
        aria-live="polite"
        className={`mt-1.5 h-4 text-xs ${aviso ? TONO[aviso.tono] : 'text-ink-muted'}`}
      >
        {aviso?.texto ?? ''}
      </p>

      {resultados.length > 0 && (
        <ul
          id="once-resultados"
          role="listbox"
          className="mt-1 overflow-hidden rounded-lg border border-border bg-surface"
        >
          {resultados.map((futbolista, indice) => (
            <li key={futbolista.id} role="presentation">
              <button
                type="button"
                role="option"
                aria-selected={indice === resaltado}
                onMouseEnter={() => setResaltado(indice)}
                onClick={() => elegir(futbolista)}
                className={[
                  'flex w-full items-center gap-2.5 px-3 py-2 text-left transition-colors duration-150',
                  indice === resaltado ? 'bg-primary/12' : 'hover:bg-canvas-subtle',
                ].join(' ')}
              >
                {futbolista.fotoUrl ? (
                  <img
                    src={futbolista.fotoUrl}
                    alt=""
                    width="28"
                    height="28"
                    loading="lazy"
                    className="size-7 shrink-0 rounded-full object-cover"
                  />
                ) : (
                  <span className="grid size-7 shrink-0 place-items-center rounded-full bg-canvas-subtle text-2xs font-semibold text-ink-muted">
                    {futbolista.nombre.slice(0, 1)}
                  </span>
                )}
                <span className="truncate text-sm">{futbolista.nombre}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
