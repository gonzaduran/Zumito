-- Totales de gasto del usuario por periodo, en su zona horaria (profiles.timezone).
-- Semana de lunes a domingo (ISO), como es habitual en España.
-- security invoker: RLS limita la suma a los gastos del propio usuario.

create function public.expense_summary()
returns table (today_cents bigint, week_cents bigint, month_cents bigint, total_cents bigint)
language sql
stable
security invoker
set search_path = ''
as $$
  with settings as (
    select coalesce(
      (select p.timezone from public.profiles p where p.id = (select auth.uid())),
      'Europe/Madrid'
    ) as tz
  ),
  local as (
    select
      e.amount_cents,
      (e.spent_at at time zone s.tz) as spent_local,
      (now() at time zone s.tz) as now_local
    from public.expenses e
    cross join settings s
  )
  select
    coalesce(sum(amount_cents) filter (where spent_local::date = now_local::date), 0)::bigint,
    coalesce(sum(amount_cents) filter (
      where date_trunc('week', spent_local) = date_trunc('week', now_local)
    ), 0)::bigint,
    coalesce(sum(amount_cents) filter (
      where date_trunc('month', spent_local) = date_trunc('month', now_local)
    ), 0)::bigint,
    coalesce(sum(amount_cents), 0)::bigint
  from local;
$$;

revoke execute on function public.expense_summary() from public, anon;
grant execute on function public.expense_summary() to authenticated;
