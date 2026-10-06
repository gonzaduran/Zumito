-- Reparto de la nómina: un ingreso programado se reparte en partes con porcentaje
-- (p. ej. 50 % Necesidades, 30 % Caprichos, 20 % Ahorro). Cada parte puede llevar
-- categorías para saber cuánto se ha gastado de ella este mes. Es de Premium.

create table public.split_buckets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  recurring_id uuid not null,
  name text not null check (char_length(btrim(name)) between 1 and 30),
  emoji text not null check (char_length(emoji) between 1 and 16),
  percent integer not null check (percent between 1 and 100),
  position integer not null default 0 check (position >= 0),
  created_at timestamptz not null default now(),
  foreign key (recurring_id, user_id) references public.recurring_incomes (id, user_id)
    on delete cascade,
  unique (id, user_id, recurring_id)
);

create index split_buckets_recurring_idx on public.split_buckets (recurring_id, position);

create table public.split_bucket_categories (
  bucket_id uuid not null,
  category_id uuid not null,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  recurring_id uuid not null,
  primary key (bucket_id, category_id),
  foreign key (bucket_id, user_id, recurring_id)
    references public.split_buckets (id, user_id, recurring_id) on delete cascade,
  foreign key (category_id, user_id) references public.categories (id, user_id) on delete cascade,
  -- Una categoría solo cuenta en una parte de cada reparto.
  unique (recurring_id, category_id)
);

alter table public.split_buckets enable row level security;
alter table public.split_bucket_categories enable row level security;
revoke all on table public.split_buckets, public.split_bucket_categories from anon;

create policy "Ver mis partes" on public.split_buckets
for select to authenticated using ((select auth.uid()) = user_id);
create policy "Crear mis partes" on public.split_buckets
for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Editar mis partes" on public.split_buckets
for update to authenticated
using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Borrar mis partes" on public.split_buckets
for delete to authenticated using ((select auth.uid()) = user_id);

create policy "Ver mis categorías de partes" on public.split_bucket_categories
for select to authenticated using ((select auth.uid()) = user_id);
create policy "Crear mis categorías de partes" on public.split_bucket_categories
for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Borrar mis categorías de partes" on public.split_bucket_categories
for delete to authenticated using ((select auth.uid()) = user_id);

-- Guarda el reparto entero de una vez (sustituye al anterior): todo o nada.
-- p_buckets: [{ "name", "emoji", "percent", "category_ids": [uuid] }]. Lista vacía = sin reparto.
create function public.save_split(p_recurring_id uuid, p_buckets jsonb)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_bucket jsonb;
  v_bucket_id uuid;
  v_position integer := 0;
begin
  if v_user_id is null then
    raise exception 'No autenticado' using errcode = '42501';
  end if;
  if jsonb_typeof(p_buckets) <> 'array' or jsonb_array_length(p_buckets) > 10 then
    raise exception 'Formato no válido' using errcode = '22023';
  end if;
  if not exists (
    select 1 from public.recurring_incomes r where r.id = p_recurring_id and r.user_id = v_user_id
  ) then
    raise exception 'Ingreso programado no encontrado' using errcode = '22023';
  end if;
  if jsonb_array_length(p_buckets) > 0 and not public.is_premium() then
    raise exception 'El reparto de la nómina es de Premium' using errcode = '42501';
  end if;
  if coalesce((
    select sum((b.value ->> 'percent')::integer) from jsonb_array_elements(p_buckets) as b (value)
  ), 0) > 100 then
    raise exception 'El reparto pasa del 100 %%' using errcode = '22023';
  end if;

  delete from public.split_buckets where recurring_id = p_recurring_id and user_id = v_user_id;

  for v_bucket in select value from jsonb_array_elements(p_buckets) loop
    insert into public.split_buckets (user_id, recurring_id, name, emoji, percent, position)
    values (
      v_user_id, p_recurring_id, btrim(v_bucket ->> 'name'), v_bucket ->> 'emoji',
      (v_bucket ->> 'percent')::integer, v_position
    )
    returning id into v_bucket_id;

    insert into public.split_bucket_categories (bucket_id, category_id, user_id, recurring_id)
    select distinct v_bucket_id, c.value::uuid, v_user_id, p_recurring_id
    from jsonb_array_elements_text(coalesce(v_bucket -> 'category_ids', '[]'::jsonb)) as c (value);

    v_position := v_position + 1;
  end loop;
end;
$$;

-- Estado del reparto entre dos días (p_to excluido): lo que toca a cada parte según el
-- importe del ingreso programado y lo gastado en sus categorías, en la cuenta del ingreso.
create function public.split_status(p_recurring_id uuid, p_from date, p_to date)
returns table (
  id uuid,
  name text,
  emoji text,
  percent integer,
  target_cents bigint,
  spent_cents bigint,
  category_ids uuid[]
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
  select
    b.id, b.name, b.emoji, b.percent,
    round(r.amount_cents * b.percent / 100.0)::bigint,
    coalesce((
      select sum(e.amount_cents)
      from public.expenses e
      join public.split_bucket_categories bc on bc.category_id = e.category_id and bc.bucket_id = b.id
      cross join settings s
      where e.user_id = b.user_id
        and e.account_id = r.account_id
        and (e.spent_at at time zone s.tz)::date >= p_from
        and (e.spent_at at time zone s.tz)::date < p_to
    ), 0)::bigint,
    coalesce((
      select array_agg(bc.category_id order by bc.category_id)
      from public.split_bucket_categories bc where bc.bucket_id = b.id
    ), '{}')
  from public.split_buckets b
  join public.recurring_incomes r on r.id = b.recurring_id and r.user_id = b.user_id
  where b.recurring_id = p_recurring_id
  order by b.position;
$$;

revoke execute on function public.save_split(uuid, jsonb) from public, anon;
grant execute on function public.save_split(uuid, jsonb) to authenticated;
revoke execute on function public.split_status(uuid, date, date) from public, anon;
grant execute on function public.split_status(uuid, date, date) to authenticated;
