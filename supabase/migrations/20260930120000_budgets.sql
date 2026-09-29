-- Presupuestos: guardado atómico y estado del mes en curso.

-- Sustituye todos los presupuestos del usuario por los recibidos:
-- [{ "category_id": uuid | null, "amount_cents": n }, ...]. Lo que no venga se borra.
create function public.set_budgets(p_budgets jsonb)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
begin
  if v_user_id is null then
    raise exception 'No autenticado' using errcode = '42501';
  end if;
  if jsonb_typeof(p_budgets) <> 'array' then
    raise exception 'Formato no válido' using errcode = '22023';
  end if;

  delete from public.budgets where user_id = v_user_id;

  insert into public.budgets (user_id, category_id, amount_cents)
  select v_user_id, nullif(b.value ->> 'category_id', '')::uuid, (b.value ->> 'amount_cents')::bigint
  from jsonb_array_elements(p_budgets) as b (value);
end;
$$;

-- Presupuestos con lo gastado este mes (zona del usuario). category_id nulo = total del mes.
-- No incluye presupuestos de categorías archivadas.
create function public.budget_status()
returns table (category_id uuid, name text, emoji text, amount_cents bigint, spent_cents bigint)
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
  month_expenses as (
    select e.category_id, e.amount_cents
    from public.expenses e
    cross join settings s
    where date_trunc('month', e.spent_at at time zone s.tz)
      = date_trunc('month', now() at time zone s.tz)
  )
  select
    b.category_id,
    c.name,
    c.emoji,
    b.amount_cents,
    coalesce((
      select sum(m.amount_cents) from month_expenses m
      where b.category_id is null or m.category_id = b.category_id
    ), 0)::bigint
  from public.budgets b
  left join public.categories c on c.id = b.category_id and c.user_id = b.user_id
  where b.category_id is null or c.archived_at is null
  order by b.category_id is not null, c.position;
$$;

revoke execute on function public.set_budgets(jsonb) from public, anon;
grant execute on function public.set_budgets(jsonb) to authenticated;
revoke execute on function public.budget_status() from public, anon;
grant execute on function public.budget_status() to authenticated;
