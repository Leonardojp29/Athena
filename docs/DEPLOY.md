# Desplegar Athena

Guía para alguien que llega nuevo al repositorio y tiene que poner el sitio en producción.
No hace falta conocer el código: hace falta entender que son **dos aplicaciones, dos archivos de
configuración y un latido**.

Hay dos caminos, y los dos parten de la misma base:

- **Vercel** (lo que está en uso hoy): dos proyectos serverless, y el latido lo dispara la base.
- **AWS** (o cualquier servidor propio): un servidor con tres procesos bajo pm2 y un CDN delante.

El catálogo de rutas, con su caché y su autenticación, está en [RUTAS.md](RUTAS.md). Es lo que hace
falta para configurar CloudFront o cualquier otro CDN.

---

## 1. Qué se despliega

```
visitante ──→ WEB (Astro SSR)  ──→ API (NestJS) ──→ Postgres (Supabase)
                                        ▲
              el latido ────────────────┘   POST /v1/internal/{marcador,tick,daily}
                                            con el header x-cron-secreto
```

| Pieza | Qué es | Dónde vive |
|---|---|---|
| **Web** | Astro 5 en modo servidor. Arma cada página en cada pedido. | `apps/web` |
| **API** | NestJS. Todo lo que lee la base y habla con los proveedores. | `apps/api` |
| **Worker** | El sync: marcadores, alineaciones, estadísticas, cola de tareas. | `apps/api`, entrada `main.worker.ts` |
| **Base** | Postgres en Supabase. Todo el estado. | Supabase |

El navegador **nunca** habla con la base ni con los proveedores. Habla con la web, y la web habla
con el API. Es lo que permite que todo el sitio se cachee en el borde.

**El worker no es un cuarto servicio obligatorio.** Es el mismo `tick()` que expone el API por HTTP.
En serverless no hay proceso que viva, así que lo dispara un cron dentro de la base; en un servidor
propio se corre como proceso y el cron sobra. Más sobre esto en la sección 6.

---

## 2. Los dos archivos de configuración

Cada aplicación tiene **su propio `.env`, al lado de su código**:

| Archivo | Para | Qué lleva |
|---|---|---|
| `apps/api/.env` | El API y el worker | Base de datos, claves de proveedores, el secreto del cron |
| `apps/web/.env` | La web | Dos URL. Ningún secreto |

Ninguna variable está en los dos lados. Cada archivo se copia entero y se pega en su proyecto sin
revisar línea por línea qué sobra. Los dos `.env.example` son el mapa versionado: ahí está cada
variable con su explicación, y lo opcional viene comentado.

Ninguno de los dos se commitea. Para cambiar algo solo en tu equipo, crea un `.env.local` al lado:
gana sobre el `.env`.

### La diferencia que sorprende: cuándo se lee cada archivo

Esto es lo más importante de toda la guía y no es obvio.

| Aplicación | Cuándo lee su configuración | Para cambiar una variable |
|---|---|---|
| **API** | En cada arranque del proceso | Editar y **reiniciar** |
| **Web** | **Al construir** | Editar y **volver a construir** |

Las variables `PUBLIC_*` de la web quedan escritas dentro del código compilado. Está verificado: en
`dist/server/chunks` aparece el valor literal, no el nombre de la variable. Cambiar
`PUBLIC_API_URL` y reiniciar la web **no hace nada**: hay que reconstruirla.

En Vercel esto pasa solo, porque editar una variable y redeployar reconstruye. En un servidor
propio hay que acordarse.

### Lo que hay que conseguir antes de empezar

- Acceso al repositorio.
- Las credenciales de Supabase: `DATABASE_URL` (la agrupada, puerto 6543) y `DIRECT_URL` (la
  directa, 5432, solo para migraciones).
- La clave de **API-Football**.
- La de **OpenAI**, si se quiere el análisis generado. Sin ella el sitio funciona igual.
- Un secreto para el latido, nuevo:

  ```bash
  openssl rand -base64 24 | tr -d '/+=' | head -c 32; echo
  ```

  Ese valor es `CRON_SECRET`. Va en el `.env` del API **y** en el cron. Tienen que ser idénticos:
  si difieren, el latido responde 401 y los marcadores no avanzan.

