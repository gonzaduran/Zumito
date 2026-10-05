-- Cuentas (p. ej. "Personal" y "Padres"): cada gasto e ingreso pertenece a una cuenta
-- y se puede ver cuánto se gasta y cuánto queda en cada una.
-- Gratis: 1 cuenta. Premium: hasta 20.

-- ---------------------------------------------------------------------------
-- Tabla
-- ---------------------------------------------------------------------------

create table public.accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 30),
  emoji text not null check (char_length(emoji) between 1 and 16),
  position integer not null default 0 check (position >= 0),
  -- Las cuentas no se borran (tienen gastos): se archivan.
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id)
);

create unique index accounts_user_name_key
on public.accounts (user_id, lower(btrim(name)))
where archived_at is null;

create index accounts_user_position_idx on public.accounts (user_id, position);

create trigger accounts_set_updated_at
before update on public.accounts
for each row execute function public.set_updated_at();

alter table public.accounts enable row level security;
revoke all on table public.accounts from anon;
-- Sin delete: las cuentas se archivan (y se borran solo al borrar el usuario).
revoke delete on table public.accounts from authenticated;

create policy "Ver mis cuentas" on public.accounts
for select to authenticated using ((select auth.uid()) = user_id);
create policy "Crear mis cuentas" on public.accounts
for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Editar mis cuentas" on public.accounts
for update to authenticated
using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

-- Cuenta principal del usuario: la primera activa por orden.
create function public.default_account_id(p_user_id uuid)
returns uuid
language sql
stable
security invoker
set search_path = ''
as $$
  select a.id from public.accounts a
  where a.user_id = p_user_id and a.archived_at is null
  order by a.position, a.created_at
  limit 1;
$$;

revoke execute on function public.default_account_id(uuid) from public, anon;
grant execute on function public.default_account_id(uuid) to authenticated;

-- Límite de cuentas activas (Gratis 1, Premium 20) y nunca quedarse sin ninguna.
-- Sin sesión (servidor con la clave secreta, migraciones) no se aplica.
create function public.accounts_guard()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_active integer;
begin
  if (select auth.uid()) is null then
    return new;
  end if;

  if new.archived_at is null and (tg_op = 'INSERT' or old.archived_at is not null) then
    select count(*) into v_active from public.accounts a
    where a.user_id = new.user_id and a.archived_at is null and a.id <> new.id;
    if v_active >= (case when public.is_premium() then 20 else 1 end) then
      raise exception 'Límite de cuentas alcanzado' using errcode = '42501';
    end if;
  end if;

  if tg_op = 'UPDATE' and new.archived_at is not null and old.archived_at is null then
    if not exists (
      select 1 from public.accounts a
      where a.user_id = new.user_id and a.archived_at is null and a.id <> new.id
    ) then
      raise exception 'Necesitas al menos una cuenta' using errcode = '22023';
    end if;
  end if;

  return new;
end;
$$;

create trigger accounts_guard
before insert or update on public.accounts
for each row execute function public.accounts_guard();

-- ---------------------------------------------------------------------------
-- Cuenta principal para todos: los que ya existen y los que se registren
-- ---------------------------------------------------------------------------

insert into public.accounts (user_id, name, emoji)
select p.id, 'Personal', '💳' from public.profiles p;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, nullif(btrim(new.raw_user_meta_data ->> 'display_name'), ''));
  insert into public.accounts (user_id, name, emoji) values (new.id, 'Personal', '💳');
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Cada gasto, ingreso e ingreso programado pertenece a una cuenta
-- ---------------------------------------------------------------------------

alter table public.expenses add column account_id uuid;
alter table public.incomes add column account_id uuid;
alter table public.recurring_incomes add column account_id uuid;

update public.expenses e set account_id = public.default_account_id(e.user_id);
update public.incomes i set account_id = public.default_account_id(i.user_id);
update public.recurring_incomes r set account_id = public.default_account_id(r.user_id);

alter table public.expenses
  alter column account_id set not null,
  add foreign key (account_id, user_id) references public.accounts (id, user_id);
alter table public.incomes
  alter column account_id set not null,
  add foreign key (account_id, user_id) references public.accounts (id, user_id);
