/*
 * Favoritos del navegador: ligas, equipos y jugadores.
 *
 * Marcar algo no debería exigir una cuenta, así que la fuente de verdad para quien no entró es
 * `localStorage`. Quien entró además los sincroniza con su cuenta, y ahí sí lo sigue a cualquier
 * dispositivo; el aviso de la primera vez existe justamente porque un favorito que desaparece al
 * cambiar de máquina, sin haberlo dicho, se siente como un bug.
 *
 * Este módulo corre en el cliente. No importa nada del servidor a propósito: lo carga el script
 * del botón, que Astro empaqueta una sola vez para toda la página.
 */
export type TipoFavorito = 'liga' | 'equipo' | 'jugador';

export interface Favorito {
  tipo: TipoFavorito;
  /** El uuid de Athena: lo necesita la cuenta, no el navegador. */
  id: string;
  slug: string;
  nombre: string;
  logoUrl: string | null;
  /** País ya en español, para agrupar la lista sin volver a traducir en el cliente. */
  pais: string | null;
  banderaUrl: string | null;
}

const CLAVE = 'athena:favoritos';
/** La primera versión guardaba solo ligas como `{slug, nombre}`. Se migra al leer. */
const CLAVE_VIEJA = 'athena:ligas-favoritas';
const CLAVE_AVISO = 'athena:aviso-favoritos';

/** Se dispara en `window` cada vez que la lista cambia: los botones y la barra se repintan. */
export const EVENTO_FAVORITOS = 'athena:favoritos';

export const claveFavorito = (tipo: TipoFavorito, slug: string): string => `${tipo}:${slug}`;

export function leerFavoritos(): Favorito[] {
  const guardados = parsear(CLAVE);
  const viejos = migrarLigas();
  if (viejos.length === 0) return guardados;

  const conocidos = new Set(guardados.map((f) => claveFavorito(f.tipo, f.slug)));
  const fusionados = [...guardados, ...viejos.filter((f) => !conocidos.has(claveFavorito(f.tipo, f.slug)))];
  escribir(fusionados);
  try {
    localStorage.removeItem(CLAVE_VIEJA);
  } catch {
    /* si no se puede borrar, la fusión es idempotente y no duplica */
  }
  return fusionados;
}

/** Marca o desmarca y devuelve si quedó marcado. */
export function alternarFavorito(favorito: Favorito): boolean {
  const lista = leerFavoritos();
  const clave = claveFavorito(favorito.tipo, favorito.slug);
  const estaba = lista.some((f) => claveFavorito(f.tipo, f.slug) === clave);

  escribir(estaba ? lista.filter((f) => claveFavorito(f.tipo, f.slug) !== clave) : [...lista, favorito]);
  window.dispatchEvent(new CustomEvent(EVENTO_FAVORITOS));
  return !estaba;
}

/** True la primera vez que alguien guarda algo, y solo esa vez. */
export function primeraVez(): boolean {
  try {
    if (localStorage.getItem(CLAVE_AVISO)) return false;
    localStorage.setItem(CLAVE_AVISO, '1');
    return true;
  } catch {
    /* En modo privado el aviso se repite: es lo menos malo de las dos opciones. */
    return true;
  }
}

function parsear(clave: string): Favorito[] {
  try {
    const raw = localStorage.getItem(clave);
    const lista = raw ? (JSON.parse(raw) as Favorito[]) : [];
    return Array.isArray(lista) ? lista.filter((f) => f && typeof f.slug === 'string' && !!f.tipo) : [];
  } catch {
    return [];
  }
}

function migrarLigas(): Favorito[] {
  try {
    const raw = localStorage.getItem(CLAVE_VIEJA);
    if (!raw) return [];
    const lista = JSON.parse(raw) as Array<{ slug?: string; nombre?: string }>;
    if (!Array.isArray(lista)) return [];
    return lista
      .filter((f) => typeof f?.slug === 'string')
      .map((f) => ({
        tipo: 'liga' as const,
        id: '',
        slug: f.slug as string,
        nombre: f.nombre ?? (f.slug as string),
        logoUrl: null,
        pais: null,
        banderaUrl: null,
      }));
  } catch {
    return [];
  }
}

function escribir(lista: Favorito[]): void {
  try {
    localStorage.setItem(CLAVE, JSON.stringify(lista));
  } catch {
    /* Almacenamiento lleno o bloqueado: la interfaz sigue, sin persistir. */
  }
}
