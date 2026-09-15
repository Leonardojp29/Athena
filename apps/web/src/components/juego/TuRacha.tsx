import { useEffect, useState } from 'react';
import { EVENTO_IMPOSTOR, leerMarcas } from '../../lib/impostor';

/**
 * La mejor racha de El Impostor, en el catálogo.
 *
 * Un solo número y lo que hace falta para volver. Vive en el navegador, así que esto se pinta
 * después de hidratar; mientras no haya nada guardado no ocupa ni un píxel, porque un módulo que
 * dice "todavía no jugaste" es ruido al lado de la tarjeta que ya lo invita.
 */
export default function TuRacha() {
  const [racha, setRacha] = useState(0);

  useEffect(() => {
    const leer = () => setRacha(leerMarcas().mejorRacha);
    leer();
    window.addEventListener(EVENTO_IMPOSTOR, leer);
    return () => window.removeEventListener(EVENTO_IMPOSTOR, leer);
  }, []);

  if (racha === 0) return null;

  return (
    <a
      href="/juegos/el-impostor"
      className="group mt-4 flex items-center gap-4 rounded-xl border border-card-yellow/40 bg-card-yellow/8 p-4 transition-[colors,transform] duration-200 hover:-translate-y-px hover:bg-card-yellow/14"
    >
      <span className="grid size-12 shrink-0 place-items-center rounded-lg bg-card-yellow font-display text-xl font-semibold tabular text-primary-contrast">
        {racha}
      </span>

      <span className="min-w-0 flex-1">
        <span className="block text-2xs font-medium uppercase tracking-label text-card-yellow-ink">
          Tu mejor racha
        </span>
        <span className="block truncate font-display text-xl font-semibold uppercase leading-tight tracking-label">
          El Impostor
        </span>
        <span className="block truncate text-2xs text-ink-muted">
          {racha === 1 ? '1 impostor seguido' : `${racha} impostores seguidos`} · a ver si lo superas
        </span>
      </span>

      <span className="shrink-0 font-display text-sm font-semibold uppercase tracking-label text-card-yellow-ink">
        Jugar →
      </span>
    </a>
  );
}
