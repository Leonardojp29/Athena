import { ICONS, type IconName } from '../../icons/paths';
import { CONTINENT_ICONS, type ContinentIconName } from '../../icons/paths.continents';

interface Props {
  nombre: IconName | ContinentIconName;
  size?: number;
  className?: string;
}

/**
 * Gemelo de `Icon.astro` para la isla, con la misma regla: trazo de 24×24 que hereda `currentColor`
 * y nunca fija un hex. Decorativo siempre —cada icono acompaña a un rótulo que ya lo dice—, así que
 * va `aria-hidden` y no pide etiqueta.
 */
export function Icono({ nombre, size = 20, className }: Props) {
  const icono = (ICONS as Record<string, { body: string }>)[nombre] ?? CONTINENT_ICONS[nombre as ContinentIconName];
  if (!icono) return null;

  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={size >= 24 ? 1.5 : size >= 20 ? 1.75 : 2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className={`shrink-0 ${className ?? ''}`}
      dangerouslySetInnerHTML={{ __html: icono.body }}
    />
  );
}