---

## 3. Construir, en cualquier plataforma

Node 20 o superior y pnpm 11.

```bash
pnpm install
pnpm build            # construye todo el monorepo
pnpm verify           # lint, typecheck, tests y build. Lo que corre CI
```

Para construir una sola aplicación con sus dependencias internas:

```bash
pnpm turbo run build --filter=@athena/api...
pnpm turbo run build --filter=@athena/web...
```

Resultado:

| Aplicación | Artefacto | Cómo se arranca |
|---|---|---|
| API | `apps/api/dist/main.api.js` | `pnpm --filter @athena/api start:api` |
| Worker | `apps/api/dist/main.worker.js` | `pnpm --filter @athena/api start:worker` |
| Web | `apps/web/dist/server/entry.mjs` | `PORT=4321 node apps/web/dist/server/entry.mjs` |

La web elige su adaptador sola: si detecta Vercel usa el suyo, y en cualquier otro lado se compila
como un servidor Node normal. Un solo código para las dos plataformas.

Para levantar las tres cosas en tu equipo:

```bash
pnpm start     # API, worker y web, con los builds
pnpm estado    # dice qué está arriba
pnpm stop
```

---

## 4. Camino A — Vercel

Dos proyectos del mismo repositorio, cada uno con su **Root Directory**. Es el paso que más se
olvida y sin él el build falla.

### 4.1 El API

1. **Add New… → Project** → el repositorio → **Import**.
2. Configuración:
   - **Project Name**: `athena-api`
   - **Root Directory**: `apps/api` ← obligatorio
   - **Framework Preset**: Other. Los comandos ya vienen de `apps/api/vercel.json`.
3. **Environment Variables → Import .env** y pegar `apps/api/.env` entero. Después ajustar:

   | Variable | Qué hacer con ella |
   |---|---|
   | `PORT` | **borrarla.** Es la única que se borra: el puerto lo pone la plataforma |
   | `WEB_ORIGIN` | **dejarla y corregirla**: la URL de la web, sin barra final. Todavía no existe, así que se vuelve en el paso 4.3 |
   | `CRON_SECRET` | **dejarla tal cual.** Es la misma que irá en el cron (sección 6) |

   `NODE_ENV=production` no hace falta: Vercel ya lo define.

   > Borrar `CRON_SECRET` deja el API entero respondiendo **503** en `/v1/internal/*` y el latido
   > nunca corre. Borrar `WEB_ORIGIN` deja al API sin cabeceras CORS, y con eso se caen el buscador,
   > la pastilla de «en vivo» del encabezado y el marcador de la página de partido.
4. **Deploy**, y comprobar:

   ```bash
   curl https://athena-api.vercel.app/v1/health
   ```

### 4.2 La web

1. **Add New… → Project**, el mismo repositorio otra vez.
2. Configuración:
   - **Project Name**: `athena`
   - **Root Directory**: `apps/web`
   - **Framework Preset**: Astro, lo detecta solo.
3. **Import .env** con `apps/web/.env`, y corregir las dos URL, que apuntan a localhost:

   | Variable | Valor en Vercel |
   |---|---|
   | `PUBLIC_API_URL` | la URL del paso 4.1, **sin `/v1` y sin barra final**. El código agrega `/v1` solo, y una barra de más arma `//v1/…`, que es 404 |
   | `PUBLIC_SITE_URL` | la URL real de este proyecto |

   Si `PUBLIC_SITE_URL` falta, el build se rompe a propósito: salir a producción con los canónicos
   apuntando a localhost no falla en ningún lado y desindexa el sitio entero.

   > **Las dos van con Type `Config`, nunca `Secret`.** Vercel ofrece los dos tipos al crear una
   > variable. Una `PUBLIC_*` marcada como `Secret` no llega al código que corre en el navegador, y
   > el sitio queda con la URL del API vacía: el buscador, la pastilla de en vivo y el marcador de
   > la página de partido dejan de funcionar, sin ningún error visible en el build. Peor todavía,
   > un `Secret` es de solo escritura y **no se puede editar ni convertir a `Config`**: hay que
   > borrarlo y crearlo de nuevo. Ninguna de las dos es un secreto; las dos viajan al navegador por
   > diseño.

   `PUBLIC_SITE_URL` no la podés saber antes de crear el proyecto, porque Vercel le agrega un
   sufijo al nombre. Se pone cualquier valor válido para el primer deploy, se mira la URL real que
   quedó y se corrige. Si no se corrige, los canónicos apuntan a otro sitio y Google desindexa.