alter table public.recurring_incomes
  alter column account_id set not null,
  add foreign key (account_id, user_id) references public.accounts (id, user_id);

create index expenses_account_idx on public.expenses (account_id);
create index incomes_account_idx on public.incomes (account_id);

-- Sin cuenta indicada, la principal. Así siguen funcionando la cola sin conexión y
-- cualquier cliente que no la envíe.
create function public.fill_account_id()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.account_id is null then
    new.account_id := public.default_account_id(new.user_id);
  end if;
  return new;
end;
$$;

create trigger expenses_fill_account
before insert on public.expenses
for each row execute function public.fill_account_id();
create trigger incomes_fill_account
before insert on public.incomes
for each row execute function public.fill_account_id();
create trigger recurring_incomes_fill_account
before insert on public.recurring_incomes
for each row execute function public.fill_account_id();

-- ---------------------------------------------------------------------------
-- Guardar un gasto: ahora con cuenta (nula = la principal al crear, la misma al editar)
-- ---------------------------------------------------------------------------

drop function public.save_expense(uuid, uuid, bigint, timestamptz, text, text, text, text, uuid[], text[]);

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
  p_new_people text[] default '{}',
  p_account_id uuid default null
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
    id, user_id, category_id, amount_cents, description, note, spent_at, place_id, mood,
    account_id
  )
  values (
    p_id, v_user_id, p_category_id, p_amount_cents,
    nullif(btrim(p_description), ''), nullif(btrim(p_note), ''), p_spent_at, v_place_id, p_mood,
    p_account_id
  )
  on conflict (id) do update set
    category_id = excluded.category_id,
    amount_cents = excluded.amount_cents,
    description = excluded.description,
    note = excluded.note,
    spent_at = excluded.spent_at,
    place_id = excluded.place_id,
    mood = excluded.mood,
    account_id = coalesce(p_account_id, public.expenses.account_id);

  delete from public.expense_people
  where expense_id = p_id and not (person_id = any (v_people));

  insert into public.expense_people (expense_id, person_id, user_id)
  select p_id, person_id, v_user_id from unnest(v_people) as person_id
  on conflict do nothing;
end;
$$;

