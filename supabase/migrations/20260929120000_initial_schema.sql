-- Zumito: esquema inicial (perfiles, categorías, gastos y presupuestos).
--
-- Convenciones:
-- - Importes en céntimos (bigint), nunca en coma flotante.
-- - Cada tabla lleva user_id y RLS: cada usuario solo ve y toca lo suyo.
-- - Las referencias a categorías usan (category_id, user_id) para que sea imposible
--   apuntar a la categoría de otro usuario, aunque una política fallara.
-- - Los ids se pueden generar en el cliente (guardado optimista y sincronización offline).

-- ---------------------------------------------------------------------------
-- Utilidades
-- ---------------------------------------------------------------------------

create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Perfiles (uno por usuario, se crea automáticamente al registrarse)
-- ---------------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text check (char_length(btrim(display_name)) between 1 and 40),
  currency text not null default 'EUR' check (currency ~ '^[A-Z]{3}$'),
  locale text not null default 'es-ES' check (char_length(locale) between 2 and 10),
  timezone text not null default 'Europe/Madrid' check (char_length(timezone) between 1 and 64),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, nullif(btrim(new.raw_user_meta_data ->> 'display_name'), ''));
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Categorías
-- ---------------------------------------------------------------------------

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 30),
  emoji text not null check (char_length(emoji) between 1 and 16),
  -- Claves de la paleta (src/lib/category-colors.ts).
  color text not null check (
    color in (
      'rose', 'brick', 'terracotta', 'amber', 'olive', 'moss',
      'sage', 'teal', 'ocean', 'denim', 'plum', 'orchid'
    )
  ),
  position integer not null default 0 check (position >= 0),
  -- Las categorías no se borran si tienen gastos: se archivan.
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id)
);

create unique index categories_user_name_key
on public.categories (user_id, lower(btrim(name)))
where archived_at is null;

create index categories_user_position_idx on public.categories (user_id, position);

create trigger categories_set_updated_at
before update on public.categories
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Gastos
-- ---------------------------------------------------------------------------

create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  category_id uuid not null,
  -- Máximo 1.000.000,00 €.
  amount_cents bigint not null check (amount_cents > 0 and amount_cents <= 100000000),
  -- Concepto o lugar, p. ej. "Mercadona".
  description text check (char_length(description) <= 80),
  note text check (char_length(note) <= 500),
  spent_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (category_id, user_id) references public.categories (id, user_id)
);

create index expenses_user_spent_at_idx on public.expenses (user_id, spent_at desc);
create index expenses_category_idx on public.expenses (category_id);

create trigger expenses_set_updated_at
before update on public.expenses
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Presupuestos mensuales (category_id nulo = presupuesto total del mes)
-- ---------------------------------------------------------------------------

create table public.budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  category_id uuid,
  amount_cents bigint not null check (amount_cents > 0 and amount_cents <= 100000000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (category_id, user_id) references public.categories (id, user_id) on delete cascade,
  unique nulls not distinct (user_id, category_id)
);

create index budgets_category_idx on public.budgets (category_id);

create trigger budgets_set_updated_at
before update on public.budgets
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Seguridad: RLS en todas las tablas y nada para usuarios anónimos
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.expenses enable row level security;
alter table public.budgets enable row level security;

revoke all on table public.profiles, public.categories, public.expenses, public.budgets from anon;

-- El perfil lo crea el trigger y se borra con la cuenta: solo lectura y edición.
revoke insert, delete on table public.profiles from authenticated;

create policy "Ver mi perfil" on public.profiles
for select to authenticated
using ((select auth.uid()) = id);

create policy "Editar mi perfil" on public.profiles
for update to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

create policy "Ver mis categorías" on public.categories
for select to authenticated
using ((select auth.uid()) = user_id);

create policy "Crear mis categorías" on public.categories
for insert to authenticated
with check ((select auth.uid()) = user_id);

create policy "Editar mis categorías" on public.categories
for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "Borrar mis categorías" on public.categories
for delete to authenticated
using ((select auth.uid()) = user_id);

create policy "Ver mis gastos" on public.expenses
for select to authenticated
using ((select auth.uid()) = user_id);

create policy "Crear mis gastos" on public.expenses
for insert to authenticated
with check ((select auth.uid()) = user_id);

create policy "Editar mis gastos" on public.expenses
for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "Borrar mis gastos" on public.expenses
for delete to authenticated
using ((select auth.uid()) = user_id);

create policy "Ver mis presupuestos" on public.budgets
for select to authenticated
using ((select auth.uid()) = user_id);

create policy "Crear mis presupuestos" on public.budgets
for insert to authenticated
with check ((select auth.uid()) = user_id);

create policy "Editar mis presupuestos" on public.budgets
for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "Borrar mis presupuestos" on public.budgets
for delete to authenticated
using ((select auth.uid()) = user_id);

-- Las funciones internas no se exponen por la API.
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.set_updated_at() from public, anon, authenticated;
