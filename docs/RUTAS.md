# Rutas y caché

Catálogo de todo lo que Athena expone por HTTP: método, autenticación y caché. Es la referencia
para configurar CloudFront, el borde de Vercel o un Nginx propio, ruta por ruta.

Todo lo que dice esta guía está leído del código, no supuesto. Si cambia un `Cache-Control`, cambia
acá.

```
navegador ──→ WEB (Astro SSR)  ──→ API (NestJS) ──→ Postgres
                  │                     ▲
                  └─ proxies *.json ────┘   mismo origen, sin CORS

cron ─────────────────────────────→ API  POST /v1/internal/*  (header x-cron-secreto)
```

## La regla que ordena todo

**Cada respuesta declara su propia caché.** El CDN no necesita saber nada del negocio: lo único que
tiene que hacer es **respetar el `Cache-Control` que manda el origen**. Si mañana una vista cambia
su duración, no hay que tocar el CDN.

En CloudFront eso es una política de caché con:

- `MinTTL = 0`, `DefaultTTL = 0`, `MaxTTL` alto (un día alcanza)
- **cabeceras de caché del origen activadas**, para que respete el `s-maxage`
- compresión encendida, Gzip y Brotli: el API responde sin comprimir
- en la clave de caché, solo `Accept-Encoding` y los query strings que indica cada tabla

**Ninguna ruta usa cookies.** No hay sesión ni login, así que no hay que reenviar ni cachear cookies
en ningún comportamiento. Es lo que hace que el sitio entero sea cacheable en el borde.

**Varias rutas deciden su caché en tiempo de ejecución.** Un partido en juego dura 15 segundos y
uno terminado 3600. Una página de juego que falló al cargar responde `no-store`. Por eso el CDN no
puede fijar TTL propios: tiene que obedecer al origen.

---

## API

Prefijo global `/v1`. Todo lo que no diga otra cosa es **GET público y cacheable**.

### Vistas — `/v1/views/*`

| Ruta | Borde | Vieja mientras renueva | Query en la clave |
|---|---:|---:|---|
| `GET /v1/views/marcadores` | **5 s** | — | ninguna |
| `GET /v1/views/en-vivo` | 30 s | 60 s | ninguna |
| `GET /v1/views/home` | 60 s | 120 s | ninguna |
| `GET /v1/views/matches` | 60 s | 300 s | `fecha` |
| `GET /v1/views/match/:id` | **dinámica** | dinámica | ninguna |
| `GET /v1/views/match-por-ruta` | 3600 s | 86400 s | `local`, `visita`, `fecha` |
| `GET /v1/views/competition/:slug` | 300 s | 600 s | `temporada` |
| `GET /v1/views/team/:slug` | 300 s | 600 s | ninguna |
| `GET /v1/views/player/:slug` | 600 s | 1200 s | ninguna |
| `GET /v1/views/competitions` | 3600 s | 7200 s | ninguna |
| `GET /v1/views/calculadora/:slug` | **dinámica** | dinámica | ninguna |
| `GET /v1/views/calendario-semana` | 300 s | 900 s | `desde`, `dias` |
| `GET /v1/views/top-performers` | 300 s | 600 s | `fecha`, `continente` |
| `GET /v1/views/mundo` | 86400 s | 172800 s | ninguna |
| `GET /v1/views/sitemap/:tipo` | 3600 s | — | `pagina` |

Las dos dinámicas:

| Ruta | Estado | Borde |
|---|---|---:|
| `match/:id` | en juego | 15 s |
| | programado | 120 s |
| | terminado | 3600 s |
| `calculadora/:slug` | con partido en juego | 60 s |
| | sin partido en juego | 300 s |

`marcadores` es la que sostiene el vivo: pesa unos 800 bytes y el navegador la pide cada 15
segundos. `matches` es la más pesada, unos 163 KB por día.

### Búsqueda — `/v1/search/*`

| Ruta | Borde | Vieja mientras renueva | Query en la clave |
|---|---:|---:|---|
| `GET /v1/search` | 120 s | 300 s | `q`, `limit` |
| `GET /v1/search/sugerencias` | 300 s | 600 s | `q`, `limit` |
| `GET /v1/search/indice` | 86400 s | 172800 s | ninguna |
| `GET /v1/search/similar/team/:slug` | 86400 s | 172800 s | ninguna |

### Juegos — `/v1/juegos/*`

| Ruta | Caché | Query en la clave |
|---|---|---|
| `GET /v1/juegos/once/reto` | **`no-store`** | `catalogo`, `dificultad`, `excluir` |
| `GET /v1/juegos/impostor/tanda` | **`no-store`** | `excluir` |
| `GET /v1/juegos/60-segundos/preguntas` | **`no-store`** | ninguna |
| `GET /v1/juegos/once/jugadores` | 300 s / 600 s | `q`, `limit` |
| `GET /v1/juegos/once/reto/:clave/solucion` | 86400 s / 172800 s | ninguna |
| `GET /v1/juegos/once/indice` | 86400 s, **y un día en el navegador** | ninguna |

