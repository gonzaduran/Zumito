-- Estadísticas: gasto por categoría en un rango de días y totales de los últimos meses.
-- Las fechas son días locales del usuario (profiles.timezone). security invoker: RLS aplica.

-- Gasto por categoría entre p_from (incluido) y p_to (excluido), de mayor a menor.
-- Incluye categorías archivadas: sus gastos siguen contando.
create function public.spending_by_category(p_from date, p_to date)
returns table (
  category_id uuid,
  name text,
  emoji text,
  color text,
  total_cents bigint,
  expense_count bigint
)
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
  )
  select c.id, c.name, c.emoji, c.color, sum(e.amount_cents)::bigint, count(*)::bigint
  from public.expenses e
  join public.categories c on c.id = e.category_id and c.user_id = e.user_id
  cross join settings s
  where (e.spent_at at time zone s.tz)::date >= p_from
    and (e.spent_at at time zone s.tz)::date < p_to
  group by c.id, c.name, c.emoji, c.color
  order by sum(e.amount_cents) desc, c.name;
$$;

-- Total de cada uno de los últimos p_months meses (incluido el actual), también los vacíos.
create function public.spending_by_month(p_months integer default 6)
returns table (month date, total_cents bigint)
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
  months as (
    select (date_trunc('month', now() at time zone s.tz) - make_interval(months => g))::date as month
    from settings s, generate_series(0, least(greatest(coalesce(p_months, 6), 1), 24) - 1) as g
  ),
  totals as (
    select date_trunc('month', e.spent_at at time zone s.tz)::date as month, sum(e.amount_cents) as total
    from public.expenses e
    cross join settings s
    group by 1
  )
  select m.month, coalesce(t.total, 0)::bigint
  from months m
  left join totals t on t.month = m.month
  order by m.month;
$$;

revoke execute on function public.spending_by_category(date, date) from public, anon;
grant execute on function public.spending_by_category(date, date) to authenticated;
revoke execute on function public.spending_by_month(integer) from public, anon;
grant execute on function public.spending_by_month(integer) to authenticated;
