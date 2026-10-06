-- Fallos e ideas que envían los usuarios desde la app. Se leen en el panel de Supabase
-- (Table Editor → feedback). Nadie puede leer los mensajes desde la app, solo enviarlos.

create table public.feedback (
  id uuid primary key default gen_random_uuid(),
  -- Si el usuario borra su cuenta, el mensaje se conserva sin autor.
  user_id uuid default auth.uid() references auth.users (id) on delete set null,
  kind text not null check (kind in ('bug', 'idea', 'other')),
  message text not null check (char_length(btrim(message)) between 3 and 2000),
  -- Para entender el fallo: navegador y dispositivo.
  user_agent text check (char_length(user_agent) <= 300),
  created_at timestamptz not null default now()
);

create index feedback_created_idx on public.feedback (created_at desc);

alter table public.feedback enable row level security;
revoke all on table public.feedback from anon, authenticated;
grant insert on table public.feedback to authenticated;

create policy "Enviar mis mensajes" on public.feedback
for insert to authenticated with check ((select auth.uid()) = user_id);

-- Freno al spam: como mucho 20 mensajes al día por persona.
create function public.feedback_rate_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (
    select count(*) from public.feedback f
    where f.user_id = new.user_id and f.created_at > now() - interval '1 day'
  ) >= 20 then
    raise exception 'Demasiados mensajes' using errcode = '54000';
  end if;
  return new;
end;
$$;

create trigger feedback_rate_limit
before insert on public.feedback
for each row execute function public.feedback_rate_limit();

-- La pantalla de entrada (sin sesión) también enseña si la beta está abierta.
grant select on table public.app_settings to anon;

create policy "Leer los ajustes de la app sin sesión" on public.app_settings
for select to anon using (true);