Las tres rutas `no-store` sortean qué te toca jugar. **No se cachean nunca**: una respuesta guardada
le daría a todo el mundo la misma partida. Si el CDN respeta el origen, ya está resuelto; si no,
van en un comportamiento propio sin caché.

`once/indice` es la única del API que manda `max-age` además de `s-maxage`: el navegador se guarda
el índice del buscador un día entero y las partidas siguientes buscan sin salir a la red.

### Operación

| Ruta | Método | Caché | Autenticación |
|---|---|---|---|
| `GET /v1/health` | GET | sin declarar | pública |
| `GET /v1/config` | GET | 30 s / 60 s | pública |
| `GET /docs` | GET | sin declarar | pública, es el OpenAPI |
| `POST /v1/internal/marcador` | POST | — | **`x-cron-secreto`** |
| `POST /v1/internal/tick` | POST | — | **`x-cron-secreto`** |
| `POST /v1/internal/daily` | POST | — | **`x-cron-secreto`** |
| `POST /v1/internal/partidos/:id/resincronizar` | POST | — | **`x-cron-secreto`** |
| `GET /v1/internal/salud` | GET | — | **`x-cron-secreto`** |

> **`/v1/internal/*` no se cachea nunca y conviene no exponerlo.** En CloudFront: comportamiento
> propio, sin caché, reenviando todas las cabeceras porque el secreto viaja en una de ellas, y con
> los métodos de escritura habilitados. Si se puede, una regla de WAF que lo limite al origen del
> cron. En un balanceador propio, restringir por IP.

### CORS

El API responde con CORS solo a los orígenes de `WEB_ORIGIN`, separados por comas, más los de
`WEB_ORIGIN_LOCAL`.

Si el CDN cachea respuestas que llevan `Access-Control-Allow-Origin`, hay que meter `Origin` en la
clave de caché. **Lo más simple es servir la web y el API bajo el mismo dominio**, con `/v1/*`
apuntando al origen del API: así no hay CORS que cachear ni clave que ensuciar.

---

## Web

Astro en modo servidor: cada página se arma en cada pedido y declara su caché. A diferencia del API,
**la web también manda `max-age` para el navegador** en casi todas sus rutas.

### Páginas

| Ruta | Navegador | Borde | Vieja | Query en la clave |
|---|---:|---:|---:|---|
| `GET /` | 0 | 30 s | 60 s | `fecha`, `vista`, `tabla`, `liga`, `equipo`, `jugador`, `pais`, `region` |
| `GET /partidos` | 0 | 60 s | 300 s | `fecha`, `ver` |
| `GET /partidos/:ruta` | **dinámica** | dinámica | dinámica | `vista` |
| `GET /competencias` | 60 s | 3600 s | 7200 s | ninguna |
| `GET /competencias/:slug` | **dinámica** | dinámica | dinámica | `fecha`, `vista`, `tabla`, `grupo`, `equipo`, `partido`, `temporada` |
| `GET /equipos/:slug` | **dinámica** | dinámica | dinámica | ninguna |
| `GET /jugadores/:slug` | 60 s | 600 s | 1200 s | ninguna |
| `GET /buscar` | 0 | 300 s | 600 s | `q` |
| `GET /comparar` | 60 s | 300 s o 600 s | el doble | `tipo`, `a`, `b`, `q` |
| `GET /calculadora-liga-1` | **dinámica** | dinámica | dinámica | `p` |
| `GET /juegos` | 0 | **60 s** | 300 s | ninguna |
| `GET /juegos/adivina-el-xi` | 300 s | 86400 s | 172800 s | ninguna |
| `GET /juegos/el-impostor` | 300 s | 86400 s | 172800 s | ninguna |
| `GET /juegos/60-segundos` | 300 s | 86400 s | 172800 s | ninguna |
| `GET /juegos/mi-leyenda` | 300 s | 86400 s | 172800 s | ninguna |
| `GET /juegos/mi-leyenda/:codigo` | 300 s | 86400 s | 172800 s | ninguna |
| `GET /404` | sin declarar | — | — | — |

Cuatro cosas que no se ven en la tabla y cambian cómo se configura el CDN:

1. **`/juegos` dura 60 segundos, no un día.** Es el catálogo y muestra datos que se mueven. Las
   páginas de cada juego sí duran un día, porque la partida vive entera en el navegador.
2. **Las páginas de juego responden `no-store` cuando fallan al cargar.** Un error no se cachea un
   día.
3. **Con un partido en juego, `/competencias/:slug` y `/equipos/:slug` bajan a 15 segundos.**
   Fuera de eso son 300. Lo decide la página, no el CDN.
