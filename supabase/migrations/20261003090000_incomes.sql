-- "Mi dinero": ingresos a mano e ingresos programados (la nómina), para saber cuánto
-- te queda este mes. Gratis: ingresos a mano ilimitados y un ingreso programado.
-- Premium: varios ingresos programados.

-- ---------------------------------------------------------------------------
-- Ingresos programados
-- ---------------------------------------------------------------------------

create table public.recurring_incomes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  description text not null check (char_length(description) between 1 and 80),
  amount_cents bigint not null check (amount_cents > 0 and amount_cents <= 100000000),
  -- Día del mes en que se cobra. Si el mes es más corto (31 en abril), el último día.
  day_of_month smallint not null check (day_of_month between 1 and 31),
  active boolean not null default true,
  -- Primer mes que cuenta (el de su creación): si el día ya pasó, ese mes ya se ha cobrado.
  starts_on date not null default current_date,
  -- Último mes ya apuntado: no se vuelve a generar aunque se borre ese ingreso.
  last_period date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id)
);

create trigger recurring_incomes_set_updated_at
before update on public.recurring_incomes
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Ingresos
-- ---------------------------------------------------------------------------

create table public.incomes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  description text not null check (char_length(description) between 1 and 80),
  amount_cents bigint not null check (amount_cents > 0 and amount_cents <= 100000000),
  received_at timestamptz not null default now(),
  -- Si lo generó un ingreso programado: cuál y de qué mes (uno por mes, nunca repetido).
  recurring_id uuid,
  period date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (recurring_id, user_id) references public.recurring_incomes (id, user_id)
    on delete set null (recurring_id),
  unique (recurring_id, period)
);

create index incomes_user_received_idx on public.incomes (user_id, received_at desc);
create index incomes_recurring_idx on public.incomes (recurring_id);

create trigger incomes_set_updated_at
before update on public.incomes
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- RLS: cada uno solo ve y toca lo suyo; nada para anónimos
-- ---------------------------------------------------------------------------

alter table public.recurring_incomes enable row level security;
alter table public.incomes enable row level security;
revoke all on table public.recurring_incomes, public.incomes from anon;

create policy "Ver mis ingresos programados" on public.recurring_incomes
for select to authenticated using ((select auth.uid()) = user_id);
create policy "Crear mis ingresos programados" on public.recurring_incomes
for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Editar mis ingresos programados" on public.recurring_incomes
for update to authenticated
using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Borrar mis ingresos programados" on public.recurring_incomes
for delete to authenticated using ((select auth.uid()) = user_id);

create policy "Ver mis ingresos" on public.incomes
for select to authenticated using ((select auth.uid()) = user_id);
create policy "Crear mis ingresos" on public.incomes
for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Editar mis ingresos" on public.incomes
for update to authenticated
using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Borrar mis ingresos" on public.incomes
for delete to authenticated using ((select auth.uid()) = user_id);

-- ---------------------------------------------------------------------------
-- Gratis: un ingreso programado. Premium: los que quieras.
-- ---------------------------------------------------------------------------

create function public.recurring_incomes_premium_guard()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if (select auth.uid()) is not null
    and not public.is_premium()
    and exists (
      select 1 from public.recurring_incomes r
      where r.user_id = new.user_id and r.id <> new.id
    ) then
    raise exception 'Varios ingresos programados son de Premium' using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger recurring_incomes_premium_guard
before insert on public.recurring_incomes
for each row execute function public.recurring_incomes_premium_guard();

-- ---------------------------------------------------------------------------
-- Apuntar los ingresos programados que ya tocan
-- ---------------------------------------------------------------------------

-- Crea los ingresos de cada mes (desde que se programó o desde el último apuntado) cuyo
-- día ya ha llegado en la zona del usuario. Se puede llamar siempre: nunca duplica
-- (unique recurring_id+period) y un ingreso borrado no vuelve (last_period).
-- Los programados en pausa no generan nada. Devuelve cuántos ingresos ha creado.
create function public.apply_recurring_incomes()
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
    select r.id, r.description, r.amount_cents, m.month::date as period,
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
    insert into public.incomes (user_id, description, amount_cents, received_at, recurring_id, period)
    select v_user_id, d.description, d.amount_cents,
      -- A las 9:00 del día de cobro, en la zona del usuario.
      (d.pay_day + time '09:00') at time zone v_tz,
      d.id, d.period
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

-- Total ingresado entre dos días (p_to excluido) en la zona del usuario.
create function public.income_total(p_from date, p_to date)
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
    and (i.received_at at time zone s.tz)::date < p_to;
$$;

revoke execute on function public.apply_recurring_incomes() from public, anon;
grant execute on function public.apply_recurring_incomes() to authenticated;
revoke execute on function public.income_total(date, date) from public, anon;
grant execute on function public.income_total(date, date) to authenticated;
