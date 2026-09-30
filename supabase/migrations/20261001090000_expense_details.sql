-- Detalles opcionales del gasto: lugar, con quién y estado de ánimo.
-- Mismas reglas que el esquema inicial: RLS en todo y claves compuestas con user_id
-- para que ningún gasto pueda apuntar al lugar o a la persona de otro usuario.

-- ---------------------------------------------------------------------------
-- Estado de ánimo y clave compuesta del gasto
-- ---------------------------------------------------------------------------

alter table public.expenses
  add column mood text check (mood in ('good', 'neutral', 'bad'));

alter table public.expenses add constraint expenses_id_user_id_key unique (id, user_id);

-- ---------------------------------------------------------------------------
-- Lugares
-- ---------------------------------------------------------------------------

create table public.places (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 80),
  created_at timestamptz not null default now(),
  unique (id, user_id)
);

create unique index places_user_name_key on public.places (user_id, lower(btrim(name)));

alter table public.expenses add column place_id uuid;

-- Si se borra el lugar, el gasto se queda sin lugar (solo se anula place_id).
alter table public.expenses
  add constraint expenses_place_id_user_id_fkey
  foreign key (place_id, user_id) references public.places (id, user_id)
  on delete set null (place_id);

create index expenses_place_idx on public.expenses (place_id);

-- ---------------------------------------------------------------------------
-- Personas y personas de cada gasto
-- ---------------------------------------------------------------------------

create table public.people (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 40),
  created_at timestamptz not null default now(),
  unique (id, user_id)
);

create unique index people_user_name_key on public.people (user_id, lower(btrim(name)));

create table public.expense_people (
  expense_id uuid not null,
  person_id uuid not null,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  primary key (expense_id, person_id),
  foreign key (expense_id, user_id) references public.expenses (id, user_id) on delete cascade,
  foreign key (person_id, user_id) references public.people (id, user_id) on delete cascade
);

create index expense_people_person_idx on public.expense_people (person_id);

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.places enable row level security;
alter table public.people enable row level security;
alter table public.expense_people enable row level security;

revoke all on table public.places, public.people, public.expense_people from anon;

create policy "Ver mis lugares" on public.places
for select to authenticated using ((select auth.uid()) = user_id);
create policy "Crear mis lugares" on public.places
for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Editar mis lugares" on public.places
for update to authenticated
using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Borrar mis lugares" on public.places
for delete to authenticated using ((select auth.uid()) = user_id);

create policy "Ver mis personas" on public.people
for select to authenticated using ((select auth.uid()) = user_id);
create policy "Crear mis personas" on public.people
for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Editar mis personas" on public.people
for update to authenticated
using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Borrar mis personas" on public.people
for delete to authenticated using ((select auth.uid()) = user_id);

create policy "Ver las personas de mis gastos" on public.expense_people
for select to authenticated using ((select auth.uid()) = user_id);
create policy "Añadir personas a mis gastos" on public.expense_people
for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Quitar personas de mis gastos" on public.expense_people
for delete to authenticated using ((select auth.uid()) = user_id);

-- ---------------------------------------------------------------------------
-- Funciones
-- ---------------------------------------------------------------------------

-- Id del lugar con ese nombre (sin distinguir mayúsculas); lo crea si no existe.
create function public.ensure_place(p_name text)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_name text := btrim(coalesce(p_name, ''));
  v_id uuid;
begin
  if v_name = '' then
    return null;
  end if;
  select id into v_id from public.places
  where user_id = (select auth.uid()) and lower(btrim(name)) = lower(v_name);
  if v_id is null then
    insert into public.places (name) values (v_name) on conflict do nothing returning id into v_id;
    -- Otra petición lo creó a la vez: se reutiliza.
    if v_id is null then
      select id into v_id from public.places
      where user_id = (select auth.uid()) and lower(btrim(name)) = lower(v_name);
    end if;
  end if;
  return v_id;
end;
$$;

-- Igual que ensure_place, para personas.
create function public.ensure_person(p_name text)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_name text := btrim(coalesce(p_name, ''));
  v_id uuid;
begin
  if v_name = '' then
    return null;
  end if;
  select id into v_id from public.people
  where user_id = (select auth.uid()) and lower(btrim(name)) = lower(v_name);
  if v_id is null then
    insert into public.people (name) values (v_name) on conflict do nothing returning id into v_id;
    if v_id is null then
      select id into v_id from public.people
      where user_id = (select auth.uid()) and lower(btrim(name)) = lower(v_name);
    end if;
  end if;
  return v_id;
end;
$$;

