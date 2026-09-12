import { useLayoutEffect, useRef } from 'react';

/*
 * Las filas viajan a su nueva posición en vez de aparecer ahí.
 *
 * Es FLIP: se mide dónde estaba cada fila, se la deja saltar, y se la anima desde la diferencia
 * hasta cero. El navegador solo compone `transform`, así que dieciocho filas moviéndose a la vez
 * no cuestan un solo recálculo de layout.
 *
 * Sin esto, cambiar un marcador reordenaba la tabla de golpe y el ojo perdía a quién seguía: el
 * movimiento **es** el dato —quién subió y quién bajó—, y mostrarlo es la mitad de para qué sirve
 * una calculadora.
 */

const DURACION_MS = 460;
/* Sale rápido y frena suave, como algo que tiene peso. */
const CURVA = 'cubic-bezier(0.22, 1, 0.36, 1)';
const RASTRO_MS = 760;

interface Posicion {
  y: number;
  puesto: number;
}

export function useFlip(orden: string[]) {
  const contenedor = useRef<HTMLTableSectionElement>(null);
  const previas = useRef(new Map<string, Posicion>());
  const clave = orden.join();

  useLayoutEffect(() => {
    const cuerpo = contenedor.current;
    if (!cuerpo) return;

    const filas = [...cuerpo.querySelectorAll<HTMLElement>('[data-fila]')];
    const actuales = new Map<string, Posicion>();
    const quieto = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

    filas.forEach((fila, puesto) => {
      const id = fila.dataset.fila;
      if (!id) return;
      const y = fila.getBoundingClientRect().top;
      actuales.set(id, { y, puesto });

      const antes = previas.current.get(id);
      if (quieto || !antes) return;

      if (Math.abs(antes.y - y) >= 1) {
        fila.animate(
          [{ transform: `translateY(${antes.y - y}px)` }, { transform: 'translateY(0)' }],
          { duration: DURACION_MS, easing: CURVA },
        );
      }

      /*
       * El rastro de color se dispara por cambio de **puesto**, no de píxeles: cuando uno sube,
       * los de abajo se corren sin haber cambiado nada, y encenderlos a todos convertía el dato
       * en ruido.
       */
      if (antes.puesto === puesto) return;
      const subio = puesto < antes.puesto;
      const tinte = `var(--a-color-${subio ? 'win' : 'card-red'})`;
      fila.animate(
        [
          { backgroundColor: `color-mix(in oklch, ${tinte} 22%, transparent)` },
          { backgroundColor: `color-mix(in oklch, ${tinte} 14%, transparent)`, offset: 0.45 },
          { backgroundColor: 'transparent' },
        ],
        { duration: RASTRO_MS, easing: 'ease-out' },
      );
    });

    previas.current = actuales;
  }, [clave]);

  return contenedor;
}

/** Un número que cambió da un salto corto: dice "mirá acá" sin mover nada de su sitio. */
export function usePulso(valor: number | string) {
  const elemento = useRef<HTMLElement>(null);
  const previo = useRef(valor);

  useLayoutEffect(() => {
    if (previo.current === valor) return;
    previo.current = valor;
    const quieto = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    if (quieto) return;
    elemento.current?.animate(
      [
        { transform: 'scale(1)' },
        { transform: 'scale(1.3)', offset: 0.35 },
        { transform: 'scale(1)' },
      ],
      { duration: 380, easing: CURVA },
    );
  }, [valor]);

  return elemento;
}
