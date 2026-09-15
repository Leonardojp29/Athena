import { useCallback, useEffect, useRef, useState } from 'react';
import type { FutbolistaBuscado } from '../../lib/api';
import { buscarEnIndice, buscarFutbolistas, fotoDe } from '../../lib/adivina';
import { Icono } from './Icono';

/* El mismo compás que el buscador del sitio: lo justo para no pedir en cada tecla. */
const ESPERA_MS = 120;


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

  useEffect(() => {
    const limpia = consulta.trim();
    if (limpia.length === 0) {
      setResultados([]);
      return;
    }

    /*
     * Primero el índice que el navegador ya tiene: son milisegundos y cubre a los conocidos, que son
     * justamente los que aparecen en un once memorable. Solo si no encuentra nada se sale a la red,
     * que contra una base en otra región cuesta casi un segundo.
     */
    const locales = buscarEnIndice(limpia);
    if (locales.length > 0) {
      setResultados(locales);
      setResaltado(0);
      return;
    }

    const guardado = memoria.current.get(limpia.toLowerCase());
    if (guardado) {
      setResultados(guardado);
      setResaltado(0);
      return;
    }

    const temporizador = window.setTimeout(() => {
      enVuelo.current?.abort();
      const control = new AbortController();
      enVuelo.current = control;
      void buscarFutbolistas(limpia, control.signal)
        .then((encontrados) => {
          memoria.current.set(limpia.toLowerCase(), encontrados);
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
    acierto: 'border-win/40 bg-win/12 text-win-ink',
    repetido: 'border-card-yellow/50 bg-card-yellow/15 text-card-yellow-ink',
    fallo: 'border-card-red/40 bg-card-red/10 text-ink-muted',
  } as const;

  return (
    <div className="w-full" data-buscador>
      <label className="sr-only" htmlFor="once-buscador">
        Busca un futbolista
      </label>
      <div className="relative">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted">
          <Icono nombre="buscar" size={18} />
        </span>
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
            'w-full rounded-lg border-2 border-border bg-canvas py-3 pl-10 pr-3 text-base text-ink',
            'placeholder:text-ink-muted focus-visible:border-primary-ink focus-visible:outline-none',
            'disabled:opacity-50 transition-[border-color] duration-200',
            aviso?.tono === 'fallo' ? 'animate-once-niega' : '',
          ].join(' ')}
        />
      </div>

      {/*
        El alto está reservado siempre, así que aparecer o desaparecer no mueve nada de abajo, y la
        animación es solo del aviso: el campo de texto nunca se re-monta y no se pierde una tecla.
      */}
      <div className="mt-1 h-6">
        {aviso && (
          <p
            key={`${aviso.tono}-${aviso.texto}`}
            aria-live="polite"
            className={`animate-once-aviso flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs ${TONO[aviso.tono]}`}
          >
            <Icono
              nombre={aviso.tono === 'acierto' ? 'check' : aviso.tono === 'repetido' ? 'info' : 'cerrar'}
              size={14}
            />
            {aviso.texto}
          </p>
        )}
      </div>

      {resultados.length > 0 && (
        <ul
          id="once-resultados"
          role="listbox"
          className="mt-1 overflow-hidden rounded-lg border border-border bg-canvas"
        >
          {resultados.map((futbolista, indice) => (
            <li key={futbolista.ref} role="presentation">
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
                <img
                  src={fotoDe(futbolista.ref)}
                  alt=""
                  width="28"
                  height="28"
                  loading="lazy"
                  className="size-7 shrink-0 rounded-full bg-canvas-subtle object-cover"
                />
                <span className="truncate text-sm">{futbolista.nombre}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