revoke execute on function public.save_expense(uuid, uuid, bigint, timestamptz, text, text, text, text, uuid[], text[], uuid) from public, anon;
grant execute on function public.save_expense(uuid, uuid, bigint, timestamptz, text, text, text, text, uuid[], text[], uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Historial: filtro por cuenta y la cuenta de cada gasto
-- ---------------------------------------------------------------------------

drop function public.search_expenses(text, uuid, uuid, uuid, bigint, bigint, integer);

create function public.search_expenses(
  p_query text default null,
  p_category_id uuid default null,
  p_place_id uuid default null,
  p_person_id uuid default null,
  p_min_cents bigint default null,
  p_max_cents bigint default null,
  p_limit integer default 50,
  p_account_id uuid default null
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
  day_total_cents bigint,
  account_id uuid
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
      e.place_id, pl.name as place_name, e.mood, e.account_id,
      (e.spent_at at time zone s.tz)::date as day
    from public.expenses e
    join public.categories c on c.id = e.category_id and c.user_id = e.user_id
    left join public.places pl on pl.id = e.place_id and pl.user_id = e.user_id
    cross join settings s
    cross join search q
    where (p_category_id is null or e.category_id = p_category_id)
      and (p_account_id is null or e.account_id = p_account_id)
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
    (sum(m.amount_cents) over (partition by m.day))::bigint as day_total_cents,
    m.account_id
  from matches m
  order by m.spent_at desc, m.id
  limit least(greatest(coalesce(p_limit, 50), 1), 500);
$$;

revoke execute on function public.search_expenses(text, uuid, uuid, uuid, bigint, bigint, integer, uuid) from public, anon;
grant execute on function public.search_expenses(text, uuid, uuid, uuid, bigint, bigint, integer, uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Estadísticas e ingresos: filtro opcional por cuenta
-- ---------------------------------------------------------------------------

drop function public.spending_by_category(date, date);

create function public.spending_by_category(p_from date, p_to date, p_account_id uuid default null)
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
    and (p_account_id is null or e.account_id = p_account_id)
  group by c.id, c.name, c.emoji, c.color
  order by sum(e.amount_cents) desc, c.name;
$$;

drop function public.spending_by_month(integer);

create function public.spending_by_month(p_months integer default 6, p_account_id uuid default null)
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
    where p_account_id is null or e.account_id = p_account_id
    group by 1
  )
  select m.month, coalesce(t.total, 0)::bigint
  from months m
  left join totals t on t.month = m.month
  order by m.month;
$$;

drop function public.income_total(date, date);

create function public.income_total(p_from date, p_to date, p_account_id uuid default null)
returns bigint
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
  select coalesce(sum(i.amount_cents), 0)::bigint
  from public.incomes i
  cross join settings s
  where (i.received_at at time zone s.tz)::date >= p_from
    and (i.received_at at time zone s.tz)::date < p_to
    and (p_account_id is null or i.account_id = p_account_id);
$$;

-- Gastado e ingresado por cuenta entre dos días (p_to excluido). Solo cuentas activas.
create function public.account_summary(p_from date, p_to date)
returns table (
  id uuid,
  name text,
  emoji text,
  spent_cents bigint,
  income_cents bigint
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
    a.id, a.name, a.emoji,
    coalesce((
      select sum(e.amount_cents) from public.expenses e
      where e.account_id = a.id
        and (e.spent_at at time zone s.tz)::date >= p_from
        and (e.spent_at at time zone s.tz)::date < p_to
    ), 0)::bigint,
    coalesce((
      select sum(i.amount_cents) from public.incomes i
      where i.account_id = a.id
        and (i.received_at at time zone s.tz)::date >= p_from
        and (i.received_at at time zone s.tz)::date < p_to
    ), 0)::bigint
  from public.accounts a
  cross join settings s
  where a.archived_at is null
  order by a.position, a.created_at;
$$;

-- Los ingresos programados se apuntan en su cuenta.
create or replace function public.apply_recurring_incomes()
returns integer
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_tz text;
  v_today date;
  v_count integer;
begin
  if v_user_id is null then
    raise exception 'No autenticado' using errcode = '42501';
  end if;
  select coalesce(
    (select p.timezone from public.profiles p where p.id = v_user_id),
    'Europe/Madrid'
  ) into v_tz;
  v_today := (now() at time zone v_tz)::date;

  with due as (
    select r.id, r.description, r.amount_cents, r.account_id, m.month::date as period,
      -- El día pedido o el último del mes si ese mes no lo tiene.
      least(
        m.month::date + (r.day_of_month - 1),
        (m.month + interval '1 month' - interval '1 day')::date
      ) as pay_day
    from public.recurring_incomes r
    cross join lateral generate_series(
      greatest(
        date_trunc('month', r.starts_on::timestamp),
        coalesce(r.last_period::timestamp + interval '1 month', '-infinity'::timestamp)
      ),
      date_trunc('month', v_today::timestamp),
      interval '1 month'
    ) as m (month)
    where r.user_id = v_user_id and r.active
  ),
  paid as (
    select * from due where pay_day <= v_today
  ),
  inserted as (
    insert into public.incomes (
      user_id, description, amount_cents, received_at, recurring_id, period, account_id
    )
    select v_user_id, d.description, d.amount_cents,
      -- A las 9:00 del día de cobro, en la zona del usuario.
      (d.pay_day + time '09:00') at time zone v_tz,
      d.id, d.period, d.account_id
    from paid d
    on conflict (recurring_id, period) do nothing
    returning 1
  ),
  marked as (
    update public.recurring_incomes r
    set last_period = x.period
    from (select id, max(period) as period from paid group by id) x
    where r.id = x.id
    returning 1
  )
  select count(*) into v_count from inserted;

  return v_count;
end;
$$;

revoke execute on function public.spending_by_category(date, date, uuid) from public, anon;
grant execute on function public.spending_by_category(date, date, uuid) to authenticated;
revoke execute on function public.spending_by_month(integer, uuid) from public, anon;
grant execute on function public.spending_by_month(integer, uuid) to authenticated;
revoke execute on function public.income_total(date, date, uuid) from public, anon;
grant execute on function public.income_total(date, date, uuid) to authenticated;
revoke execute on function public.account_summary(date, date) from public, anon;
grant execute on function public.account_summary(date, date) to authenticated;
