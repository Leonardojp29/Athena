import type { Pregunta } from '@athena/sesenta-segundos';
import { fotoDe } from '../../lib/sesenta';

interface Props {
  pregunta: Pregunta;
}

/**
 * Lo que se ve arriba del enunciado, que es de donde sale la variedad del juego.
 *
 * Con la misma pregunta de cuatro botones, «¿quién ganó la Champions 2019?» muestra el logo del
 * torneo y «Barcelona vs Bayern» los dos escudos enfrentados. El material ya lo tiene Athena: el
 * escudo sale del id del equipo y la foto del id del futbolista, así que nada de esto pesa en la
 * respuesta del servidor.
 *
 * Todo decorativo: el enunciado ya dice de quién se habla, así que va sin texto alternativo.
 */
export function Escena({ pregunta }: Props) {
  if (pregunta.fotoRef) {
    return (
      <img
        src={fotoDe(pregunta.fotoRef)}
        alt=""
        aria-hidden="true"
        width="144"
        height="144"
        className="animate-sesenta-entra size-28 rounded-full bg-canvas-subtle object-cover ring-2 ring-border sm:size-36"
      />
    );
  }

  if (pregunta.emblemas.length === 0) return null;

  /* Una trayectoria se lee en fila y con flechas; un cruce, enfrentado. Dos o tres, nunca más. */
  const esRuta = pregunta.tipo === 'trayectoria';

  return (
    <div className="animate-sesenta-entra flex items-center justify-center gap-3 sm:gap-4">
      {pregunta.emblemas.slice(0, 3).map((url, i) => (
        <div key={url} className="flex items-center gap-3 sm:gap-4">
          {i > 0 && (
            <span aria-hidden="true" className="text-sm font-medium text-ink-muted">
              {esRuta ? '→' : 'vs'}
            </span>
          )}
          <img
            src={url}
            alt=""
            aria-hidden="true"
            width="56"
            height="56"
            className="h-10 w-12 object-contain sm:h-14 sm:w-16"
          />
        </div>
      ))}
    </div>
  );
}
