-- NERO: cierre automático de eventos. Ejecutar SOLO en el proyecto de Supabase de NERO (jsyj…fayc).
-- Se puede volver a ejecutar sin problema.
--
-- Un evento publicado pasa a 'past' a las 12:00 (hora de Lima) del día siguiente a su fecha: la fiesta sigue
-- pasada la medianoche, así que no se cierra a las 00:00. Debe coincidir con effectiveStatus() en lib/format.ts.
-- Al quedar en 'past', issue_free_access_ticket deja de emitir (solo acepta eventos 'published') sin modificarla.
-- El escaneo en puerta no depende del estado del evento.

-- 1. Función que cierra los eventos vencidos y devuelve cuántos cerró.
create or replace function public.close_past_events()
returns integer
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  closed integer;
begin
  update public.events
     set status = 'past'
   where status = 'published'
     and (now() at time zone 'America/Lima') >= (event_date + 1) + time '12:00';
  get diagnostics closed = row_count;
  return closed;
end;
$$;

revoke all on function public.close_past_events() from public, anon, authenticated;
grant execute on function public.close_past_events() to service_role;

-- 2. Tarea programada cada hora (minuto 5) dentro de Supabase con pg_cron.
create extension if not exists pg_cron with schema pg_catalog;
select cron.unschedule(jobid) from cron.job where jobname = 'close-past-events';
select cron.schedule('close-past-events', '5 * * * *', $$select public.close_past_events()$$);

-- 3. Cerrar ya los eventos que terminaron.
select public.close_past_events() as eventos_cerrados_ahora;
