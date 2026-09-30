-- Suscripciones con Stripe, plan "Fundadores" y oferta de bienvenida.
-- El estado de pago solo lo escribe el servidor (webhook con la clave secreta, nunca en
-- el cliente). El usuario solo puede leer su propia suscripción.

-- ---------------------------------------------------------------------------
-- Perfil: columnas que el usuario NO puede tocar
-- ---------------------------------------------------------------------------

alter table public.profiles
  -- Premium gratis concedido a mano (tú y tus amigos de la beta).
  add column premium_comp boolean not null default false,
  -- Momento en que se le mostró la oferta de bienvenida (una sola vez).
  add column welcome_offer_started_at timestamptz;

-- Hasta ahora el usuario podía actualizar cualquier columna de su perfil. Desde aquí,
-- solo las suyas: así no puede darse Premium ni reiniciar la cuenta atrás de la oferta.
revoke update on table public.profiles from authenticated;
grant update (display_name, currency, locale, timezone, onboarded_at, updated_at)
  on table public.profiles to authenticated;

-- Empieza la oferta de bienvenida si aún no había empezado. Devuelve cuándo empezó.
-- security definer: el usuario no puede escribir esa columna directamente.
create function public.start_welcome_offer()
returns timestamptz
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_started timestamptz;
begin
  if v_user_id is null then
    raise exception 'No autenticado' using errcode = '42501';
  end if;
  update public.profiles
  set welcome_offer_started_at = now()
  where id = v_user_id and welcome_offer_started_at is null;
  select welcome_offer_started_at into v_started from public.profiles where id = v_user_id;
  return v_started;
end;
$$;

revoke execute on function public.start_welcome_offer() from public, anon;
grant execute on function public.start_welcome_offer() to authenticated;

-- ---------------------------------------------------------------------------
-- Suscripciones
-- ---------------------------------------------------------------------------

create table public.subscriptions (
  user_id uuid primary key references auth.users (id) on delete cascade,
  stripe_customer_id text not null unique,
  stripe_subscription_id text unique,
  -- Estado tal cual lo da Stripe: trialing, active, past_due, canceled, unpaid…
  status text,
  price_id text,
  billing_interval text check (billing_interval in ('month', 'year')),
  trial_end timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  -- Si alguna vez tuvo prueba: la prueba de 7 días es solo una vez por persona.
  trial_used boolean not null default false,
  updated_at timestamptz not null default now()
);

alter table public.subscriptions enable row level security;
revoke all on table public.subscriptions from anon, authenticated;
grant select on table public.subscriptions to authenticated;

create policy "Ver mi suscripción" on public.subscriptions
for select to authenticated
using ((select auth.uid()) = user_id);

-- Eventos de Stripe ya procesados: el webhook no procesa dos veces el mismo evento.
create table public.stripe_events (
  id text primary key,
  type text not null,
  processed_at timestamptz not null default now()
);

alter table public.stripe_events enable row level security;
revoke all on table public.stripe_events from anon, authenticated;

-- ---------------------------------------------------------------------------
-- Funciones de Premium: se comprueban en la base de datos, no en el cliente
-- ---------------------------------------------------------------------------

-- ¿El usuario actual tiene Premium? (Fundador o suscripción en prueba, activa o
-- pendiente de cobro). Solo informa del propio usuario.
create function public.is_premium()
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles p where p.id = (select auth.uid()) and p.premium_comp
  ) or exists (
    select 1 from public.subscriptions s
    where s.user_id = (select auth.uid()) and s.status in ('trialing', 'active', 'past_due')
  );
$$;

revoke execute on function public.is_premium() from public, anon;
grant execute on function public.is_premium() to authenticated;

-- Los presupuestos por categoría son de Premium. Sin Premium no se pueden crear ni
-- cambiar (los que ya había quedan en pausa, no se borran).
-- Sin sesión (servidor con la clave secreta, migraciones) no se aplica.
create function public.budgets_premium_guard()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.category_id is not null
    and (select auth.uid()) is not null
    and not public.is_premium() then
    raise exception 'Los presupuestos por categoría son de Premium' using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger budgets_premium_guard
before insert or update on public.budgets
for each row execute function public.budgets_premium_guard();

-- Guardar presupuestos: sin Premium solo se cambia el total del mes y se conservan
-- (en pausa) los de categoría que hubiera.
create or replace function public.set_budgets(p_budgets jsonb)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_premium boolean := public.is_premium();
begin
  if v_user_id is null then
    raise exception 'No autenticado' using errcode = '42501';
  end if;
  if jsonb_typeof(p_budgets) <> 'array' then
    raise exception 'Formato no válido' using errcode = '22023';
  end if;

  delete from public.budgets
  where user_id = v_user_id and (v_premium or category_id is null);

  insert into public.budgets (user_id, category_id, amount_cents)
  select v_user_id, nullif(b.value ->> 'category_id', '')::uuid, (b.value ->> 'amount_cents')::bigint
  from jsonb_array_elements(p_budgets) as b (value)
  where v_premium or nullif(b.value ->> 'category_id', '') is null;
end;
$$;
