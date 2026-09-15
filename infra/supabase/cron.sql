-- El latido de Athena, desde la propia base. Se ejecuta a mano en el SQL Editor de Supabase:
-- lleva el secreto adentro, así que no puede vivir en una migración versionada.
--
-- Antes de correrlo, reemplazar TU-API.vercel.app y TU_CRON_SECRET.
-- Es idempotente: se puede volver a correr después de cambiar la URL o el secreto.

select cron.unschedule('athena-marcador') where exists (
  select 1 from cron.job where jobname = 'athena-marcador');
select cron.unschedule('athena-tick') where exists (
  select 1 from cron.job where jobname = 'athena-tick');
select cron.unschedule('athena-daily') where exists (
  select 1 from cron.job where jobname = 'athena-daily');
select cron.unschedule('athena-purga-cron') where exists (
  select 1 from cron.job where jobname = 'athena-purga-cron');

-- El marcador: cada quince segundos. El proveedor refresca su feed cada veinte, así que
-- más rápido gastaría cuota mirando lo mismo.
select cron.schedule(
  'athena-marcador',
  '15 seconds',
  $$
  select net.http_post(
    url                  := 'https://TU-API.vercel.app/v1/internal/marcador',
    headers              := '{"x-cron-secreto": "TU_CRON_SECRET"}'::jsonb,
    timeout_milliseconds := 10000
  )
  $$
);

-- El resto del sync: alineaciones, estadísticas, cierre de partidos y cola de tareas.
-- Sin timeout largo a propósito: el worker de pg_net procesa por lotes y espera a que
-- termine el lote entero, así que un pedido lento retrasaría los latidos del marcador.
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

-- A cuatro latidos por minuto son casi seis mil filas por día y pg_cron no las borra solo.
select cron.schedule(
  'athena-purga-cron',
  '30 4 * * *',
  $$
  delete from cron.job_run_details where end_time < now() - interval '3 days';
  delete from net._http_response where created < now() - interval '2 days';
  $$
);

-- Comprobación: la respuesta real del API, no si el pedido salió.
--   select status_code, content::text, created
--   from net._http_response order by created desc limit 5;
