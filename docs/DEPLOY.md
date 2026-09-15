# Lanzar Athena en Vercel + Supabase

Guía paso a paso, pensada para la primera vez en Vercel. Al final hay dos
proyectos en Vercel (web y API), la base sigue en Supabase, y el sync del vivo
late cada minuto gracias a pg_cron. Vercel va en plan Hobby ($0); Supabase en
plan Pro ($25/mes, spend cap encendido): el archivo completo con detalle fino
pesa más de lo que el free tier (500 MB) admite — está medido, no estimado.

**Cómo queda armado**:

```
visitante ─→ Vercel (web, Astro SSR) ─→ Vercel (API, NestJS serverless) ─→ Supabase (Postgres)
                                                    ▲
             Supabase pg_cron ── cada minuto ───────┘  POST /v1/internal/tick
                                (con el header x-cron-secreto)
```

El "worker" de local no existe en producción: su `tick()` es el mismo código,
pero lo dispara un cron dentro de Supabase que llama al API por HTTP.

---

## Paso 0 — Lo que necesitas a mano

- La cuenta de GitHub con el repo `Leonardojp29/Athena`.
- Las credenciales de Supabase del proyecto real (las mismas de
  `apps/api/.env`): `DATABASE_URL` y `DIRECT_URL`. Nada más: sin login, el API
  solo necesita la base.

> **Cada aplicación tiene su propio `.env`** y son dos proyectos distintos en
> Vercel. `apps/api/.env` lleva base de datos, proveedor y secretos;
> `apps/web/.env` lleva dos URL y nada más. Ninguna variable está en los dos
> lados, así que cada archivo se pega entero en su proyecto sin revisar línea
> por línea qué sobra.
- La clave de API-Football y la de OpenAI.
- Un secreto nuevo para el cron. Generarlo así y guardarlo:

  ```bash
  openssl rand -base64 24 | tr -d '/+=' | head -c 32; echo
  ```

  Ese valor es `CRON_SECRET`: se pone en el API (Vercel) y en el cron
  (Supabase). Tienen que ser idénticos.

> El plan Hobby de Vercel es para uso no comercial. Para lanzar con publicidad
> o cobro hay que pasar a Pro; para lanzar y validar, Hobby alcanza.

---

## Paso 1 — Crear la cuenta en Vercel

