interface Duraciones {
  /** Segundos que el navegador puede reutilizar la respuesta sin preguntar. */
  navegador: number;
  /** Segundos que el borde la sirve como fresca. */
  borde: number;
  /** Segundos extra en los que el borde la sirve vieja mientras la renueva por detrás. */
  obsoleto: number;
}

/* Espejo de los TTL de apps/api/src/modules/views/views.controller.ts: si cambia uno, cambia el otro. */
const POLITICAS = {
  juego: { navegador: 300, borde: 86400, obsoleto: 172800 },
  /* El catálogo de clubes pesa 133 KB: quien vuelve a su carrera en la misma hora no lo baja de nuevo. */
  clubesDelJuego: { navegador: 3600, borde: 86400, obsoleto: 172800 },
  /* Los apellidos que escribe una persona jugando son los mismos que escribe la de al lado. */
  buscadorDelJuego: { navegador: 300, borde: 300, obsoleto: 600 },
  /* El índice del buscador pesa y cambia poco: quien juega dos veces seguidas no lo baja de nuevo. */
  indiceDelJuego: { navegador: 86400, borde: 86400, obsoleto: 172800 },
  /* El once de un partido de 2019 no va a cambiar; si cambia, lo corrige la importación. */
  solucionDelJuego: { navegador: 3600, borde: 86400, obsoleto: 172800 },
  home: { navegador: 0, borde: 30, obsoleto: 60 },
  dia: { navegador: 0, borde: 60, obsoleto: 300 },
  catalogo: { navegador: 60, borde: 3600, obsoleto: 7200 },
  competencia: { navegador: 60, borde: 300, obsoleto: 600 },
  equipo: { navegador: 60, borde: 300, obsoleto: 600 },
  jugador: { navegador: 60, borde: 600, obsoleto: 1200 },
  busqueda: { navegador: 0, borde: 300, obsoleto: 600 },
  partidoEnJuego: { navegador: 0, borde: 15, obsoleto: 30 },
  partidoProgramado: { navegador: 0, borde: 120, obsoleto: 240 },
  partidoTerminado: { navegador: 60, borde: 3600, obsoleto: 3600 },
} satisfies Record<string, Duraciones>;

export type Politica = keyof typeof POLITICAS;

export function encabezadoDeCache(politica: Politica): string {
  const { navegador, borde, obsoleto } = POLITICAS[politica];
  return `public, max-age=${navegador}, s-maxage=${borde}, stale-while-revalidate=${obsoleto}`;
}

export function cachear(respuesta: { headers: Headers }, politica: Politica): void {
  respuesta.headers.set('Cache-Control', encabezadoDeCache(politica));
}

export function sinCache(respuesta: { headers: Headers }): void {
  respuesta.headers.set('Cache-Control', 'no-store');
}
