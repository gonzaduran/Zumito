-- Foto de perfil, nombre de usuario, amigos y gastos compartidos.
-- Privacidad: nadie ve los gastos de otro. Solo se comparte lo que se divide y, de
-- los demás, solo el usuario, el nombre y la foto (a través de funciones concretas).

-- ---------------------------------------------------------------------------
-- Perfil: nombre de usuario (@juan) y foto
-- ---------------------------------------------------------------------------

alter table public.profiles
  add column username text check (username ~ '^[a-z0-9_.]{3,20}$'),
  -- Ruta en el bucket "avatars": <id del usuario>/<archivo>. Solo en su propia carpeta.
  add column avatar_path text check (
    avatar_path is null
    or (split_part(avatar_path, '/', 1) = id::text and avatar_path ~ '^[0-9a-f-]{36}/[A-Za-z0-9_.-]{1,80}$')
  );

create unique index profiles_username_key on public.profiles (username);

grant update (username, avatar_path) on table public.profiles to authenticated;

-- Fotos de perfil: se pueden ver con el enlace; cada uno solo sube y borra en su carpeta.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 1048576, array['image/webp', 'image/jpeg', 'image/png'])
on conflict (id) do nothing;

create policy "Subir mi foto" on storage.objects
for insert to authenticated
with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "Cambiar mi foto" on storage.objects
for update to authenticated
using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "Borrar mi foto" on storage.objects
for delete to authenticated
using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- ---------------------------------------------------------------------------
-- Amigos
-- ---------------------------------------------------------------------------

