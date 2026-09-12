import { createRequire } from 'node:module';
import fs from 'node:fs';
import type { APIRoute } from 'astro';
import { Resvg, initWasm } from '@resvg/resvg-wasm';
import {
  calcularTablas,
  conFase,
  decodificar,
  LIGA1,
  resumir,
  type DatosDeLaCalculadora,
} from '@athena/calculadora';
import liga1 from '../../tarjeta/liga1.png?inline';
import oswald from '../../tarjeta/fuentes/oswald.ttf?inline';
import archivo from '../../tarjeta/fuentes/archivo.ttf?inline';
import { dibujarTarjeta } from '../../tarjeta/dibujar';
import { api } from '../../lib/api';

/*
 * La tarjeta como imagen.
 *
 * La misma URL sirve para dos cosas: es el `og:image` del enlace —así WhatsApp muestra la
 * predicción en vez de un bloque de texto— y es lo que abre el botón de compartir. Una sola
 * imagen, un solo diseño, un solo lugar donde arreglarlo.
 *
 * Se dibuja el SVG a mano y lo rasteriza resvg en WebAssembly. Se probó satori, que arma el SVG
 * desde un árbol como el de React, y no pudo leer ninguna de las dos fuentes variables del sitio;
 * resvg las lee sin quejarse y de paso el diseño queda escrito, no compuesto.
 */

const SLUG = 'primera-division';
const ANCHO = 1200;

interface Crudo {
  competencia: { nombre: string; slug: string; logo: string | null };
  temporada: number | null;
  equipos: Array<[string, string, string, string | null, string | null]>;
  partidos: Array<[string, string, number, number, string, number | null, number | null, string]>;
  ordenOficial: Array<{ etiqueta: string; equipos: number[] }>;
}

const CLAVES: Array<[RegExp, string]> = [
  [/anual/i, 'anual'],
  [/clausura/i, 'clausura'],
  [/apertura/i, 'apertura'],
];

function armar(crudo: Crudo): DatosDeLaCalculadora {
  const equipos = crudo.equipos.map(([id, nombre, slug, logo, color]) => ({
    id,
    nombre,
    slug,
    logo,
    color,
    codigo: '',
  }));
  return {
    competencia: crudo.competencia,
    temporada: crudo.temporada ?? 0,
    fase: null,
    fecha: null,
    equipos,
    partidos: conFase(
      crudo.partidos.map(([id, ronda, local, visita, estado, gl, gv, kickoff]) => ({
        id,
        ronda,
        local: equipos[local]?.id ?? '',
        visita: equipos[visita]?.id ?? '',
        estado: estado as DatosDeLaCalculadora['partidos'][number]['estado'],
        golesLocal: gl,
        golesVisita: gv,
        kickoff,
      })),
    ) as DatosDeLaCalculadora['partidos'],
    ordenOficial: crudo.ordenOficial.map(({ etiqueta, equipos: indices }) => ({
      clave: CLAVES.find(([patron]) => patron.test(etiqueta))?.[1] ?? etiqueta,
      equipos: indices.flatMap((i) => (equipos[i] ? [equipos[i].id] : [])),
    })),
  };
}

/* resvg no sale a la red: los escudos tienen que llegar ya embebidos. */
const enCache = new Map<string, string | null>();
async function comoDatos(url: string | null): Promise<string | null> {
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

/*
 * Vite incrusta las fuentes y el escudo como `data:` al empaquetar. Se probó leerlos del disco con
 * una ruta relativa y el bundle queda en otra carpeta que el fuente: el escudo desaparecía de la
 * tarjeta sin que nada fallara, que es la peor manera de romperse.
 */
const deDatos = (uri: string) => Buffer.from(uri.slice(uri.indexOf(',') + 1), 'base64');

let listo: Promise<void> | null = null;
function prepararResvg(): Promise<void> {
  listo ??= (async () => {
    const require = createRequire(import.meta.url);
    await initWasm(fs.readFileSync(require.resolve('@resvg/resvg-wasm/index_bg.wasm')));
  })();
  return listo;
}

export const GET: APIRoute = async ({ url }) => {
  let crudo: Crudo;
  try {
    crudo = await api<Crudo>(`/views/calculadora/${SLUG}`);
  } catch {
    return new Response(null, { status: 503, headers: { 'cache-control': 'no-store' } });
  }

  const datos = armar(crudo);
  const pronosticos = decodificar(url.searchParams.get('p'), datos.equipos, datos.partidos);

  const enJuego =
    LIGA1.tablas.find((t) =>
      t.fases.includes(datos.partidos.find((p) => p.estado === 'scheduled')?.fase ?? ''),
    )?.clave ?? LIGA1.claveAcumulada;

  const tablas = calcularTablas(
    LIGA1.tablas,
    datos.equipos,
    datos.partidos,
    pronosticos,
    datos.ordenOficial,
  );
  const resumen = resumir(tablas, LIGA1, enJuego, datos.partidos, pronosticos);
  /* Sin pronósticos no hay predicción: dibujar la tabla de hoy y llamarla "mi predicción" mentiría. */
  if (!resumen?.campeon || resumen.puestos === 0) {
    return new Response(null, { status: 404, headers: { 'cache-control': 'no-store' } });
  }

  const [escudoClub] = await Promise.all([comoDatos(resumen.campeon.logo)]);

  const svg = dibujarTarjeta({
    resumen,
    escudoClub,
    escudoLiga: liga1,
    competencia: crudo.competencia.nombre,
    temporada: datos.temporada,
    sitio: url.host,
  });

  await prepararResvg();
  const png = new Resvg(svg, {
    fitTo: { mode: 'width', value: ANCHO },
    font: {
      fontBuffers: [deDatos(oswald), deDatos(archivo)],
      defaultFontFamily: 'Archivo',
    },
  })
    .render()
    .asPng();

  return new Response(new Uint8Array(png).buffer as ArrayBuffer, {
    headers: {
      'content-type': 'image/png',
      /*
       * El escenario está en la URL, así que dos pedidos iguales dan la misma imagen para siempre:
       * se guarda en el borde y no se vuelve a dibujar.
       */
      'cache-control': 'public, s-maxage=86400, stale-while-revalidate=604800',
    },
  });
};
