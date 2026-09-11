import type { Mundo, MundoLiviano } from '@athena/leyenda';

export const RUTA_DEL_MUNDO = '/juegos/mi-leyenda/mundo.json';

export function aligerar(mundo: Mundo): MundoLiviano {
  return { ...mundo, ligas: mundo.ligas.map(({ clubes: _clubes, ...liga }) => liga) };
}

let enVuelo: Promise<Mundo> | null = null;

/** Los clubes, una sola vez por pestaña. Un fallo no se memoriza: `forzar` vuelve a intentarlo. */
export function pedirMundo(forzar = false): Promise<Mundo> {
  if (forzar) enVuelo = null;
  enVuelo ??= descargarMundo().catch((error: unknown) => {
    enVuelo = null;
    throw error;
  });
  return enVuelo;
}

async function descargarMundo(): Promise<Mundo> {
  const respuesta = await fetch(RUTA_DEL_MUNDO);
  if (!respuesta.ok) throw new Error(`${RUTA_DEL_MUNDO} → ${respuesta.status}`);
  return (await respuesta.json()) as Mundo;
}