create table public.friendships (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references auth.users (id) on delete cascade,
  addressee_id uuid not null references auth.users (id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted')),
  created_at timestamptz not null default now(),
  accepted_at timestamptz,
  check (requester_id <> addressee_id)
);

-- Una sola relación por pareja, la pida quien la pida.
create unique index friendships_pair_key
on public.friendships (least(requester_id, addressee_id), greatest(requester_id, addressee_id));

alter table public.friendships enable row level security;
revoke all on table public.friendships from anon, authenticated;
grant select, delete on table public.friendships to authenticated;

create policy "Ver mis amistades" on public.friendships
for select to authenticated
using ((select auth.uid()) in (requester_id, addressee_id));
-- Borrar = cancelar, rechazar o dejar de ser amigos (cualquiera de los dos).
create policy "Quitar mis amistades" on public.friendships
for delete to authenticated
using ((select auth.uid()) in (requester_id, addressee_id));

create function public.are_friends(p_a uuid, p_b uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.friendships f
    where f.status = 'accepted'
      and least(f.requester_id, f.addressee_id) = least(p_a, p_b)
      and greatest(f.requester_id, f.addressee_id) = greatest(p_a, p_b)
  );
$$;

-- Buscar por nombre de usuario (desde 3 letras, máximo 10). Solo datos públicos.
create function public.search_users(p_query text)
returns table (id uuid, username text, display_name text, avatar_path text, relation text)
language sql
stable
security definer
set search_path = ''
as $$
  select p.id, p.username, p.display_name, p.avatar_path,
    case
      when f.status = 'accepted' then 'friend'
      when f.requester_id = (select auth.uid()) then 'sent'
      when f.addressee_id = (select auth.uid()) then 'received'
      else 'none'
    end
  from public.profiles p
  left join public.friendships f
    on least(f.requester_id, f.addressee_id) = least(p.id, (select auth.uid()))
   and greatest(f.requester_id, f.addressee_id) = greatest(p.id, (select auth.uid()))
  where (select auth.uid()) is not null
    and char_length(btrim(coalesce(p_query, ''))) >= 3
    and p.username like replace(replace(replace(lower(btrim(p_query)), '\', '\\'), '%', '\%'), '_', '\_') || '%'
    and p.id <> (select auth.uid())
  order by p.username
  limit 10;
$$;

-- Enviar solicitud. Si la otra persona ya me la había enviado, quedamos como amigos.
create function public.send_friend_request(p_user_id uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_me uuid := (select auth.uid());
  v_existing public.friendships;
begin
  if v_me is null then
    raise exception 'No autenticado' using errcode = '42501';
  end if;
  if p_user_id = v_me or not exists (select 1 from public.profiles p where p.id = p_user_id) then
    raise exception 'Usuario no válido' using errcode = '22023';
  end if;

  select * into v_existing from public.friendships f
  where least(f.requester_id, f.addressee_id) = least(v_me, p_user_id)
    and greatest(f.requester_id, f.addressee_id) = greatest(v_me, p_user_id);

  if v_existing.id is null then
    insert into public.friendships (requester_id, addressee_id) values (v_me, p_user_id);
    return 'sent';
  end if;
  if v_existing.status = 'pending' and v_existing.addressee_id = v_me then
    update public.friendships set status = 'accepted', accepted_at = now() where id = v_existing.id;
    return 'friend';
  end if;
  return case when v_existing.status = 'accepted' then 'friend' else 'sent' end;
end;
$$;

-- Aceptar una solicitud recibida.
create function public.accept_friend_request(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.friendships
  set status = 'accepted', accepted_at = now()
  where requester_id = p_user_id and addressee_id = (select auth.uid()) and status = 'pending';
  if not found then
    raise exception 'Solicitud no encontrada' using errcode = '22023';
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- Gastos compartidos y saldos
-- ---------------------------------------------------------------------------

create table public.shared_expenses (
  id uuid primary key,
  created_by uuid not null references auth.users (id) on delete cascade,
  payer_id uuid not null references auth.users (id) on delete cascade,
  description text check (char_length(description) <= 80),
  amount_cents bigint not null check (amount_cents > 0 and amount_cents <= 100000000),
  spent_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table public.shared_expense_shares (
  shared_expense_id uuid not null references public.shared_expenses (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  share_cents bigint not null check (share_cents > 0),
  primary key (shared_expense_id, user_id)
);

create index shared_expense_shares_user_idx on public.shared_expense_shares (user_id);

-- La parte de cada uno es un gasto normal en su app, enlazado al gasto compartido.
alter table public.expenses
  add column shared_expense_id uuid references public.shared_expenses (id) on delete cascade;

create index expenses_shared_idx on public.expenses (shared_expense_id);

create table public.settlements (
  id uuid primary key default gen_random_uuid(),
  -- Quien paga lo que debía y quien lo recibe.
  from_user uuid not null references auth.users (id) on delete cascade,
  to_user uuid not null references auth.users (id) on delete cascade,
  amount_cents bigint not null check (amount_cents > 0 and amount_cents <= 100000000),
  created_by uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  check (from_user <> to_user)
);

create function public.is_shared_participant(p_shared_expense_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.shared_expense_shares s
    where s.shared_expense_id = p_shared_expense_id and s.user_id = (select auth.uid())
  );
$$;

alter table public.shared_expenses enable row level security;
alter table public.shared_expense_shares enable row level security;
alter table public.settlements enable row level security;
revoke all on table public.shared_expenses, public.shared_expense_shares, public.settlements
  from anon, authenticated;
grant select on table public.shared_expenses, public.shared_expense_shares, public.settlements
  to authenticated;

create policy "Ver los gastos compartidos en los que participo" on public.shared_expenses
for select to authenticated using (public.is_shared_participant(id));
create policy "Ver las partes de mis gastos compartidos" on public.shared_expense_shares
for select to authenticated using (public.is_shared_participant(shared_expense_id));
create policy "Ver mis pagos entre amigos" on public.settlements
for select to authenticated using ((select auth.uid()) in (from_user, to_user));

-- Crea un gasto compartido y apunta a cada participante su parte como gasto propio.
-- p_shares: [{ "user_id", "share_cents" }] (incluido quien lo crea). La suma = el total.
-- Quien pagó debe ser amigo de todos los demás. Al amigo se le apunta en su categoría
-- con el mismo nombre (o la primera que tenga) y en su cuenta principal.
create function public.create_shared_expense(
  p_id uuid,
  p_description text,
  p_amount_cents bigint,
  p_spent_at timestamptz,
  p_category_id uuid,
  p_account_id uuid,
  p_payer_id uuid,
  p_shares jsonb
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_me uuid := (select auth.uid());
  v_category_name text;
  v_share record;
  v_count integer;
  v_total bigint;
  v_category uuid;
begin
  if v_me is null then
    raise exception 'No autenticado' using errcode = '42501';
  end if;
  if exists (select 1 from public.shared_expenses s where s.id = p_id) then
    return; -- Reintento: ya está creado.
  end if;
  if jsonb_typeof(p_shares) <> 'array' then
    raise exception 'Formato no válido' using errcode = '22023';
  end if;

  select count(*), coalesce(sum((s.value ->> 'share_cents')::bigint), 0)
  into v_count, v_total
  from jsonb_array_elements(p_shares) as s (value);
  if v_count < 2 or v_count > 20 then
    raise exception 'Entre 2 y 20 personas' using errcode = '22023';
  end if;
  if (select count(distinct value ->> 'user_id') from jsonb_array_elements(p_shares)) <> v_count then
    raise exception 'Persona repetida' using errcode = '22023';
  end if;
  if v_total <> p_amount_cents then
    raise exception 'Las partes no suman el total' using errcode = '22023';
  end if;
  if not exists (
    select 1 from jsonb_array_elements(p_shares) s where (s.value ->> 'user_id')::uuid = v_me
  ) then
    raise exception 'Tienes que participar en el gasto' using errcode = '22023';
  end if;
  if not exists (
    select 1 from jsonb_array_elements(p_shares) s where (s.value ->> 'user_id')::uuid = p_payer_id
  ) then
    raise exception 'Quien paga tiene que participar' using errcode = '22023';
  end if;
  if exists (
    select 1 from jsonb_array_elements(p_shares) s
    where (s.value ->> 'user_id')::uuid <> v_me
      and not public.are_friends(v_me, (s.value ->> 'user_id')::uuid)
  ) then
    raise exception 'Solo puedes compartir con tus amigos' using errcode = '42501';
  end if;
  if exists (
    select 1 from jsonb_array_elements(p_shares) s
    where (s.value ->> 'user_id')::uuid <> p_payer_id
      and not public.are_friends(p_payer_id, (s.value ->> 'user_id')::uuid)
  ) then
    raise exception 'Quien paga tiene que ser amigo de todos' using errcode = '42501';
  end if;

  select c.name into v_category_name
  from public.categories c where c.id = p_category_id and c.user_id = v_me;
  if v_category_name is null then
    raise exception 'Categoría no válida' using errcode = '22023';
  end if;

  insert into public.shared_expenses (id, created_by, payer_id, description, amount_cents, spent_at)
  values (p_id, v_me, p_payer_id, nullif(btrim(p_description), ''), p_amount_cents, p_spent_at);

  for v_share in
    select (s.value ->> 'user_id')::uuid as user_id, (s.value ->> 'share_cents')::bigint as cents
    from jsonb_array_elements(p_shares) as s (value)
  loop
    insert into public.shared_expense_shares (shared_expense_id, user_id, share_cents)
    values (p_id, v_share.user_id, v_share.cents);

    if v_share.user_id = v_me then
      v_category := p_category_id;
    else
      select c.id into v_category from public.categories c
      where c.user_id = v_share.user_id and c.archived_at is null
      order by (lower(btrim(c.name)) = lower(btrim(v_category_name))) desc, c.position
      limit 1;
    end if;

    -- Quien aún no tiene categorías (no ha hecho el onboarding) no recibe gasto, pero la
    -- deuda cuenta igual.
    if v_category is not null then
      insert into public.expenses (
        user_id, category_id, amount_cents, description, spent_at, account_id, shared_expense_id
      )
      values (
        v_share.user_id, v_category, v_share.cents, nullif(btrim(p_description), ''), p_spent_at,
        case when v_share.user_id = v_me then p_account_id end, p_id
      );
    end if;
  end loop;
end;
$$;

-- Borrar un gasto compartido (solo quien lo creó): desaparece para todos.
create function public.delete_shared_expense(p_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.shared_expenses where id = p_id and created_by = (select auth.uid());
  if not found then
    raise exception 'Solo quien lo creó puede borrarlo' using errcode = '42501';
  end if;
end;
$$;

-- Saldo con cada amigo: positivo = te debe; negativo = le debes.
create function public.friend_balances()
returns table (friend_id uuid, balance_cents bigint)
language sql
stable
security definer
set search_path = ''
as $$
  with me as (select (select auth.uid()) as id),
  friends as (
    select case when f.requester_id = me.id then f.addressee_id else f.requester_id end as id
    from public.friendships f, me
    where f.status = 'accepted' and me.id in (f.requester_id, f.addressee_id)
  )
  select fr.id,
    (
      coalesce((
        select sum(s.share_cents) from public.shared_expenses e
        join public.shared_expense_shares s on s.shared_expense_id = e.id
        where e.payer_id = me.id and s.user_id = fr.id
      ), 0)
      - coalesce((
        select sum(s.share_cents) from public.shared_expenses e
        join public.shared_expense_shares s on s.shared_expense_id = e.id
        where e.payer_id = fr.id and s.user_id = me.id
      ), 0)
      - coalesce((
        select sum(t.amount_cents) from public.settlements t where t.from_user = fr.id and t.to_user = me.id
      ), 0)
      + coalesce((
        select sum(t.amount_cents) from public.settlements t where t.from_user = me.id and t.to_user = fr.id
      ), 0)
    )::bigint
  from friends fr, me;
$$;

-- Amigos y solicitudes con sus datos públicos y el saldo.
create function public.my_friends()
returns table (
  id uuid,
  username text,
  display_name text,
  avatar_path text,
  relation text,
  balance_cents bigint
)
language sql
stable
security definer
set search_path = ''
as $$
  select p.id, p.username, p.display_name, p.avatar_path,
    case
      when f.status = 'accepted' then 'friend'
      when f.requester_id = (select auth.uid()) then 'sent'
      else 'received'
    end,
    coalesce(b.balance_cents, 0)
  from public.friendships f
  join public.profiles p
    on p.id = case when f.requester_id = (select auth.uid()) then f.addressee_id else f.requester_id end
  left join public.friend_balances() b on b.friend_id = p.id
  where (select auth.uid()) in (f.requester_id, f.addressee_id)
  order by f.status desc, coalesce(p.display_name, p.username);
$$;

-- Saldar: registra el pago que deja el saldo con ese amigo a cero.
create function public.settle_up(p_friend_id uuid)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_me uuid := (select auth.uid());
  v_balance bigint;
begin
  if v_me is null or not public.are_friends(v_me, p_friend_id) then
    raise exception 'Solo con tus amigos' using errcode = '42501';
  end if;
  select b.balance_cents into v_balance from public.friend_balances() b where b.friend_id = p_friend_id;
  if coalesce(v_balance, 0) = 0 then
    return 0;
  end if;
  insert into public.settlements (from_user, to_user, amount_cents, created_by)
  values (
    case when v_balance > 0 then p_friend_id else v_me end,
    case when v_balance > 0 then v_me else p_friend_id end,
    abs(v_balance),
    v_me
  );
  return v_balance;
end;
$$;

-- Gastos compartidos con un amigo (los más recientes primero).
create function public.shared_with_friend(p_friend_id uuid, p_limit integer default 50)
returns table (
  id uuid,
  description text,
  amount_cents bigint,
  spent_at timestamptz,
  payer_id uuid,
  created_by uuid,
  my_share_cents bigint,
  friend_share_cents bigint
)
language sql
stable
security definer
set search_path = ''
as $$
  select e.id, e.description, e.amount_cents, e.spent_at, e.payer_id, e.created_by,
    mine.share_cents, theirs.share_cents
  from public.shared_expenses e
  join public.shared_expense_shares mine
    on mine.shared_expense_id = e.id and mine.user_id = (select auth.uid())
  join public.shared_expense_shares theirs
    on theirs.shared_expense_id = e.id and theirs.user_id = p_friend_id
  order by e.spent_at desc
  limit least(greatest(coalesce(p_limit, 50), 1), 200);
$$;

revoke execute on function public.are_friends(uuid, uuid) from public, anon, authenticated;
revoke execute on function public.is_shared_participant(uuid) from public, anon;
grant execute on function public.is_shared_participant(uuid) to authenticated;
revoke execute on function public.search_users(text) from public, anon;
grant execute on function public.search_users(text) to authenticated;
revoke execute on function public.send_friend_request(uuid) from public, anon;
grant execute on function public.send_friend_request(uuid) to authenticated;
revoke execute on function public.accept_friend_request(uuid) from public, anon;
grant execute on function public.accept_friend_request(uuid) to authenticated;
revoke execute on function public.create_shared_expense(uuid, text, bigint, timestamptz, uuid, uuid, uuid, jsonb) from public, anon;
grant execute on function public.create_shared_expense(uuid, text, bigint, timestamptz, uuid, uuid, uuid, jsonb) to authenticated;
revoke execute on function public.delete_shared_expense(uuid) from public, anon;
grant execute on function public.delete_shared_expense(uuid) to authenticated;
revoke execute on function public.friend_balances() from public, anon;
grant execute on function public.friend_balances() to authenticated;
revoke execute on function public.my_friends() from public, anon;
grant execute on function public.my_friends() to authenticated;
revoke execute on function public.settle_up(uuid) from public, anon;
grant execute on function public.settle_up(uuid) to authenticated;
revoke execute on function public.shared_with_friend(uuid, integer) from public, anon;
grant execute on function public.shared_with_friend(uuid, integer) to authenticated;


-- ---------------------------------------------------------------------------
-- Historial: qué gastos son compartidos, si los creé yo y con quién
-- ---------------------------------------------------------------------------

-- Nombres de los demás participantes ("Juan, Marta"). Solo para quien participa.
create function public.shared_names(p_shared_expense_id uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select string_agg(coalesce(p.display_name, p.username, '?'), ', ' order by coalesce(p.display_name, p.username))
  from public.shared_expense_shares s
  join public.profiles p on p.id = s.user_id
  where s.shared_expense_id = p_shared_expense_id
    and s.user_id <> (select auth.uid())
    and public.is_shared_participant(p_shared_expense_id);
$$;

revoke execute on function public.shared_names(uuid) from public, anon;
grant execute on function public.shared_names(uuid) to authenticated;

drop function public.search_expenses(text, uuid, uuid, uuid, bigint, bigint, integer, uuid);

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
  account_id uuid,
  shared_expense_id uuid,
  shared_mine boolean,
  shared_with text
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
      e.place_id, pl.name as place_name, e.mood, e.account_id, e.shared_expense_id,
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
    m.account_id,
    m.shared_expense_id,
    exists (
      select 1 from public.shared_expenses s
      where s.id = m.shared_expense_id and s.created_by = (select auth.uid())
    ),
    public.shared_names(m.shared_expense_id)
  from matches m
  order by m.spent_at desc, m.id
  limit least(greatest(coalesce(p_limit, 50), 1), 500);
$$;

revoke execute on function public.search_expenses(text, uuid, uuid, uuid, bigint, bigint, integer, uuid) from public, anon;
grant execute on function public.search_expenses(text, uuid, uuid, uuid, bigint, bigint, integer, uuid) to authenticated;
