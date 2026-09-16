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

/**
 * "J. Mosqueira", "Á. Di María", "Z. Zidane": el proveedor abrevia el nombre de pila con una inicial
 * y un punto, tanto en las alineaciones como en la ficha del entrenador. Un nombre así no sirve ni
 * para mostrar ni para construir una URL.
 */
export function esNombreAbreviado(nombre: string): boolean {
  return /(?:^|\s)\p{L}\.(?:\s|$)/u.test(nombre);
}

/** "z-zidane": el slug que nació de un nombre abreviado, con la inicial por delante. */
export function esSlugAbreviado(slug: string): boolean {
  return /^\p{L}-/u.test(slug);
}
