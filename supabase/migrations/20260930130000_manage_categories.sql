-- Gestión de categorías y cuenta.

-- Guarda el orden de las categorías: la posición es el índice en p_ids.
-- security invoker: los ids de otros usuarios no se ven y se ignoran.
create function public.reorder_categories(p_ids uuid[])
returns void
language sql
security invoker
set search_path = ''
as $$
  update public.categories c
  set position = array_position(p_ids, c.id) - 1
  where c.id = any (p_ids);
$$;

-- Borra la cuenta del usuario y, en cascada, todos sus datos.
-- security definer: borrar de auth.users requiere permisos que el usuario no tiene;
-- solo puede borrar su propia fila (auth.uid()).
create function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
begin
  if v_user_id is null then
    raise exception 'No autenticado' using errcode = '42501';
  end if;
  delete from auth.users where id = v_user_id;
end;
$$;

revoke execute on function public.reorder_categories(uuid[]) from public, anon;
grant execute on function public.reorder_categories(uuid[]) to authenticated;
revoke execute on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