4. **`/partidos` solo declara caché cuando la fecha es válida, y `/buscar` solo cuando la búsqueda
   salió bien.** En los demás casos no mandan cabecera y el CDN aplica su valor por omisión, que
   debe ser no cachear.

### Redirecciones permanentes

Direcciones viejas que siguen circulando por WhatsApp con la tarjeta de predicción adentro. Son 301
y conservan el query string:

| Ruta | Va a |
|---|---|
| `GET /calculadora` | `/calculadora-liga-1` |
| `GET /calculadora/datos.json` | `/calculadora-liga-1/datos.json` |
| `GET /calculadora/tarjeta.png` | `/calculadora-liga-1/tarjeta.png` |

CloudFront cachea los 301 si el origen lo permite. No hay problema: estas no van a cambiar.

### Endpoints propios de la web

Existen para que el navegador **nunca hable con el API directamente**: sin CORS, y cacheados en el
borde de la web.

| Ruta | Navegador | Borde | Query en la clave |
|---|---:|---:|---|
| `GET /marcadores.json` | no declara | **5 s** | ninguna |
| `GET /calculadora-liga-1/datos.json` | no declara | 60 s | ninguna |
| `GET /juegos/adivina-el-xi/reto.json` | **`no-store`** | — | `catalogo`, `dificultad`, `excluir` |
| `GET /juegos/el-impostor/tanda.json` | **`no-store`** | — | `excluir` |
| `GET /juegos/60-segundos/preguntas.json` | **`no-store`** | — | ninguna |
| `GET /juegos/adivina-el-xi/jugadores.json` | 300 s | 300 s | `q` |
| `GET /juegos/adivina-el-xi/indice.json` | 86400 s | 86400 s | ninguna |
| `GET /juegos/adivina-el-xi/solucion.json` | 3600 s | 86400 s | `clave` |
| `GET /juegos/mi-leyenda/mundo.json` | 3600 s | 86400 s | ninguna |

**Cuando el API no responde, los nueve devuelven 503 con `no-store`.** Un fallo pasajero nunca se
queda guardado en el borde tapando al sitio. Lo mismo hace el buscador de la partida cuando la
consulta viene vacía.

### Estáticos y SEO

| Ruta | Caché | Nota |
|---|---|---|
| `GET /_astro/*` | `max-age=31536000, immutable` | el nombre lleva hash |
| `GET /fonts/*` | inmutable | igual |
| `GET /og.png` | largo | imagen para compartir, generada |
| `GET /calculadora-liga-1/tarjeta.png` | largo | la tarjeta de predicción |
| `GET /sitemap.xml`, `/sitemap-:nombre.xml` | 3600 s | |
| `GET /robots.txt` | largo | |

---

## Comportamientos de CloudFront, en orden

CloudFront evalúa por precedencia. Con seis comportamientos queda todo cubierto:

| # | Patrón | Caché | Métodos | Qué reenviar |
|---|---|---|---|---|
| 1 | `/v1/internal/*` | ninguna | GET, HEAD, OPTIONS, PUT, POST, PATCH, DELETE | todas las cabeceras |
| 2 | `/v1/juegos/*` | respeta el origen | GET, HEAD | los query strings de su tabla |
| 3 | `/v1/*` | respeta el origen | GET, HEAD | los query strings de su tabla |
| 4 | `/_astro/*`, `/fonts/*` | larga, inmutable | GET, HEAD | nada |
| 5 | `*.json` | respeta el origen | GET, HEAD | todos los query strings |
| 6 | `*` (por omisión) | respeta el origen | GET, HEAD, OPTIONS | los query strings de la tabla de páginas |

**Solo el comportamiento 1 admite métodos de escritura.** Todo lo demás del sitio es de lectura.

### La lista de query strings, para pegar en el CDN

Estos son **todos** los parámetros que Athena lee, sumando la web, sus proxies y el API. Ninguno es
de seguimiento: todos cambian lo que se devuelve, así que todos van en la clave de caché.

```
a  b  catalogo  clave  continente  desde  dias  dificultad  equipo  excluir
fecha  grupo  jugador  liga  limit  local  p  pagina  pais  partido  q
region  tabla  temporada  tipo  ver  visita  vista
```

Conviene una lista y no «reenviar todo»: con todo reenviado, un `?fbclid=…` de Facebook crea una
entrada de caché por visitante y el borde deja de servir para nada.

«Respeta el origen» es la política descrita al principio: `MinTTL 0`, `DefaultTTL 0`, `MaxTTL 86400`,
cabeceras de caché del origen habilitadas, compresión encendida. Sirve para las rutas de 5 segundos
y para las de un día, porque quien decide es el origen.

Los comportamientos 2 y 3 podrían ser uno solo. Se separan para poder dejar las rutas de juego sin
caché a mano si algún día el CDN deja de respetar `no-store`.