4. **Deploy** y abrir la URL.

### 4.3 Cerrar el círculo

Volver a `athena-api` → **Settings → Environment Variables** → poner en `WEB_ORIGIN` la URL real de
la web → **Redeploy**. Sin esto el navegador bloquea los marcadores por CORS.

---

## 5. Camino B — AWS, o cualquier servidor propio

Una instancia EC2 con los tres procesos bajo pm2, y CloudFront delante. Sirve igual para Lightsail,
un droplet o una máquina propia: lo único específico de AWS es el CDN.

Una `t3.small` alcanza. La base puede seguir en Supabase.

### 5.1 Preparar la máquina

```bash
sudo apt update && sudo apt install -y git curl

curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
source ~/.nvm/nvm.sh
nvm install 22 && nvm alias default 22

corepack enable && corepack prepare pnpm@11.20.0 --activate
npm install -g pm2
```

### 5.2 Traer el código y configurarlo

```bash
git clone <repositorio> /srv/athena
cd /srv/athena

cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
```

Llenar los dos archivos. En la web, `PUBLIC_SITE_URL` y `PUBLIC_API_URL` son las URL **públicas**,
las que ve el visitante a través de CloudFront, no las internas de la instancia.

### 5.3 Construir y levantar

```bash
pnpm install --frozen-lockfile
pnpm build

pm2 start infra/pm2/ecosystem.config.cjs
pm2 save
pm2 startup          # imprime un comando con sudo: copiarlo y ejecutarlo
```

Eso deja tres procesos arriba: `athena-api`, `athena-worker` y `athena-web`. Los puertos salen de
`API_PORT`, `WEB_PORT` y `WEB_HOST`, con 3001, 4321 y `127.0.0.1` por omisión. La web escucha solo
en loopback a propósito: quien la expone es el CDN, o un Nginx delante.

### 5.4 Comandos de pm2, los que se usan de verdad

```bash
pm2 status                          # qué está arriba, memoria, reinicios
pm2 logs                            # todo junto, en vivo
pm2 logs athena-worker --lines 200  # solo el worker
pm2 restart athena-api              # reiniciar uno
pm2 reload all                      # reiniciar todo sin cortar
pm2 stop athena-worker
pm2 delete athena-worker
pm2 monit                           # panel de CPU y memoria
pm2 flush                           # vaciar los logs
```

Desplegar una versión nueva:

```bash
cd /srv/athena
git pull
pnpm install --frozen-lockfile
pnpm build
pm2 reload all
```

**El `pnpm build` no es opcional aunque solo hayas cambiado una variable de la web.** Sus
`PUBLIC_*` viven dentro del código compilado (sección 2).

Si pm2 se reinicia y no levanta nada, es que faltó `pm2 save` después del último `pm2 start`.

### 5.5 CloudFront

Una sola distribución, dos orígenes:

| Origen | Apunta a | Para |
|---|---|---|
| `web` | el balanceador o la instancia, puerto de la web | todo lo demás |
| `api` | el mismo host, puerto del API | `/v1/*` |

Los comportamientos por ruta, con su política de caché y qué reenviar, están en
**[RUTAS.md](RUTAS.md)**. Lo esencial: una política que **respete el `Cache-Control` del origen**
(`MinTTL 0`, `DefaultTTL 0`, cabeceras de caché del origen activadas, compresión encendida), y
comportamientos aparte sin caché para `/v1/internal/*` y para las rutas de juego que sortean.

