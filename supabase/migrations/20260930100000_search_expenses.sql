-- Historial: búsqueda y filtro de gastos, con el día local y el total de cada día.
-- El total del día se calcula sobre todos los resultados (antes del límite), así que
-- es correcto aunque la lista se cargue por partes.

create function public.search_expenses(
  p_query text default null,
  p_category_id uuid default null,
  p_limit integer default 50
)
returns table (
  id uuid,
  amount_cents bigint,
  description text,
  note text,
  spent_at timestamptz,
  category_id uuid,
  category_name text,
  category_emoji text,
  category_color text,
  day date,
  day_total_cents bigint
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
  ),
  search as (
    select
      btrim(coalesce(p_query, '')) as raw,
      -- Escapa los comodines de LIKE para buscar el texto tal cual.
      '%' || replace(replace(replace(btrim(coalesce(p_query, '')), '\', '\\'), '%', '\%'), '_', '\_') || '%' as pattern
  ),
  matches as (
    select
      e.id, e.amount_cents, e.description, e.note, e.spent_at, e.category_id,
      c.name as category_name, c.emoji as category_emoji, c.color as category_color,
      (e.spent_at at time zone s.tz)::date as day
    from public.expenses e
    join public.categories c on c.id = e.category_id and c.user_id = e.user_id
    cross join settings s
    cross join search q
    where (p_category_id is null or e.category_id = p_category_id)
      and (
        q.raw = ''
        or e.description ilike q.pattern
        or e.note ilike q.pattern
        or c.name ilike q.pattern
      )
  )
  select
    m.id, m.amount_cents, m.description, m.note, m.spent_at, m.category_id,
    m.category_name, m.category_emoji, m.category_color, m.day,
    (sum(m.amount_cents) over (partition by m.day))::bigint as day_total_cents
  from matches m
  order by m.spent_at desc, m.id
  limit least(greatest(coalesce(p_limit, 50), 1), 500);
$$;

revoke execute on function public.search_expenses(text, uuid, integer) from public, anon;
grant execute on function public.search_expenses(text, uuid, integer) to authenticated;
