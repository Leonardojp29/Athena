import { createRequire } from 'node:module';
import fs from 'node:fs';
import { Resvg, initWasm } from '@resvg/resvg-wasm';
import oswald from './fuentes/oswald.ttf?inline';
import archivo from './fuentes/archivo.ttf?inline';

/*
 * El rasterizador, una sola vez por proceso.
 *
 * Vite incrusta las fuentes como `data:` al empaquetar. Se probó leerlas del disco con una ruta
 * relativa y el bundle queda en otra carpeta que el fuente: el recurso desaparecía de la imagen sin
 * que nada fallara, que es la peor manera de romperse.
 */

const deDatos = (uri: string) => Buffer.from(uri.slice(uri.indexOf(',') + 1), 'base64');

let listo: Promise<void> | null = null;
function preparar(): Promise<void> {
  listo ??= (async () => {
    const require = createRequire(import.meta.url);
    await initWasm(fs.readFileSync(require.resolve('@resvg/resvg-wasm/index_bg.wasm')));
  })();
  return listo;
}

export async function comoPng(svg: string, ancho: number): Promise<ArrayBuffer> {
  await preparar();
  const png = new Resvg(svg, {
    fitTo: { mode: 'width', value: ancho },
    font: { fontBuffers: [deDatos(oswald), deDatos(archivo)], defaultFontFamily: 'Archivo' },
  })
    .render()
    .asPng();
  return new Uint8Array(png).buffer as ArrayBuffer;
}

/* resvg no sale a la red: las imágenes de fuera tienen que llegar ya embebidas. */
const enCache = new Map<string, string | null>();
export async function comoDatos(url: string | null): Promise<string | null> {
  if (!url) return null;
  const guardado = enCache.get(url);
  if (guardado !== undefined) return guardado;
  try {
    const respuesta = await fetch(url, { signal: AbortSignal.timeout(6_000) });
    if (!respuesta.ok) throw new Error(String(respuesta.status));
    const tipo = respuesta.headers.get('content-type') ?? 'image/png';
    const base64 = Buffer.from(await respuesta.arrayBuffer()).toString('base64');
    const datos = `data:${tipo};base64,${base64}`;
    enCache.set(url, datos);
    return datos;
  } catch {
    enCache.set(url, null);
    return null;
  }
}
