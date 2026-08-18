import { useEffect, useState } from 'react';
import { NOMBRE_DE_NIVEL, type Nivel } from '@athena/leyenda';
import { EVENTO_LEYENDA, leerPartida, leerSalon, type EntradaDelSalon } from '../../lib/leyenda';

/**
 * Lo que ya jugaste, en el catálogo.
 *
 * Dos cosas y ninguna decorativa: la carrera en curso —para volver a ella sin buscarla— y las que
 * terminaron, con su arquetipo y su enlace. El salón es lo que cierra el bucle del juego: al ver "El
 * mercenario" al lado de "El héroe de un solo club" queda claro que la próxima carrera puede ser otra
 * cosa, que es exactamente la razón para empezarla.
 *
 * Todo vive en el navegador, así que esto se pinta después de hidratar. Mientras no haya nada guardado
 * no ocupa ni un píxel: un módulo vacío que dice "todavía no jugaste" es ruido.
 */
export default function TuCarrera() {
  const [enCurso, setEnCurso] = useState<{ nombre: string; temporadas: number; club: string; ovr: number; nivel: Nivel } | null>(null);
  const [salon, setSalon] = useState<EntradaDelSalon[]>([]);

  useEffect(() => {
    const leer = () => {
      const partida = leerPartida();
      setEnCurso(
        partida && partida.etapa !== 'legado'
          ? {
              nombre: partida.futbolista.nombre,
              temporadas: partida.temporadas.length,
              club: partida.clubActual?.nombre ?? 'sin club',
              ovr: partida.ovr,
              nivel: partida.nivel,
            }
          : null,
      );
      setSalon(leerSalon());
    };
    leer();
    window.addEventListener(EVENTO_LEYENDA, leer);
    return () => window.removeEventListener(EVENTO_LEYENDA, leer);
  }, []);

  if (!enCurso && salon.length === 0) return null;

  return (
    <section className="mt-6">
      {enCurso && (
        <a
          href="/juegos/mi-leyenda"
          className="flex items-center gap-3 rounded-xl border border-primary/40 bg-primary/8 p-4 transition-colors hover:bg-primary/14"
        >
          <span className="grid size-11 shrink-0 place-items-center rounded-lg bg-primary font-display text-lg font-semibold tabular text-primary-contrast">
            {enCurso.ovr}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-2xs font-medium uppercase tracking-label text-primary-ink">
              Seguir tu carrera
            </span>
            <span className="block truncate font-display text-lg font-semibold uppercase leading-tight tracking-label">
              {enCurso.nombre}
            </span>
            <span className="block truncate text-2xs text-ink-muted">
              {enCurso.club} · {enCurso.temporadas} temporada{enCurso.temporadas === 1 ? '' : 's'} ·{' '}
              {NOMBRE_DE_NIVEL[enCurso.nivel]}
            </span>
          </span>
        </a>
      )}

      {salon.length > 0 && (
        <>
          <h2 className="mb-2 mt-6 font-display text-sm font-semibold uppercase tracking-label">
            Tus leyendas
          </h2>
          <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {salon.map((entrada) => (
              <li key={entrada.codigo}>
                <a
                  href={`/juegos/mi-leyenda/${entrada.codigo}`}
                  className="flex h-full items-start gap-3 rounded-lg border border-border bg-surface p-3 transition-colors hover:border-primary-ink"
                >
                  <span className="grid size-9 shrink-0 place-items-center rounded-md bg-canvas-subtle font-display text-base font-semibold tabular">
                    {entrada.ovr}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium">{entrada.nombre}</span>
                    <span className="block truncate text-2xs text-primary-ink">{entrada.adn}</span>
                    <span className="block truncate text-[10px] text-ink-muted">
                      {entrada.temporadas} temporadas · {entrada.goles} goles · {entrada.trofeos} títulos
                    </span>
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
