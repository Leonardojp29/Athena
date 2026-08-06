import { EVENT_ICONS, type EventIconName } from '../icons/paths.events';

interface Props {
  kind: string;
  size?: number;
  detail?: string;
  className?: string;
}

/** Gemelo del componente Astro, para el Match Center en vivo. */
export default function EventIcon({ kind, size = 18, detail, className }: Props) {
  const icon = EVENT_ICONS[kind as EventIconName];
  if (!icon) return null;

  const strokeWidth = size >= 24 ? 1.5 : size >= 20 ? 1.75 : 2;

  return (
    <span className={`inline-flex items-center ${className ?? ''}`}>
      <svg
        viewBox="0 0 24 24"
        width={size}
        height={size}
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        focusable="false"
        style={icon.color ? { color: icon.color } : undefined}
        dangerouslySetInnerHTML={{ __html: icon.body }}
      />
      <span className="sr-only">{detail ? `${icon.label}: ${detail}` : icon.label}</span>
    </span>
  );
}