1. Entrar a [vercel.com/signup](https://vercel.com/signup) y elegir
   **Continue with GitHub** (así el deploy sale del repo directo).
2. Aceptar los permisos. Cuando pregunte, darle acceso al repo
   `Leonardojp29/Athena` (se puede limitar a solo ese repo).
3. Plan **Hobby** (gratis).

---

## Paso 2 — Desplegar el API

1. En el dashboard de Vercel: **Add New… → Project**.
2. Elegir el repo **Athena** → **Import**.
3. En la pantalla de configuración:
   - **Project Name**: `athena-api`
   - **Root Directory**: pulsar **Edit** y elegir `apps/api` ← este es el paso
     que más se olvida; sin él, Vercel intenta construir el monorepo entero mal.
   - **Framework Preset**: Other. Build y demás comandos ya vienen del
     `apps/api/vercel.json` del repo; no tocar nada.
4. Abrir **Environment Variables** → **Import .env** y pegar el contenido de
   `apps/api/.env` entero. Ese archivo es exactamente lo que este proyecto
   necesita: por eso vive al lado del API y no en la raíz.

   Después, ajustar las tres que cambian respecto de tu equipo:

   | Variable | Valor en Vercel |
   |---|---|
   | `WEB_ORIGIN` | la URL de la web (paso 3), **sin barra final**; se puede volver a editar después |
   | `PORT` | **borrarla**: la pone la plataforma |
   | `CRON_SECRET` | tiene que ser **el mismo** que está dentro de `cron.schedule` en Supabase (paso 4), o el latido responde 401 |

   `NODE_ENV=production` no hace falta: Vercel ya lo define.

5. **Deploy**. Al terminar, Vercel muestra la URL del proyecto, algo como
   `https://athena-api.vercel.app`. Comprobar que vive:

   ```bash
   curl https://athena-api.vercel.app/v1/health
   ```

---

## Paso 3 — Desplegar la web

1. Otra vez **Add New… → Project** y el mismo repo **Athena** (sí, dos
   proyectos del mismo repo: cada uno con su Root Directory).
2. Configuración:
   - **Project Name**: `athena` (la URL pública sale de acá)
   - **Root Directory**: `apps/web`
   - **Framework Preset**: Astro (lo detecta solo).
3. Variables de entorno: **Import .env** con el contenido de `apps/web/.env`,
   y corregir las dos URL, que en tu equipo apuntan a localhost:

   | Variable | Valor en Vercel |
   |---|---|
   | `PUBLIC_API_URL` | la URL real del paso 2, **sin `/v1` y sin barra final**: `https://athena-api.vercel.app` — el código agrega `/v1` solo, y una barra de más arma `//v1/...`, que es 404 |
   | `PUBLIC_SITE_URL` | `https://athena.vercel.app` (la URL real de este proyecto) |

   Son dos, y ninguna es un secreto: la web no lleva claves de proveedores.
   Si `PUBLIC_SITE_URL` falta, el build se rompe a propósito — salir con los
   canónicos apuntando a localhost desindexa el sitio entero.
4. **Deploy** y abrir la URL: la home tiene que cargar con datos reales (la web
   lee Postgres a través del API).
5. Volver al proyecto `athena-api` → **Settings → Environment Variables** →
   editar `WEB_ORIGIN` con la URL real de la web (por ejemplo
   `https://athena.vercel.app`) → **Redeploy** (pestaña Deployments, botón ⋯ →
   Redeploy). Sin esto, el navegador bloquea el minuto a minuto por CORS.

---

## Paso 4 — El latido: pg_cron en Supabase

Esto es lo que mantiene el vivo vivo. Sin este paso la web funciona pero los
marcadores no avanzan.

1. En [supabase.com/dashboard](https://supabase.com/dashboard), abrir el
   proyecto → **Database → Extensions** → buscar y habilitar **pg_cron** y
   **pg_net** (schema `extensions` está bien).
2. Ir a **SQL Editor** y ejecutar. **Antes de correrlo, reemplazar los dos
   marcadores**: `TU-API.vercel.app` por la URL real del paso 2 y
   `TU_CRON_SECRET` por el secreto del paso 0 — pegado tal cual, el cron llama
   a una URL que no existe y queda registrando 404 en silencio:

   ```sql
   -- El tic del vivo: cada minuto.
   select cron.schedule(
     'athena-tick',
     '* * * * *',
     $$
     select net.http_post(
       url     := 'https://TU-API.vercel.app/v1/internal/tick',
       headers := '{"x-cron-secreto": "TU_CRON_SECRET"}'::jsonb
     )
     $$
   );

   -- El refresco diario: 05:00 hora de Lima = 10:00 UTC.
   select cron.schedule(
     'athena-daily',
     '0 10 * * *',
     $$
     select net.http_post(
       url     := 'https://TU-API.vercel.app/v1/internal/daily',
       headers := '{"x-cron-secreto": "TU_CRON_SECRET"}'::jsonb
     )
     $$
   );
   ```

3. Comprobar que corre:

   ```sql
   select jobname, schedule, active from cron.job;
   -- y un par de minutos después, las últimas corridas:
   select j.jobname, d.status, d.return_message, d.start_time
   from cron.job_run_details d join cron.job j on j.jobid = d.jobid
   order by d.start_time desc limit 5;
   ```

   Ojo: `succeeded` ahí solo dice que el pedido HTTP salió. La respuesta real
   del API está en otra tabla — esta es la comprobación que vale:

   ```sql
   select status_code, content::text, created
   from net._http_response order by created desc limit 5;
   ```

   `status_code = 200` con `{"vivos":...,"tareas":...}` y listo: el mismo
   `tick()` que corre en local está corriendo en producción cada minuto. Un
   404 es la URL mal puesta; un 401, el secreto distinto al de Vercel.

   Si un job quedó creado con valores equivocados, se borra y se vuelve a
   crear:

   ```sql
   select cron.unschedule('athena-tick');
   select cron.unschedule('athena-daily');
   ```

---

## Paso 5 — Verificación final

1. `curl https://athena-api.vercel.app/v1/health` responde.
2. La home carga y, si hay partidos en juego, el marcador se mueve solo
   (el poll de 30 s de la web + el tic del cron).
3. Probar el candado del cron: sin header tiene que dar 401.

   ```bash
   curl -s -o /dev/null -w "%{http_code}\n" -X POST \
     https://athena-api.vercel.app/v1/internal/tick
   ```

4. En Supabase, `select count(*) from tareas;` — debería tender a cero entre
   tics: la cola se encola y se drena.

---

## Después del lanzamiento

- **Cada `git push` a `main` despliega solo** los dos proyectos. Preview
  deploys en cada rama, si algún día se usan ramas.
- **Logs**: en cada proyecto de Vercel, pestaña **Logs** (los `logJson` del API
  salen ahí). Los del cron, en `cron.job_run_details` de Supabase.
- **Apagar una funcionalidad sin desplegar**: igual que siempre,
  `UPDATE feature_flags SET enabled = false WHERE key = '...'` (tarda ≤45 s en
  llegar a todas las instancias).
- **Migraciones**: siguen siendo manuales y locales, como dice el RUNBOOK:
  `pnpm exec prisma migrate deploy` contra `DIRECT_URL`. Vercel no migra nada.
- **Dominio propio**: proyecto `athena` → Settings → Domains. Al agregarlo,
  actualizar `PUBLIC_SITE_URL` (web) y `WEB_ORIGIN` (API) y redeploy de ambos.

## Si algo no anda

| Síntoma | Dónde mirar |
|---|---|
| El marcador no avanza | `cron.job_run_details` en Supabase; que el tic dé `succeeded` y no 401 (secreto distinto) ni 503 (`CRON_SECRET` sin definir en Vercel) |
| CORS bloquea el minuto a minuto | `WEB_ORIGIN` del API tiene que ser exactamente la URL de la web, sin barra final, y hay que redeployar el API tras cambiarla |
| 500 con `PrismaClientInitializationError` | `DATABASE_URL` debe ser la del pooler (6543 + `?pgbouncer=true`); la directa agota conexiones en serverless |
| El primer request tarda | Arranque en frío de la función: Nest se arma una vez por instancia; los siguientes son normales |
| El build del API falla en Vercel | Ver el log del deploy: casi siempre es Root Directory sin configurar en `apps/api` |
