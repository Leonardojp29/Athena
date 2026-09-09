import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

/**
 * El primer tooltip del proyecto.
 *
 * Hasta acá el patrón era el `title` nativo del navegador, que llega con la tipografía del sistema,
 * tarda medio segundo en aparecer, no se puede maquetar y en un trofeo ganado tres veces solo sabe
 * escupir una línea de texto corrido.
 *
 * Dos decisiones que valen la pena explicar:
 *
 * - **Va en un portal a `body`, con posición fija.** El disparador casi siempre vive dentro de una
 *   caja con `overflow` —la banda de la ficha, la lista de la vitrina— y cualquier panel absoluto
 *   dentro de esa caja se recorta. Midiendo el disparador y dibujando fuera, el mismo componente
 *   sirve en cualquier lado.
 * - **Aparece con el foco además del puntero**, y se va con Escape. Un dato que solo existe al pasar
 *   el mouse es un dato que no existe para quien navega con teclado.
 */
export default function Tooltip({ contenido, children }: { contenido: ReactNode; children: ReactNode }) {
  const disparador = useRef<HTMLSpanElement>(null);
  const [caja, setCaja] = useState<{ x: number; y: number; arriba: boolean } | null>(null);

  const abrir = useCallback(() => {
    const nodo = disparador.current;
    if (!nodo) return;
    const r = nodo.getBoundingClientRect();
    /* Abre hacia abajo salvo que no haya lugar: entonces sale por arriba del disparador. */
    const arriba = r.bottom + 150 > window.innerHeight;
    setCaja({ x: r.left + r.width / 2, y: arriba ? r.top - 8 : r.bottom + 8, arriba });
  }, []);

  const cerrar = useCallback(() => setCaja(null), []);

  useEffect(() => {
    if (!caja) return;
    const alTeclear = (evento: KeyboardEvent) => {
      if (evento.key === 'Escape') cerrar();
    };
    window.addEventListener('keydown', alTeclear);
    window.addEventListener('scroll', cerrar, true);
    return () => {
      window.removeEventListener('keydown', alTeclear);
      window.removeEventListener('scroll', cerrar, true);
    };
  }, [caja, cerrar]);

  return (
    <>
      <span
        ref={disparador}
        tabIndex={0}
        onMouseEnter={abrir}
        onMouseLeave={cerrar}
        onFocus={abrir}
        onBlur={cerrar}
        className="cursor-help rounded-md outline-none focus-visible:ring-2 focus-visible:ring-primary-ink"
      >
        {children}
      </span>

      {caja &&
        createPortal(
          <span
            role="tooltip"
            className="pointer-events-none fixed z-[60] w-max max-w-[15rem] -translate-x-1/2 rounded-lg border border-border-strong bg-surface px-3 py-2 text-left shadow-magnet duration-150 animate-in fade-in zoom-in-95"
            style={{
              left: caja.x,
              top: caja.y,
              transform: `translateX(-50%)${caja.arriba ? ' translateY(-100%)' : ''}`,
            }}
          >
            {contenido}
          </span>,
          document.body,
        )}
    </>
  );
}