Servir la web y el API bajo **el mismo dominio** ahorra el CORS entero: `PUBLIC_API_URL` pasa a ser
`https://<dominio>` y `WEB_ORIGIN` el mismo valor.

Para el certificado, ACM **en `us-east-1`**: CloudFront no acepta certificados de otra región.

### 5.6 Qué falta para que sea AWS de verdad

Lo de arriba funciona. Para producción seria, en orden de valor:

- **Balanceador (ALB) delante de la instancia**, con el certificado de ACM y health check contra
  `/v1/health`. Permite reemplazar la instancia sin cortar el sitio.
- **Los secretos en SSM Parameter Store o Secrets Manager**, no en un archivo. Se leen al arrancar
  y se escriben a los dos `.env` antes del `pm2 start`.
- **Logs a CloudWatch** con el agente. El API ya escribe JSON por línea, así que se consulta directo.
- **El worker en una sola instancia.** Si algún día hay dos servidores web, el worker corre en una
  sola: sus candados son de base, así que dos no rompen nada, pero gastan cuota del proveedor por
  duplicado.

---

## 6. El latido

Sin esto la web funciona pero los marcadores no avanzan. Hay dos formas y **se elige una**.

| | Cuándo | Cómo |
|---|---|---|
| **pg_cron** | Serverless (Vercel): no hay proceso que viva | La base llama al API por HTTP |
| **Worker** | Servidor propio (AWS): ya hay procesos | `athena-worker` bajo pm2, con sus bucles adentro |

**No se corren las dos a la vez.** Compiten por los mismos candados y gastan cuota del proveedor por
duplicado. En Vercel, pg_cron. En un servidor, el worker y nada de cron.

### 6.1 Con pg_cron (Vercel)

1. Supabase → **Database → Extensions** → habilitar **pg_cron** y **pg_net**.
2. **SQL Editor** → ejecutar `infra/supabase/cron.sql`, reemplazando antes `TU-API.vercel.app` por
   la URL real del API y `TU_CRON_SECRET` por el mismo valor que quedó en Vercel.

   Es idempotente: se puede volver a correr cada vez que cambie la URL o el secreto. Crea cuatro
   trabajos:

   | Trabajo | Cada | Para qué |
   |---|---|---|
   | `athena-marcador` | 15 s | marcador, minuto y goles |
   | `athena-tick` | 1 min | alineaciones, estadísticas, cierre y cola |
   | `athena-daily` | 05:00 Lima | refresco del catálogo |
   | `athena-purga-cron` | diario | borra el historial de pg_cron y pg_net |

3. Comprobar. Ojo con esto, porque es donde se pierde la gente:

   ```sql
   select jobname, schedule, active from cron.job;
   ```

   `succeeded` en `cron.job_run_details` **solo dice que el pedido HTTP salió**, no que el API
   contestó. La comprobación que vale es la respuesta real:

   ```sql
   select status_code, content::text, created
   from net._http_response order by created desc limit 5;
   ```

   `200` y listo. Un **404** es la URL mal puesta. Un **401**, el secreto distinto al del API. Un
   cron apuntando a una URL vieja registra 404 durante semanas sin que nadie se entere.

4. Red de seguridad: `.github/workflows/latido.yml` dispara el tic cada 30 minutos usando el secreto
   `CRON_SECRET` y la variable `API_URL` del repositorio en GitHub. Hay que configurarlos ahí.

### 6.2 Con el worker (servidor propio)

No hay nada que hacer: `athena-worker` ya trae los dos bucles, cada 15 segundos y cada minuto, y
recupera lo diario atrasado al arrancar. Se comprueba con `pm2 logs athena-worker`.

Si en la base quedaron los trabajos de pg_cron de un despliegue anterior, hay que quitarlos:

```sql
select cron.unschedule('athena-marcador');
select cron.unschedule('athena-tick');
select cron.unschedule('athena-daily');
```

---

## 7. Migraciones y datos

**Las migraciones son manuales, en las dos plataformas.** Ni Vercel ni pm2 migran nada, a propósito:
un despliegue no debe cambiar el esquema sin que alguien lo decida.

