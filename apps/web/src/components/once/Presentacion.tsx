import { useEffect, useState } from 'react';
import type { RetoParaJugar } from '../../lib/api';

/* Lo que dura la ficha del partido antes de la cuenta. Alcanza para leerla sin que se haga larga. */
const LECTURA_MS = 2200;

interface Props {
  reto: RetoParaJugar;
  onListo: () => void;
}

/**
 * La entrada: el partido primero y el reloj después.
 *
 * El contexto del partido es la pista gratuita del juego, así que se lee sin apuro; recién cuando
 * termina el 3-2-1 arranca el cronómetro.
 */
export function Presentacion({ reto, onListo }: Props) {
  const [cuenta, setCuenta] = useState<number | null>(null);

  useEffect(() => {
    const entrada = window.setTimeout(() => setCuenta(3), LECTURA_MS);
    return () => window.clearTimeout(entrada);
  }, []);

  useEffect(() => {
    if (cuenta === null) return;
    if (cuenta === 0) {
      onListo();
      return;
    }
    const paso = window.setTimeout(() => setCuenta(cuenta - 1), 700);
    return () => window.clearTimeout(paso);
  }, [cuenta, onListo]);

  const izquierda = reto.deLocal
    ? { nombre: reto.objetivoNombre, escudo: reto.objetivoEscudoUrl, goles: reto.golesObjetivo }
    : { nombre: reto.rivalNombre, escudo: reto.rivalEscudoUrl, goles: reto.golesRival };
  const derecha = reto.deLocal
    ? { nombre: reto.rivalNombre, escudo: reto.rivalEscudoUrl, goles: reto.golesRival }
    : { nombre: reto.objetivoNombre, escudo: reto.objetivoEscudoUrl, goles: reto.golesObjetivo };

  return (
    <div
      data-presentacion
      className="mx-auto flex min-h-[70vh] w-full max-w-lg flex-col items-center justify-center px-4 text-center"
    >
      <div className="animate-once-entra">
        <p className="flex items-center justify-center gap-2 text-xs uppercase tracking-label text-ink-muted">
          {reto.competenciaLogoUrl && (
            <span className="grid size-6 place-items-center rounded bg-chalk p-0.5 ring-1 ring-border">
              <img src={reto.competenciaLogoUrl} alt="" width="20" height="20" className="size-full object-contain" />
            </span>
          )}
          {reto.competencia} {reto.temporada}
        </p>
        {reto.fase && <p className="mt-1 text-xs text-ink-muted">{reto.fase}</p>}

        <div className="mt-6 flex items-center justify-center gap-4 sm:gap-6">
          <Escudo nombre={izquierda.nombre} url={izquierda.escudo} />
          <p className="font-display text-4xl font-semibold tabular text-ink sm:text-5xl">
            {izquierda.goles}<span className="mx-1.5 text-ink-muted">–</span>{derecha.goles}
          </p>
          <Escudo nombre={derecha.nombre} url={derecha.escudo} />
        </div>

        {reto.nota && <p className="mt-3 text-2xs text-ink-muted">{reto.nota}</p>}

        <p className="mt-8 font-display text-xl font-semibold uppercase leading-tight tracking-label text-ink sm:text-2xl">
          Adivina el XI titular
          <span className="mt-1 block text-primary-ink">{reto.objetivoNombre}</span>
        </p>
      </div>

      <div className="mt-10 grid h-20 place-items-center" aria-live="polite">
        {cuenta !== null && cuenta > 0 && (
          <span
            key={cuenta}
            data-cuenta={cuenta}
            className="animate-once-cuenta font-display text-6xl font-semibold tabular text-primary-ink"
          >
            {cuenta}
          </span>
        )}
      </div>
    </div>
  );
}

function Escudo({ nombre, url }: { nombre: string; url: string | null }) {
  return (
    <span className="flex w-20 flex-col items-center gap-2 sm:w-24">
      {url ? (
        <span className="grid size-14 place-items-center rounded-full bg-chalk p-1.5 ring-1 ring-border sm:size-16">
          <img src={url} alt="" width="52" height="52" className="size-full object-contain" />
        </span>
      ) : (
        <span className="grid size-14 place-items-center rounded-full border border-border-strong sm:size-16" />
      )}
      <span className="text-2xs leading-tight text-ink-muted">{nombre}</span>
    </span>
  );
}
