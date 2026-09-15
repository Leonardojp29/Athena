import { useEffect, useState } from 'react';

/* Un segundo por número: tres, dos, uno y a jugar. Es el tiempo que uno tarda en acomodarse. */
const PASO_MS = 1000;

interface Props {
  onListo: () => void;
}

/**
 * La largada.
 *
 * Existe porque la ronda dura diez segundos: entrar de golpe y encontrarse el reloj ya corriendo
 * regala la primera ronda. Acá se sabe exactamente cuándo empieza a contar.
 */
export function Largada({ onListo }: Props) {
  const [paso, setPaso] = useState(3);

  useEffect(() => {
    if (paso === 0) {
      const salida = window.setTimeout(onListo, PASO_MS);
      return () => window.clearTimeout(salida);
    }
    const siguiente = window.setTimeout(() => setPaso(paso - 1), PASO_MS);
    return () => window.clearTimeout(siguiente);
  }, [paso, onListo]);

  return (
    <div
      data-largada={paso}
      className="grid flex-1 place-items-center px-4"
      aria-live="assertive"
      aria-atomic="true"
    >
      <div className="relative grid size-40 place-items-center">
        <svg viewBox="0 0 100 100" className="absolute inset-0 size-full -rotate-90" aria-hidden="true">
          <circle cx="50" cy="50" r="46" fill="none" stroke="currentColor" strokeWidth="2" className="text-border" />
          <circle
            key={paso}
            cx="50"
            cy="50"
            r="46"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            pathLength="1"
            strokeDasharray="1"
            className="animate-impostor-aro text-primary-ink"
          />
        </svg>
        <p
          key={paso}
          className="animate-impostor-largada font-display text-6xl font-semibold uppercase tabular tracking-label"
        >
          {paso === 0 ? 'Ya' : paso}
        </p>
      </div>
    </div>
  );
}
