-- Beta abierta: mientras esté activa, todo el mundo tiene Premium (sin candados ni pagos).
-- Para empezar a cobrar: update public.app_settings set beta_open = false;

create table public.app_settings (
  -- Una sola fila.
  id boolean primary key default true check (id),
  beta_open boolean not null default true,
  updated_at timestamptz not null default now()
);

insert into public.app_settings (id, beta_open) values (true, true);

create trigger app_settings_set_updated_at
before update on public.app_settings
for each row execute function public.set_updated_at();

-- Todos con sesión pueden leerla; nadie puede cambiarla desde la app (solo con SQL).
alter table public.app_settings enable row level security;
revoke all on table public.app_settings from anon, authenticated;
grant select on table public.app_settings to authenticated;

create policy "Leer los ajustes de la app" on public.app_settings
for select to authenticated using (true);

-- Premium: Fundador, suscripción activa o beta abierta.
create or replace function public.is_premium()
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select coalesce((select s.beta_open from public.app_settings s), false)
  or exists (
    select 1 from public.profiles p where p.id = (select auth.uid()) and p.premium_comp
  ) or exists (
    select 1 from public.subscriptions s
    where s.user_id = (select auth.uid()) and s.status in ('trialing', 'active', 'past_due')
  );
$$;
