/**
 * Build a URL-safe slug from an entity name (SEO routes like /jugadores/lionel-messi).
 * Uniqueness is guaranteed by appending a short id at persistence time when needed.
 */
export function slugify(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // strip diacritics: "Hernández" -> "Hernandez"
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
