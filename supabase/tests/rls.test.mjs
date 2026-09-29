// Aplica las migraciones sobre Postgres (PGlite) simulando Supabase y comprueba RLS.
// Uso: npm run test:db
import { PGlite } from "@electric-sql/pglite"
import { readFileSync, readdirSync } from "node:fs"

const migrationsDir = new URL("../migrations/", import.meta.url)
const db = new PGlite()

// --- Entorno tipo Supabase ---------------------------------------------------
await db.exec(`
  create role anon nologin;
  create role authenticated nologin;
  create role service_role nologin bypassrls;
  create schema auth;
  create table auth.users (
    id uuid primary key default gen_random_uuid(),
    email text,
    raw_user_meta_data jsonb default '{}'::jsonb
  );
  create function auth.uid() returns uuid language sql stable as $$
    select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
  $$;
  grant usage on schema auth to anon, authenticated;
  grant execute on function auth.uid() to anon, authenticated;
  grant usage on schema public to anon, authenticated, service_role;
  alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
  alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
`)

for (const file of readdirSync(migrationsDir)
  .filter((f) => f.endsWith(".sql"))
  .sort()) {
  await db.exec(readFileSync(new URL(file, migrationsDir), "utf8"))
  console.log("migración aplicada:", file)
}

// --- Ayudantes ---------------------------------------------------------------
let passed = 0
let failed = 0
const ok = (name) => {
  passed++
  console.log("  ✔", name)
}
const ko = (name, detail) => {
  failed++
  console.log("  ✘", name, "→", detail)
}
const assert = (condition, name, detail) => (condition ? ok(name) : ko(name, detail))

async function as(role, userId, fn) {
  await db.exec(
    `reset role; select set_config('request.jwt.claim.sub', '${userId ?? ""}', false); set role ${role};`,
  )
  try {
    return await fn()
  } finally {
    await db.exec("reset role;")
  }
}
async function expectRows(name, role, userId, sql, count) {
  const res = await as(role, userId, () => db.query(sql)).catch((e) => ({ error: e.message }))
  if (res.error) return ko(name, res.error)
  assert(res.rows.length === count, name, `esperaba ${count} filas, hay ${res.rows.length}`)
}
async function expectError(name, role, userId, sql, pattern) {
  const res = await as(role, userId, () => db.query(sql)).then(
    () => null,
    (e) => e.message,
  )
  if (res === null) return ko(name, "no dio error")
  assert(pattern.test(res), name, res)
}
async function expectAffected(name, role, userId, sql, count) {
  const res = await as(role, userId, () => db.query(sql)).catch((e) => ({ error: e.message }))
  if (res.error) return ko(name, res.error)
  assert(res.affectedRows === count, name, `esperaba ${count} afectadas, hay ${res.affectedRows}`)
}

// --- Datos ------------------------------------------------------------------
const A = "11111111-1111-1111-1111-111111111111"
const B = "22222222-2222-2222-2222-222222222222"
await db.exec(`
  insert into auth.users (id, email, raw_user_meta_data) values
    ('${A}', 'a@test.es', '{"display_name":"Ana"}'),
    ('${B}', 'b@test.es', '{}');
`)

console.log("\nPerfiles")
const profiles = await db.query(
  "select id, display_name, currency, timezone from public.profiles order by id",
)
assert(
  profiles.rows.length === 2 &&
    profiles.rows[0].display_name === "Ana" &&
    profiles.rows[1].display_name === null,
  "el trigger crea un perfil por usuario con su nombre",
  JSON.stringify(profiles.rows),
)
await expectRows("A solo ve su perfil", "authenticated", A, "select * from public.profiles", 1)
await expectAffected(
  "A puede editar su nombre",
  "authenticated",
  A,
  "update public.profiles set display_name = 'Ana M.'",
  1,
)
await expectAffected(
  "A no puede editar el perfil de B",
  "authenticated",
  A,
  `update public.profiles set display_name = 'x' where id = '${B}'`,
  0,
)
await expectError(
  "A no puede crear perfiles",
  "authenticated",
  A,
  `insert into public.profiles (id) values ('${A}')`,
  /permission denied/,
)
await expectError(
  "A no puede borrar su perfil directamente",
  "authenticated",
  A,
  "delete from public.profiles",
  /permission denied/,
)

console.log("\nCategorías")
await expectAffected(
  "A crea una categoría (user_id por defecto = auth.uid())",
  "authenticated",
  A,
  `insert into public.categories (id, name, emoji, color) values ('aaaaaaaa-0000-0000-0000-000000000001', 'Comida', '🍽️', 'amber')`,
  1,
)
await expectAffected(
  "B crea una categoría",
  "authenticated",
  B,
  `insert into public.categories (id, name, emoji, color) values ('bbbbbbbb-0000-0000-0000-000000000001', 'Ocio', '🍻', 'rose')`,
  1,
)
await expectRows(
  "A solo ve sus categorías",
  "authenticated",
  A,
  "select * from public.categories",
  1,
)
await expectError(
  "A no puede crear categorías a nombre de B",
  "authenticated",
  A,
  `insert into public.categories (user_id, name, emoji, color) values ('${B}', 'Trampa', '💣', 'teal')`,
  /row-level security/,
)
await expectError(
  "no se repite el nombre (sin distinguir mayúsculas)",
  "authenticated",
  A,
  `insert into public.categories (name, emoji, color) values (' comida ', '🍕', 'rose')`,
  /duplicate key/,
)
await expectError(
  "color fuera de la paleta",
  "authenticated",
  A,
  `insert into public.categories (name, emoji, color) values ('Rara', '❓', 'orange')`,
  /check constraint/,
)
await expectAffected(
  "A no puede editar categorías de B",
  "authenticated",
  A,
  `update public.categories set name = 'Hackeada' where id = 'bbbbbbbb-0000-0000-0000-000000000001'`,
  0,
)
await expectError(
  "A no puede pasarse su categoría a B",
  "authenticated",
  A,
  `update public.categories set user_id = '${B}' where id = 'aaaaaaaa-0000-0000-0000-000000000001'`,
  /row-level security/,
)