-- Crea o actualiza un gasto con su lugar y sus personas, todo o nada.
-- Idempotente por id: reenviar el mismo gasto (reintento sin conexión) no lo duplica.
create function public.save_expense(
  p_id uuid,
  p_category_id uuid,
  p_amount_cents bigint,
  p_spent_at timestamptz,
  p_description text default null,
  p_note text default null,
  p_place text default null,
  p_mood text default null,
  p_person_ids uuid[] default '{}',
  p_new_people text[] default '{}'
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_place_id uuid;
  v_people uuid[];
begin
  if v_user_id is null then
    raise exception 'No autenticado' using errcode = '42501';
  end if;
  if coalesce(cardinality(p_person_ids), 0) + coalesce(cardinality(p_new_people), 0) > 20 then
    raise exception 'Demasiadas personas' using errcode = '22023';
  end if;

  v_place_id := public.ensure_place(p_place);

  select coalesce(array_agg(distinct person_id), '{}') into v_people
  from (
    select unnest(coalesce(p_person_ids, '{}')) as person_id
    union
    select public.ensure_person(name) from unnest(coalesce(p_new_people, '{}')) as name
  ) as selected
  where person_id is not null;

  insert into public.expenses (
    id, user_id, category_id, amount_cents, description, note, spent_at, place_id, mood
  )
  values (
    p_id, v_user_id, p_category_id, p_amount_cents,
    nullif(btrim(p_description), ''), nullif(btrim(p_note), ''), p_spent_at, v_place_id, p_mood
  )
  on conflict (id) do update set
    category_id = excluded.category_id,
    amount_cents = excluded.amount_cents,
    description = excluded.description,
    note = excluded.note,
    spent_at = excluded.spent_at,
    place_id = excluded.place_id,
    mood = excluded.mood;

  delete from public.expense_people
  where expense_id = p_id and not (person_id = any (v_people));

  insert into public.expense_people (expense_id, person_id, user_id)
  select p_id, person_id, v_user_id from unnest(v_people) as person_id
  on conflict do nothing;
end;
$$;

-- Lugares del usuario, de más a menos usados (para autocompletar).
create function public.places_by_frequency(p_limit integer default 200)
returns table (id uuid, name text, uses bigint)
language sql
stable
security invoker
set search_path = ''
as $$
  select p.id, p.name, count(e.id)::bigint as uses
  from public.places p
  left join public.expenses e on e.place_id = p.id and e.user_id = p.user_id
  group by p.id, p.name
  order by count(e.id) desc, max(e.spent_at) desc nulls last, p.name
  limit least(greatest(coalesce(p_limit, 200), 1), 500);
$$;

-- Personas del usuario, de más a menos frecuentes.
create function public.people_by_frequency(p_limit integer default 200)
returns table (id uuid, name text, uses bigint)
language sql
stable
security invoker
set search_path = ''
as $$
  select p.id, p.name, count(ep.expense_id)::bigint as uses
  from public.people p
  left join public.expense_people ep on ep.person_id = p.id and ep.user_id = p.user_id
  group by p.id, p.name
  order by count(ep.expense_id) desc, p.name
  limit least(greatest(coalesce(p_limit, 200), 1), 500);
$$;

-- Historial con los nuevos filtros (lugar, persona, rango de importe) y detalles.
-- Sustituye a la versión anterior (cambia la firma).
drop function public.search_expenses(text, uuid, integer);

create function public.search_expenses(
  p_query text default null,
  p_category_id uuid default null,
  p_place_id uuid default null,
  p_person_id uuid default null,
  p_min_cents bigint default null,
  p_max_cents bigint default null,
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
  place_id uuid,
  place_name text,
  mood text,
  people jsonb,
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
      '%' || replace(replace(replace(btrim(coalesce(p_query, '')), '\', '\\'), '%', '\%'), '_', '\_') || '%' as pattern
  ),
  matches as (
    select
      e.id, e.amount_cents, e.description, e.note, e.spent_at, e.category_id,
      c.name as category_name, c.emoji as category_emoji, c.color as category_color,
      e.place_id, pl.name as place_name, e.mood,
      (e.spent_at at time zone s.tz)::date as day
    from public.expenses e
    join public.categories c on c.id = e.category_id and c.user_id = e.user_id
    left join public.places pl on pl.id = e.place_id and pl.user_id = e.user_id
    cross join settings s
    cross join search q
    where (p_category_id is null or e.category_id = p_category_id)
      and (p_place_id is null or e.place_id = p_place_id)
      and (p_person_id is null or exists (
        select 1 from public.expense_people ep
        where ep.expense_id = e.id and ep.person_id = p_person_id
      ))
      and (p_min_cents is null or e.amount_cents >= p_min_cents)
      and (p_max_cents is null or e.amount_cents <= p_max_cents)
      and (
        q.raw = ''
        or e.description ilike q.pattern
        or e.note ilike q.pattern
        or c.name ilike q.pattern
        or pl.name ilike q.pattern
      )
  )
  select
    m.id, m.amount_cents, m.description, m.note, m.spent_at, m.category_id,
    m.category_name, m.category_emoji, m.category_color,
    m.place_id, m.place_name, m.mood,
    coalesce((
      select jsonb_agg(jsonb_build_object('id', p.id, 'name', p.name) order by p.name)
      from public.expense_people ep
      join public.people p on p.id = ep.person_id and p.user_id = ep.user_id
      where ep.expense_id = m.id
    ), '[]'::jsonb) as people,
    m.day,
    (sum(m.amount_cents) over (partition by m.day))::bigint as day_total_cents
  from matches m
  order by m.spent_at desc, m.id
  limit least(greatest(coalesce(p_limit, 50), 1), 500);
$$;

revoke execute on function public.ensure_place(text) from public, anon;
revoke execute on function public.ensure_person(text) from public, anon;
revoke execute on function public.save_expense(uuid, uuid, bigint, timestamptz, text, text, text, text, uuid[], text[]) from public, anon;
revoke execute on function public.places_by_frequency(integer) from public, anon;
revoke execute on function public.people_by_frequency(integer) from public, anon;
revoke execute on function public.search_expenses(text, uuid, uuid, uuid, bigint, bigint, integer) from public, anon;
grant execute on function public.ensure_place(text) to authenticated;
grant execute on function public.ensure_person(text) to authenticated;
grant execute on function public.save_expense(uuid, uuid, bigint, timestamptz, text, text, text, text, uuid[], text[]) to authenticated;
grant execute on function public.places_by_frequency(integer) to authenticated;
grant execute on function public.people_by_frequency(integer) to authenticated;
grant execute on function public.search_expenses(text, uuid, uuid, uuid, bigint, bigint, integer) to authenticated;
