-- Onboarding: marca de finalización y guardado atómico de nombre y categorías.

alter table public.profiles add column onboarded_at timestamptz;

-- Se ejecuta con los permisos del usuario (security invoker), así que RLS sigue aplicando.
-- Si el usuario ya completó el onboarding, no hace nada (reintentos seguros).
create function public.complete_onboarding(p_display_name text, p_categories jsonb)
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

  if jsonb_typeof(p_categories) <> 'array' or jsonb_array_length(p_categories) = 0 then
    raise exception 'Se necesita al menos una categoría' using errcode = '22023';
  end if;

  if exists (
    select 1 from public.profiles where id = v_user_id and onboarded_at is not null
  ) then
    return;
  end if;

  insert into public.categories (user_id, name, emoji, color, position)
  select v_user_id, c.value ->> 'name', c.value ->> 'emoji', c.value ->> 'color', (c.ordinality - 1)::integer
  from jsonb_array_elements(p_categories) with ordinality as c (value, ordinality);

  update public.profiles
  set display_name = nullif(btrim(p_display_name), ''),
      onboarded_at = now()
  where id = v_user_id;
end;
$$;

revoke execute on function public.complete_onboarding(text, jsonb) from public, anon;
grant execute on function public.complete_onboarding(text, jsonb) to authenticated;