```bash
pnpm --filter @athena/database db:deploy
```

Ese script lee `apps/api/.env` y usa `DIRECT_URL`, la conexión directa. La agrupada no sirve para
migrar.

La primera vez, además, hay que poblar la base. Son procesos largos y se corren una sola vez:

```bash
pnpm --filter @athena/api sync:bootstrap      # competencias, equipos y calendario
pnpm --filter @athena/api importar:retos      # Adivina el XI
pnpm --filter @athena/api importar:impostor   # El Impostor
pnpm --filter @athena/api importar:60         # 60 Segundos
```

---

## 8. Verificación

```bash
curl https://<api>/v1/health                       # responde
curl -s https://<api>/v1/views/marcadores | head   # trae los partidos en juego

# el candado del latido: sin cabecera tiene que dar 401
curl -s -o /dev/null -w "%{http_code}\n" -X POST https://<api>/v1/internal/tick
```

Además:

1. La home carga con datos reales.
2. Con partidos en juego, el marcador se mueve solo sin recargar la página.
3. En la base, `select count(*) from tareas;` tiende a cero entre tics: la cola se encola y se drena.
4. `GET /v1/internal/salud` con la cabecera del cron dice cuándo fue el último tic y el último latido.
   Los dos deberían estar por debajo de 90 segundos.

---

## 9. Después del lanzamiento

- **Vercel**: cada `push` a `main` despliega los dos proyectos solo.
- **Servidor propio**: el ciclo de la sección 5.4.
- **Logs**: pestaña **Logs** de cada proyecto en Vercel, o `pm2 logs`. Los del cron, en
  `cron.job_run_details` y `net._http_response` de Supabase.
- **Apagar una funcionalidad sin desplegar**:
  `update feature_flags set enabled = false where key = '…'`. Tarda 45 segundos o menos en llegar a
  todas las instancias.
- **Dominio propio**: al agregarlo hay que actualizar `PUBLIC_SITE_URL` y `PUBLIC_API_URL` en la web
  y `WEB_ORIGIN` en el API, y **reconstruir la web**, no solo reiniciarla.

---

## 10. Si algo no anda

| Síntoma | Dónde mirar |
|---|---|
| El marcador no avanza | `net._http_response` en Supabase. Un 404 es la URL del cron; un 401, el secreto distinto; un 503, `CRON_SECRET` sin definir en el API. En un servidor propio, `pm2 logs athena-worker` |
| Cambié una variable de la web y no pasó nada | Sus `PUBLIC_*` se hornean en el build. Hay que reconstruir, no reiniciar |
| CORS bloquea los marcadores | `WEB_ORIGIN` del API tiene que ser exactamente la URL de la web, sin barra final, y hay que reiniciar o redeployar el API |
| 500 con `PrismaClientInitializationError` | `DATABASE_URL` debe ser la del pooler (6543 con `?pgbouncer=true`). La directa agota conexiones |
| Todas las llamadas al API dan 404 | `PUBLIC_API_URL` con `/v1` o con barra final. El código agrega `/v1` solo |
| El build de la web falla con "Falta PUBLIC_SITE_URL" | Es a propósito. Definirla antes de construir |
| El buscador y el marcador no funcionan, y no hay error | En Vercel, alguna `PUBLIC_*` quedó con Type `Secret`. Borrarla y crearla como `Config`, y redeployar |
| No me deja editar una variable en Vercel | Es de tipo `Secret`, que es de solo escritura. Se borra y se crea de nuevo |
| Los canónicos apuntan a otro dominio | `PUBLIC_SITE_URL` quedó con el valor de relleno del primer deploy. Corregirla y **reconstruir** |
| El primer pedido tarda mucho | Arranque en frío de la función serverless. Los siguientes son normales. En un servidor propio no pasa |
| El build falla en Vercel | Casi siempre es el **Root Directory** sin configurar en `apps/api` o `apps/web` |
| pm2 no levantó nada tras reiniciar | Faltó `pm2 save` después del último `pm2 start` |