console.log("\nGastos")
await expectAffected(
  "A apunta un gasto en su categoría",
  "authenticated",
  A,
  `insert into public.expenses (id, category_id, amount_cents, description) values ('eeeeeeee-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 1840, 'La Parra')`,
  1,
)
await expectError(
  "A no puede usar una categoría de B",
  "authenticated",
  A,
  `insert into public.expenses (category_id, amount_cents) values ('bbbbbbbb-0000-0000-0000-000000000001', 100)`,
  /foreign key/,
)
await expectError(
  "importe 0 no permitido",
  "authenticated",
  A,
  `insert into public.expenses (category_id, amount_cents) values ('aaaaaaaa-0000-0000-0000-000000000001', 0)`,
  /check constraint/,
)
await expectError(
  "id repetido no duplica el gasto (idempotencia offline)",
  "authenticated",
  A,
  `insert into public.expenses (id, category_id, amount_cents) values ('eeeeeeee-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 1840)`,
  /duplicate key/,
)
await expectRows("B no ve los gastos de A", "authenticated", B, "select * from public.expenses", 0)
await expectAffected(
  "B no puede borrar gastos de A",
  "authenticated",
  B,
  "delete from public.expenses",
  0,
)
await expectAffected(
  "B no puede editar gastos de A",
  "authenticated",
  B,
  "update public.expenses set amount_cents = 1",
  0,
)
await expectError(
  "no se puede borrar una categoría con gastos (se archiva)",
  "authenticated",
  A,
  "delete from public.categories where id = 'aaaaaaaa-0000-0000-0000-000000000001'",
  /foreign key/,
)
await expectAffected(
  "A puede archivar la categoría",
  "authenticated",
  A,
  "update public.categories set archived_at = now() where id = 'aaaaaaaa-0000-0000-0000-000000000001'",
  1,
)
await expectAffected(
  "con la antigua archivada, se puede reutilizar el nombre",
  "authenticated",
  A,
  `insert into public.categories (id, name, emoji, color) values ('aaaaaaaa-0000-0000-0000-000000000002', 'Comida', '🍽️', 'amber')`,
  1,
)
const before = await db.query("select updated_at from public.expenses")
await new Promise((resolve) => setTimeout(resolve, 20))
const upd = await as("authenticated", A, () =>
  db.query("update public.expenses set note = 'x' returning updated_at"),
)
assert(
  upd.rows[0].updated_at > before.rows[0].updated_at,
  "updated_at se actualiza en cada edición",
  JSON.stringify({ antes: before.rows[0], despues: upd.rows[0] }),
)

console.log("\nPresupuestos")
await expectAffected(
  "A crea su presupuesto total del mes",
  "authenticated",
  A,
  "insert into public.budgets (amount_cents) values (80000)",
  1,
)
await expectError(
  "solo un presupuesto total por usuario",
  "authenticated",
  A,
  "insert into public.budgets (amount_cents) values (1000)",
  /duplicate key/,
)
await expectAffected(
  "A crea un presupuesto por categoría",
  "authenticated",
  A,
  "insert into public.budgets (category_id, amount_cents) values ('aaaaaaaa-0000-0000-0000-000000000002', 15000)",
  1,
)
await expectError(
  "A no puede presupuestar una categoría de B",
  "authenticated",
  A,
  "insert into public.budgets (category_id, amount_cents) values ('bbbbbbbb-0000-0000-0000-000000000001', 1000)",
  /foreign key/,
)
await expectRows(
  "B no ve los presupuestos de A",
  "authenticated",
  B,
  "select * from public.budgets",
  0,
)

console.log("\nAnónimo")
for (const t of ["profiles", "categories", "expenses", "budgets"]) {
  await expectError(
    `anon no puede leer ${t}`,
    "anon",
    null,
    `select * from public.${t}`,
    /permission denied/,
  )
}
await expectError(
  "anon no puede insertar gastos",
  "anon",
  null,
  "insert into public.expenses (category_id, amount_cents) values ('aaaaaaaa-0000-0000-0000-000000000002', 1)",
  /permission denied/,
)
await expectError(
  "anon no puede ejecutar handle_new_user",
  "anon",
  null,
  "select public.handle_new_user()",
  /permission denied|trigger/,
)

console.log("\nBorrado de cuenta")
await db.exec(`delete from auth.users where id = '${A}'`)
const left = await db.query(`select
  (select count(*) from public.profiles where id = '${A}') as p,
  (select count(*) from public.categories where user_id = '${A}') as c,
  (select count(*) from public.expenses where user_id = '${A}') as e,
  (select count(*) from public.budgets where user_id = '${A}') as b,
  (select count(*) from public.categories where user_id = '${B}') as cb`)
const r = left.rows[0]
assert(
  Number(r.p) + Number(r.c) + Number(r.e) + Number(r.b) === 0 && Number(r.cb) === 1,
  "borrar la cuenta elimina todos sus datos y no toca los de otros",
  JSON.stringify(r),
)

console.log(`\n${passed} pruebas correctas, ${failed} fallidas`)
process.exit(failed ? 1 : 0)
