import { useEffect, useState } from 'react';
import { CAPITULOS, NOMBRE_DE_NIVEL, type Nivel } from '@athena/leyenda';
import { EVENTO_LEYENDA, leerPartida } from '../../lib/leyenda';

/**
 * La carrera abierta, en el catálogo.
 *
 * Una sola cosa y ninguna decorativa: la partida en curso, para volver a ella sin buscarla. **No hay
 * historial**: una leyenda que terminó se cuenta, se comparte si el jugador quiere y desaparece. Lo
 * que hace que alguien empiece otra carrera es justamente que la anterior ya no esté esperándolo.
 *
 * Vive en el navegador, así que esto se pinta después de hidratar. Mientras no haya nada guardado no
 * ocupa ni un píxel: un módulo vacío que dice "todavía no jugaste" es ruido.
 */

interface EnCurso {
  nombre: string;
  capitulo: number;
  club: string;
  escudo: string | null;
  ovr: number;
  nivel: Nivel;
}

export default function TuCarrera() {
  const [enCurso, setEnCurso] = useState<EnCurso | null>(null);

  useEffect(() => {
    const leer = () => {
      const partida = leerPartida();
      setEnCurso(
        partida && partida.etapa !== 'legado'
          ? {
              nombre: partida.futbolista.nombre,
              capitulo: Math.min(partida.capitulo + 1, CAPITULOS),
              club: partida.clubActual?.nombre ?? 'sin club',
              escudo: partida.clubActual?.escudo ?? null,
              ovr: partida.ovr,
              nivel: partida.nivel,
            }
          : null,
      );
    };
    leer();
    window.addEventListener(EVENTO_LEYENDA, leer);
    return () => window.removeEventListener(EVENTO_LEYENDA, leer);
  }, []);

  if (!enCurso) return null;

  return (
    <a
      href="/juegos/mi-leyenda"
      className="group relative mt-4 flex items-center gap-4 overflow-hidden rounded-xl border border-primary/40 bg-primary/8 p-4 transition-[colors,transform] duration-200 hover:-translate-y-px hover:bg-primary/14"
    >
      {enCurso.escudo && (
        <img
          src={enCurso.escudo}
          alt=""
          aria-hidden="true"
          className="pointer-events-none absolute -right-4 top-1/2 h-[190%] -translate-y-1/2 object-contain opacity-[0.07]"
        />
      )}

      <span className="relative grid size-12 shrink-0 place-items-center rounded-lg bg-primary font-display text-xl font-semibold tabular text-primary-contrast">
        {enCurso.ovr}
      </span>

      <span className="relative min-w-0 flex-1">
        <span className="block text-2xs font-medium uppercase tracking-label text-primary-ink">
          Seguir tu carrera
        </span>
        <span className="block truncate font-display text-xl font-semibold uppercase leading-tight tracking-label">
          {enCurso.nombre}
        </span>
        <span className="block truncate text-2xs text-ink-muted">
          {enCurso.club} · capítulo {enCurso.capitulo} de {CAPITULOS} · {NOMBRE_DE_NIVEL[enCurso.nivel]}
        </span>
      </span>

      <span className="relative shrink-0 font-display text-sm font-semibold uppercase tracking-label text-primary-ink">
        Continuar →
      </span>
    </a>
  );
}
