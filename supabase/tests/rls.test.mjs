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
// Las pruebas de límites de Premium se hacen con la beta cerrada (se prueba aparte al final).
await db.exec("update public.app_settings set beta_open = false")

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
// A es Fundadora (Premium): puede usar presupuestos por categoría.
await db.exec(`update public.profiles set premium_comp = true where id = '${A}'`)

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

console.log("\nOnboarding")
const C = "33333333-3333-3333-3333-333333333333"
await db.exec(`insert into auth.users (id, email) values ('${C}', 'c@test.es')`)
const onboardingCats = JSON.stringify([
  { name: "Comida", emoji: "🍽️", color: "amber" },
  { name: "Ocio", emoji: "🍻", color: "rose" },
])
const callOnboarding = (name, cats) =>
  `select public.complete_onboarding(${name === null ? "null" : `'${name}'`}, '${cats}'::jsonb)`
await expectError(
  "anon no puede completar el onboarding",
  "anon",
  null,
  callOnboarding("X", onboardingCats),
  /permission denied/,
)
await expectError(
  "el onboarding exige al menos una categoría",
  "authenticated",
  C,
  callOnboarding("Carla", "[]"),
  /al menos una categoría/,
)
await expectError(
  "el onboarding es atómico: un color inválido no deja nada a medias",
  "authenticated",
  C,
  callOnboarding(
    "Carla",
    JSON.stringify([
      { name: "Comida", emoji: "🍽️", color: "amber" },
      { name: "Mala", emoji: "❓", color: "orange" },
    ]),
  ),
  /check constraint/,
)
await expectRows(
  "tras el error no quedan categorías",
  "authenticated",
  C,
  "select * from public.categories",
  0,
)
await expectRows(
  "C completa el onboarding",
  "authenticated",
  C,
  callOnboarding("  Carla  ", onboardingCats),
  1,
)
const onboarded = await as("authenticated", C, () =>
  db.query("select display_name, onboarded_at from public.profiles"),
)
assert(
  onboarded.rows[0].display_name === "Carla" && onboarded.rows[0].onboarded_at !== null,
  "guarda el nombre recortado y marca el onboarding como hecho",
  JSON.stringify(onboarded.rows),
)
const cats = await as("authenticated", C, () =>
  db.query("select name, position from public.categories order by position"),
)
assert(
  cats.rows.map((r) => `${r.position}:${r.name}`).join(",") === "0:Comida,1:Ocio",
  "crea las categorías en el orden elegido",
  JSON.stringify(cats.rows),
)
await expectRows(
  "repetir el onboarding no duplica nada",
  "authenticated",
  C,
  callOnboarding("Otra", onboardingCats),
  1,
)
await expectRows(
  "sigue habiendo 2 categorías",
  "authenticated",
  C,
  "select * from public.categories",
  2,
)
await expectRows(
  "las categorías de C no son visibles para B",
  "authenticated",
  B,
  "select * from public.categories where name = 'Comida'",
  0,
)

console.log("\nTotales por periodo (expense_summary)")
const D = "44444444-4444-4444-4444-444444444444"
await db.exec(`insert into auth.users (id, email) values ('${D}', 'd@test.es')`)
await db.exec(`update public.profiles set premium_comp = true where id = '${D}'`)
await as("authenticated", D, () =>
  db.exec(`
    insert into public.categories (id, name, emoji, color)
    values ('dddddddd-0000-0000-0000-000000000001', 'Comida', '🍽️', 'amber');
    -- Inicio del día de hoy en Madrid, como timestamptz.
    with d as (select (date_trunc('day', now() at time zone 'Europe/Madrid') at time zone 'Europe/Madrid') as start_today)
    insert into public.expenses (category_id, amount_cents, spent_at)
    select 'dddddddd-0000-0000-0000-000000000001', v.amount, v.at from d, lateral (values
      (100::bigint, d.start_today + interval '30 minutes'),   -- hoy 00:30 (22:30 UTC de ayer)
      (200::bigint, d.start_today - interval '30 minutes'),   -- ayer 23:30
      (400::bigint, d.start_today - interval '400 days')      -- hace más de un año
    ) as v(amount, at);
  `),
)
const summary = async () =>
  (await as("authenticated", D, () => db.query("select * from public.expense_summary()"))).rows[0]
let s = await summary()
assert(
  Number(s.today_cents) === 100,
  "hoy cuenta el gasto de las 00:30 locales y no el de ayer a las 23:30",
  JSON.stringify(s),
)
assert(Number(s.total_cents) === 700, "el total suma todos los gastos", JSON.stringify(s))
assert(
  Number(s.month_cents) >= 100 &&
    Number(s.month_cents) <= 300 &&
    Number(s.week_cents) <= Number(s.month_cents) + 200,
  "semana y mes no incluyen el gasto de hace un año",
  JSON.stringify(s),
)
await as("authenticated", D, () =>
  db.exec("update public.profiles set timezone = 'Pacific/Kiritimati'"),
)
s = await summary()
assert(
  Number(s.total_cents) === 700,
  "cambiar la zona horaria no cambia el total",
  JSON.stringify(s),
)
await as("authenticated", D, () => db.exec("update public.profiles set timezone = 'Europe/Madrid'"))
const summaryB = (
  await as("authenticated", B, () => db.query("select * from public.expense_summary()"))
).rows[0]
assert(Number(summaryB.total_cents) === 0, "B no suma los gastos de D", JSON.stringify(summaryB))
await expectError(
  "anon no puede pedir totales",
  "anon",
  null,
  "select * from public.expense_summary()",
  /permission denied/,
)

console.log("\nHistorial (search_expenses)")
await as("authenticated", D, () =>
  db.exec(`
    insert into public.categories (id, name, emoji, color)
    values ('dddddddd-0000-0000-0000-000000000002', 'Ocio', '🍻', 'rose');
    insert into public.expenses (category_id, amount_cents, description, note, spent_at) values
      ('dddddddd-0000-0000-0000-000000000002', 1500, 'Cine 100%', null, now() - interval '1 minute'),
      ('dddddddd-0000-0000-0000-000000000002', 2500, 'Cena', 'con_Marta', now() - interval '2 minutes');
  `),
)
const search = async (args) =>
  (await as("authenticated", D, () => db.query(`select * from public.search_expenses(${args})`)))
    .rows
let rowsFound = await search("")
assert(
  rowsFound.length === 5,
  "sin filtros devuelve todos los gastos del usuario",
  rowsFound.length,
)
assert(
  rowsFound.every((r, i, all) => i === 0 || all[i - 1].spent_at >= r.spent_at),
  "ordenados del más reciente al más antiguo",
  JSON.stringify(rowsFound.map((r) => r.spent_at)),
)
rowsFound = await search("p_category_id => 'dddddddd-0000-0000-0000-000000000002'")
assert(rowsFound.length === 2, "filtra por categoría", rowsFound.length)
rowsFound = await search("p_query => 'CENA'")
assert(
  rowsFound.length === 1 && rowsFound[0].description === "Cena",
  "busca sin distinguir mayúsculas",
  JSON.stringify(rowsFound),
)
rowsFound = await search("p_query => 'marta'")
assert(rowsFound.length === 1, "busca también en la nota", rowsFound.length)
rowsFound = await search("p_query => 'comida'")
assert(rowsFound.length === 3, "busca también por nombre de categoría", rowsFound.length)
rowsFound = await search("p_query => '100%'")
assert(rowsFound.length === 1, "el % se busca literalmente", rowsFound.length)
rowsFound = await search("p_query => '_'")
assert(rowsFound.length === 1, "el _ se busca literalmente", rowsFound.length)
rowsFound = await search("p_limit => 1")
const today = rowsFound[0]
const allToday = (await search("")).filter((r) => String(r.day) === String(today.day))
assert(
  rowsFound.length === 1 &&
    Number(today.day_total_cents) === allToday.reduce((a, r) => a + Number(r.amount_cents), 0),
  "el total del día cuenta todos los gastos del día aunque se pidan menos",
  JSON.stringify({ today, allToday: allToday.length }),
)
const other = (
  await as("authenticated", B, () => db.query("select * from public.search_expenses()"))
).rows
assert(
  other.every((r) => r.category_name !== "Ocio"),
  "B no ve el historial de D",
  other.length,
)
await expectError(
  "anon no puede buscar",
  "anon",
  null,
  "select * from public.search_expenses()",
  /permission denied/,
)

console.log("\nEstadísticas")
const localToday = (await db.query("select (now() at time zone 'Europe/Madrid')::date as d"))
  .rows[0].d
const iso = (d) => new Date(d).toISOString().slice(0, 10)
const byCategory = async (from, to) =>
  (
    await as("authenticated", D, () =>
      db.query(`select * from public.spending_by_category('${from}', '${to}')`),
    )
  ).rows
const todayIso = iso(localToday)
const tomorrowIso = iso(new Date(new Date(localToday).getTime() + 86400000))
let statCats = await byCategory(todayIso, tomorrowIso)
// Hoy (D): Comida 100 (00:30) y Ocio 1500 + 2500.
assert(
  statCats.map((c) => `${c.name}:${c.total_cents}:${c.expense_count}`).join(",") ===
    "Ocio:4000:2,Comida:100:1",
  "suma por categoría de mayor a menor y cuenta los gastos",
  JSON.stringify(statCats),
)
statCats = await byCategory("2000-01-01", todayIso)
assert(
  statCats.length === 1 && statCats[0].name === "Comida" && Number(statCats[0].total_cents) === 600,
  "el final del rango no se incluye",
  JSON.stringify(statCats),
)
await as("authenticated", D, () =>
  db.exec(
    "update public.categories set archived_at = now() where id = 'dddddddd-0000-0000-0000-000000000002'",
  ),
)
statCats = await byCategory(todayIso, tomorrowIso)
assert(
  statCats.some((c) => c.name === "Ocio"),
  "las categorías archivadas siguen contando",
  JSON.stringify(statCats),
)
const months = (
  await as("authenticated", D, () => db.query("select * from public.spending_by_month(6)"))
).rows
assert(months.length === 6, "devuelve 6 meses aunque alguno esté vacío", months.length)
assert(
  iso(months[5].month) === `${todayIso.slice(0, 7)}-01` &&
    months.every((m, i) => i === 0 || iso(m.month) > iso(months[i - 1].month)),
  "en orden y terminando en el mes actual",
  JSON.stringify(months.map((m) => iso(m.month))),
)
assert(
  Number(months[5].total_cents) >= 4100 &&
    months.slice(0, 4).every((m) => Number(m.total_cents) === 0),
  "el mes actual suma sus gastos y los meses sin gastos van a 0",
  JSON.stringify(months),
)
const monthsB = (
  await as("authenticated", B, () => db.query("select * from public.spending_by_month(3)"))
).rows
assert(
  monthsB.every((m) => Number(m.total_cents) === 0),
  "B no suma los gastos de D",
  JSON.stringify(monthsB),
)
await expectError(
  "anon no puede pedir estadísticas",
  "anon",
  null,
  "select * from public.spending_by_month()",
  /permission denied/,
)

console.log("\nPresupuestos del mes")
const setBudgets = (userId, list) =>
  as("authenticated", userId, () =>
    db.query(`select public.set_budgets('${JSON.stringify(list)}'::jsonb)`),
  )
const budgetStatus = async (userId) =>
  (await as("authenticated", userId, () => db.query("select * from public.budget_status()"))).rows
await setBudgets(D, [
  { category_id: null, amount_cents: 10000 },
  { category_id: "dddddddd-0000-0000-0000-000000000001", amount_cents: 500 },
])
let status = await budgetStatus(D)
assert(
  status.length === 2 && status[0].category_id === null && status[1].name === "Comida",
  "guarda el total y el de categoría (el total primero)",
  JSON.stringify(status),
)
// Mes en curso de D: Comida 100 (hoy) + Ocio 4000 (hoy); el de ayer 23:30 puede ser de este mes o del anterior.
const comida = status[1]
assert(
  Number(comida.spent_cents) >= 100 && Number(comida.spent_cents) <= 300,
  "lo gastado en la categoría es solo de este mes",
  JSON.stringify(comida),
)
assert(
  Number(status[0].spent_cents) >= 4100 && Number(status[0].spent_cents) <= 4300,
  "el total cuenta todas las categorías, también las archivadas",
  JSON.stringify(status[0]),
)
await setBudgets(D, [{ category_id: null, amount_cents: 20000 }])
status = await budgetStatus(D)
assert(
  status.length === 1 && Number(status[0].amount_cents) === 20000,
  "guardar de nuevo sustituye y borra lo que ya no está",
  JSON.stringify(status),
)
await expectError(
  "no se pueden repetir categorías y no queda nada a medias",
  "authenticated",
  D,
  `select public.set_budgets('${JSON.stringify([
    { category_id: "dddddddd-0000-0000-0000-000000000001", amount_cents: 100 },
    { category_id: "dddddddd-0000-0000-0000-000000000001", amount_cents: 200 },
  ])}'::jsonb)`,
  /duplicate key/,
)
status = await budgetStatus(D)
assert(
  status.length === 1 && Number(status[0].amount_cents) === 20000,
  "tras el error siguen los de antes",
  JSON.stringify(status),
)
await expectError(
  "no se puede presupuestar la categoría de otro usuario",
  "authenticated",
  D,
  `select public.set_budgets('${JSON.stringify([
    { category_id: "bbbbbbbb-0000-0000-0000-000000000001", amount_cents: 100 },
  ])}'::jsonb)`,
  /foreign key/,
)
assert((await budgetStatus(B)).length === 0, "B no ve los presupuestos de D", "")
await expectError(
  "anon no puede ver presupuestos",
  "anon",
  null,
  "select * from public.budget_status()",
  /permission denied/,
)

console.log("\nDetalles del gasto: lugar, personas y ánimo")
const F = "66666666-6666-6666-6666-666666666666"
await db.exec(`insert into auth.users (id, email) values ('${F}', 'f@test.es')`)
await as("authenticated", F, () =>
  db.exec(`insert into public.categories (id, name, emoji, color)
    values ('ffffffff-0000-0000-0000-000000000001', 'Comida', '🍽️', 'amber')`),
)
const saveExpense = (userId, args) =>
  as("authenticated", userId, () =>
    db.query(
      `select public.save_expense(
        p_id => $1, p_category_id => $2, p_amount_cents => $3, p_spent_at => now(),
        p_description => $4, p_note => $5, p_place => $6, p_mood => $7,
        p_person_ids => $8::uuid[], p_new_people => $9::text[])`,
      [
        args.id,
        args.category ?? "ffffffff-0000-0000-0000-000000000001",
        args.amount ?? 1000,
        args.description ?? null,
        args.note ?? null,
        args.place ?? null,
        args.mood ?? null,
        args.personIds ?? [],
        args.newPeople ?? [],
      ],
    ),
  )
const X1 = "f1f1f1f1-0000-4000-8000-000000000001"
await saveExpense(F, {
  id: X1,
  amount: 2350,
  description: "Cena",
  note: "Cumple",
  place: "  La Parra ",
  mood: "good",
  newPeople: ["Marta", "Luis", "marta"],
})
let saved = (
  await as("authenticated", F, () =>
    db.query(`select e.amount_cents, e.mood, e.note, pl.name as place,
      (select array_agg(p.name order by p.name) from public.expense_people ep
         join public.people p on p.id = ep.person_id where ep.expense_id = e.id) as people
      from public.expenses e left join public.places pl on pl.id = e.place_id where e.id = '${X1}'`),
  )
).rows[0]
assert(
  saved?.amount_cents == 2350 &&
    saved.mood === "good" &&
    saved.place === "La Parra" &&
    saved.note === "Cumple",
  "guarda el gasto con lugar (recortado), nota y ánimo",
  JSON.stringify(saved),
)
assert(
  JSON.stringify(saved?.people) === JSON.stringify(["Luis", "Marta"]),
  "crea las personas nuevas sin duplicar (Marta y marta son la misma)",
  JSON.stringify(saved?.people),
)
const X2 = "f1f1f1f1-0000-4000-8000-000000000002"
await saveExpense(F, { id: X2, amount: 500, place: "la parra" })
const placesF = (await as("authenticated", F, () => db.query("select name from public.places")))
  .rows
assert(
  placesF.length === 1,
  "reutiliza el lugar sin distinguir mayúsculas",
  JSON.stringify(placesF),
)
const marta = (
  await as("authenticated", F, () => db.query("select id from public.people where name = 'Marta'"))
).rows[0].id
await saveExpense(F, { id: X1, amount: 2400, place: "Casa", personIds: [marta] })
saved = (
  await as("authenticated", F, () =>
    db.query(`select e.amount_cents, e.mood, pl.name as place,
      (select count(*) from public.expense_people ep where ep.expense_id = e.id) as people
      from public.expenses e left join public.places pl on pl.id = e.place_id where e.id = '${X1}'`),
  )
).rows[0]
assert(
  saved.amount_cents == 2400 &&
    saved.place === "Casa" &&
    Number(saved.people) === 1 &&
    saved.mood === null,
  "guardar el mismo id actualiza (no duplica) y sustituye las personas",
  JSON.stringify(saved),
)
const countF = (
  await as("authenticated", F, () => db.query("select count(*) from public.expenses"))
).rows[0]
assert(Number(countF.count) === 2, "sigue habiendo 2 gastos", countF.count)
await expectError(
  "ánimo fuera de los valores permitidos",
  "authenticated",
  F,
  `select public.save_expense('f1f1f1f1-0000-4000-8000-000000000003', 'ffffffff-0000-0000-0000-000000000001', 100, now(), p_mood => 'eufórico')`,
  /check constraint/,
)
await expectError(
  "el gasto es atómico: con un error no se crea el lugar",
  "authenticated",
  F,
  `select public.save_expense('f1f1f1f1-0000-4000-8000-000000000004', 'ffffffff-0000-0000-0000-000000000001', 0, now(), p_place => 'Lugar fantasma')`,
  /check constraint/,
)
await expectRows(
  "tras el error no existe ese lugar",
  "authenticated",
  F,
  "select * from public.places where name = 'Lugar fantasma'",
  0,
)
await expectError(
  "no puede usar las personas de otro usuario",
  "authenticated",
  B,
  `select public.save_expense('b1b1b1b1-0000-4000-8000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', 100, now(), p_person_ids => array['${marta}']::uuid[])`,
  /foreign key/,
)
await expectError(
  "no puede sobrescribir el gasto de otro usuario con su id",
  "authenticated",
  B,
  `select public.save_expense('${X1}', 'bbbbbbbb-0000-0000-0000-000000000001', 1, now())`,
  /row-level security|duplicate key/,
)
const stillF = (await db.query(`select amount_cents from public.expenses where id = '${X1}'`))
  .rows[0]
assert(stillF.amount_cents == 2400, "y el gasto ajeno queda intacto", JSON.stringify(stillF))
await expectError(
  "no admite más de 20 personas",
  "authenticated",
  F,
  `select public.save_expense('f1f1f1f1-0000-4000-8000-000000000005', 'ffffffff-0000-0000-0000-000000000001', 100, now(), p_new_people => array(select 'P' || g from generate_series(1, 21) g))`,
  /Demasiadas personas/,
)
for (const table of ["places", "people", "expense_people"]) {
  await expectRows(`B no ve ${table} de F`, "authenticated", B, `select * from public.${table}`, 0)
  await expectError(
    `anon no puede leer ${table}`,
    "anon",
    null,
    `select * from public.${table}`,
    /permission denied/,
  )
}
await expectAffected(
  "B no puede borrar las personas de F",
  "authenticated",
  B,
  "delete from public.people",
  0,
)
await expectAffected(
  "B no puede renombrar los lugares de F",
  "authenticated",
  B,
  "update public.places set name = 'x'",
  0,
)
await expectError(
  "B no puede enlazar a F en su gasto",
  "authenticated",
  B,
  `insert into public.expense_people (expense_id, person_id) values ('${X2}', '${marta}')`,
  /foreign key|row-level security/,
)

const byFreq = (
  await as("authenticated", F, () =>
    db.query("select name, uses from public.places_by_frequency()"),
  )
).rows
assert(
  byFreq.map((r) => `${r.name}:${r.uses}`).join(",") === "Casa:1,La Parra:1" ||
    byFreq.map((r) => `${r.name}:${r.uses}`).join(",") === "La Parra:1,Casa:1",
  "lugares con su número de usos",
  JSON.stringify(byFreq),
)
await saveExpense(F, { id: "f1f1f1f1-0000-4000-8000-000000000006", amount: 700, place: "Casa" })
const topPlace = (
  await as("authenticated", F, () => db.query("select name from public.places_by_frequency(1)"))
).rows[0]
assert(topPlace.name === "Casa", "ordenados de más a menos usados", JSON.stringify(topPlace))
const topPeople = (
  await as("authenticated", F, () =>
    db.query("select name, uses from public.people_by_frequency()"),
  )
).rows
assert(
  topPeople[0]?.name === "Marta" && Number(topPeople[0].uses) === 1,
  "personas por frecuencia",
  JSON.stringify(topPeople),
)

const findF = async (args) =>
  (await as("authenticated", F, () => db.query(`select * from public.search_expenses(${args})`)))
    .rows
const casaId = (
  await as("authenticated", F, () => db.query("select id from public.places where name = 'Casa'"))
).rows[0].id
let found = await findF(`p_place_id => '${casaId}'`)
assert(
  found.length === 2 && found.every((r) => r.place_name === "Casa"),
  "filtra por lugar",
  JSON.stringify(found.map((r) => r.place_name)),
)
found = await findF(`p_person_id => '${marta}'`)
assert(
  found.length === 1 && found[0].people.some((p) => p.name === "Marta"),
  "filtra por persona y devuelve sus personas",
  JSON.stringify(found),
)
found = await findF("p_min_cents => 600, p_max_cents => 2400")
assert(
  found
    .map((r) => Number(r.amount_cents))
    .sort((a, b) => a - b)
    .join(",") === "700,2400",
  "filtra por rango de importe (incluye los extremos)",
  JSON.stringify(found.map((r) => r.amount_cents)),
)
found = await findF("p_query => 'parra'")
assert(found.length === 1, "el buscador también encuentra por lugar", found.length)

console.log("\nSuscripciones y oferta de bienvenida")
await expectAffected(
  "el usuario sigue pudiendo cambiar su nombre y zona horaria",
  "authenticated",
  F,
  "update public.profiles set display_name = 'Fer', timezone = 'Europe/Madrid'",
  1,
)
await expectError(
  "no puede darse Premium a sí mismo",
  "authenticated",
  F,
  "update public.profiles set premium_comp = true",
  /permission denied/,
)
await expectError(
  "no puede reiniciar la cuenta atrás de la oferta",
  "authenticated",
  F,
  "update public.profiles set welcome_offer_started_at = now()",
  /permission denied/,
)
const offer1 = (
  await as("authenticated", F, () => db.query("select public.start_welcome_offer() as t"))
).rows[0].t
await new Promise((resolve) => setTimeout(resolve, 30))
const offer2 = (
  await as("authenticated", F, () => db.query("select public.start_welcome_offer() as t"))
).rows[0].t
assert(
  offer1 && String(offer1) === String(offer2),
  "la oferta empieza una sola vez (repetir no la reinicia)",
  JSON.stringify({ offer1, offer2 }),
)
await expectError(
  "anon no puede empezar ofertas",
  "anon",
  null,
  "select public.start_welcome_offer()",
  /permission denied/,
)
await db.exec(`insert into public.subscriptions (user_id, stripe_customer_id, stripe_subscription_id, status)
  values ('${F}', 'cus_F', 'sub_F', 'trialing')`)
await expectRows(
  "ve su propia suscripción",
  "authenticated",
  F,
  "select * from public.subscriptions",
  1,
)
await expectRows(
  "B no ve la suscripción de F",
  "authenticated",
  B,
  "select * from public.subscriptions",
  0,
)
await expectError(
  "no puede cambiar su suscripción",
  "authenticated",
  F,
  "update public.subscriptions set status = 'active'",
  /permission denied/,
)
await expectError(
  "no puede crearse una suscripción",
  "authenticated",
  B,
  `insert into public.subscriptions (user_id, stripe_customer_id, status) values ('${B}', 'cus_B', 'active')`,
  /permission denied/,
)
await expectError(
  "anon no ve suscripciones",
  "anon",
  null,
  "select * from public.subscriptions",
  /permission denied/,
)
await expectError(
  "sin Premium no se crea un presupuesto por categoría",
  "authenticated",
  B,
  "insert into public.budgets (category_id, amount_cents) values ('bbbbbbbb-0000-0000-0000-000000000001', 1000)",
  /Premium/,
)
await as("authenticated", F, () =>
  db.exec(
    "insert into public.categories (id, name, emoji, color, position) values ('ffffffff-0000-0000-0000-00000000000c', 'Casa', '🏠', 'teal', 0)",
  ),
)
const fBudgets = (list) =>
  as("authenticated", F, () =>
    db.query(`select public.set_budgets('${JSON.stringify(list)}'::jsonb)`),
  )
await fBudgets([
  { category_id: null, amount_cents: 50000 },
  { category_id: "ffffffff-0000-0000-0000-00000000000c", amount_cents: 20000 },
])
await db.exec(`update public.subscriptions set status = 'canceled' where user_id = '${F}'`)
const premiumF = (await as("authenticated", F, () => db.query("select public.is_premium() as p")))
  .rows[0].p
assert(premiumF === false, "con la suscripción cancelada ya no es Premium", String(premiumF))
await fBudgets([
  { category_id: null, amount_cents: 60000 },
  { category_id: "ffffffff-0000-0000-0000-00000000000c", amount_cents: 1 },
])
const fRows = (
  await as("authenticated", F, () =>
    db.query(
      "select category_id, amount_cents from public.budgets order by category_id nulls first",
    ),
  )
).rows
assert(
  fRows.length === 2 &&
    Number(fRows[0].amount_cents) === 60000 &&
    Number(fRows[1].amount_cents) === 20000,
  "sin Premium cambia el total y el de categoría queda en pausa (no se borra ni se cambia)",
  JSON.stringify(fRows),
)
await expectError(
  "nadie con sesión ve los eventos de Stripe",
  "authenticated",
  F,
  "select * from public.stripe_events",
  /permission denied/,
)

console.log("\nOrden de categorías")
const E = "55555555-5555-5555-5555-555555555555"
await db.exec(`insert into auth.users (id, email) values ('${E}', 'e@test.es')`)
await as("authenticated", E, () =>
  db.exec(`
    insert into public.categories (id, name, emoji, color, position) values
      ('eeeeeeee-0000-0000-0000-000000000001', 'Uno', '1️⃣', 'rose', 0),
      ('eeeeeeee-0000-0000-0000-000000000002', 'Dos', '2️⃣', 'teal', 1),
      ('eeeeeeee-0000-0000-0000-000000000003', 'Tres', '3️⃣', 'plum', 2);
  `),
)
await as("authenticated", E, () =>
  db.query(
    "select public.reorder_categories(array['eeeeeeee-0000-0000-0000-000000000003', 'eeeeeeee-0000-0000-0000-000000000001', 'eeeeeeee-0000-0000-0000-000000000002']::uuid[])",
  ),
)
const ordered = (
  await as("authenticated", E, () =>
    db.query("select name from public.categories order by position"),
  )
).rows.map((r) => r.name)
assert(ordered.join(",") === "Tres,Uno,Dos", "guarda el nuevo orden", ordered.join(","))
const beforeB = (
  await db.query(`select id, position from public.categories where user_id = '${B}'`)
).rows
await as("authenticated", E, () =>
  db.query(`select public.reorder_categories(array['${beforeB[0].id}']::uuid[])`),
)
const afterB = (await db.query(`select id, position from public.categories where user_id = '${B}'`))
  .rows
assert(
  JSON.stringify(afterB) === JSON.stringify(beforeB),
  "no puede reordenar categorías de otro usuario",
  JSON.stringify({ beforeB, afterB }),
)

console.log("\nBorrar mi cuenta")
await expectError(
  "anon no puede borrar cuentas",
  "anon",
  null,
  "select public.delete_my_account()",
  /permission denied/,
)
await as("authenticated", E, () => db.query("select public.delete_my_account()"))
const leftE = (
  await db.query(`select
    (select count(*) from auth.users where id = '${E}') as u,
    (select count(*) from public.categories where user_id = '${E}') as c,
    (select count(*) from public.profiles where id = '${E}') as p,
    (select count(*) from auth.users) as total`)
).rows[0]
assert(
  Number(leftE.u) + Number(leftE.c) + Number(leftE.p) === 0 && Number(leftE.total) >= 3,
  "borra su cuenta y sus datos, y solo la suya",
  JSON.stringify(leftE),
)

console.log("\nMi dinero: ingresos e ingresos programados")
const G = "77777777-7777-7777-7777-777777777777"
await db.exec(`insert into auth.users (id, email) values ('${G}', 'g@test.es')`)
const asG = (sql) => as("authenticated", G, () => db.query(sql))
const applyG = async () =>
  Number((await asG("select public.apply_recurring_incomes() as n")).rows[0].n)
await asG(
  "insert into public.recurring_incomes (description, amount_cents, day_of_month) values ('Nómina', 145000, 1)",
)
// Programada hace dos meses: tocan ese mes, el siguiente y este (el día 1 ya ha llegado).
await db.exec(
  "update public.recurring_incomes set starts_on = (date_trunc('month', current_date) - interval '2 months')::date",
)
assert((await applyG()) === 3, "apunta la nómina de cada mes que ya ha llegado", "")
assert((await applyG()) === 0, "llamarla otra vez no duplica nada", "")
const gIncomes = (await asG("select * from public.incomes order by received_at")).rows
assert(
  gIncomes.length === 3 &&
    gIncomes.every((i) => i.description === "Nómina" && Number(i.amount_cents) === 145000),
  "con su concepto e importe",
  JSON.stringify(gIncomes),
)
await asG(`delete from public.incomes where id = '${gIncomes[2].id}'`)
assert((await applyG()) === 0, "un ingreso programado borrado no vuelve a aparecer", "")
const totalG = (
  await asG(
    "select public.income_total((date_trunc('month', current_date) - interval '2 months')::date, (date_trunc('month', current_date) + interval '1 month')::date) as t",
  )
).rows[0].t
assert(Number(totalG) === 290000, "suma los ingresos del periodo", String(totalG))
await expectAffected(
  "añade un ingreso a mano",
  "authenticated",
  G,
  "insert into public.incomes (description, amount_cents) values ('Bizum de Ana', 2500)",
  1,
)
await expectError(
  "sin importe no hay ingreso",
  "authenticated",
  G,
  "insert into public.incomes (description, amount_cents) values ('Nada', 0)",
  /check/,
)
await expectError(
  "sin Premium, solo un ingreso programado",
  "authenticated",
  G,
  "insert into public.recurring_incomes (description, amount_cents, day_of_month) values ('Alquiler', 50000, 5)",
  /Premium/,
)
await db.exec(`update public.profiles set premium_comp = true where id = '${G}'`)
await expectAffected(
  "con Premium, varios",
  "authenticated",
  G,
  "insert into public.recurring_incomes (description, amount_cents, day_of_month, active) values ('Alquiler', 50000, 1, false)",
  1,
)
assert((await applyG()) === 0, "uno en pausa no apunta nada", "")
await expectError(
  "el día del mes va del 1 al 31",
  "authenticated",
  G,
  "insert into public.recurring_incomes (description, amount_cents, day_of_month) values ('Mal', 100, 32)",
  /check/,
)
await expectRows("B no ve los ingresos de G", "authenticated", B, "select * from public.incomes", 0)
await expectRows(
  "ni sus ingresos programados",
  "authenticated",
  B,
  "select * from public.recurring_incomes",
  0,
)
await expectError(
  "B no puede apuntar ingresos a G",
  "authenticated",
  B,
  `insert into public.incomes (user_id, description, amount_cents) values ('${G}', 'x', 100)`,
  /row-level security/,
)
await expectAffected(
  "B no puede borrar ingresos de G",
  "authenticated",
  B,
  "delete from public.incomes",
  0,
)
await expectError(
  "anon no ve ingresos",
  "anon",
  null,
  "select * from public.incomes",
  /permission denied/,
)
await expectError(
  "anon no puede apuntar programados",
  "anon",
  null,
  "select public.apply_recurring_incomes()",
  /permission denied/,
)
await asG("delete from public.recurring_incomes where description = 'Nómina'")
const orphan = (await asG("select count(*) as n from public.incomes where recurring_id is null"))
  .rows[0].n
assert(
  Number(orphan) === 3,
  "borrar el programado conserva los ingresos ya apuntados",
  String(orphan),
)

console.log("\nCuentas")
const H = "88888888-8888-8888-8888-888888888888"
await db.exec(`insert into auth.users (id, email) values ('${H}', 'h@test.es')`)
const asH = (sql) => as("authenticated", H, () => db.query(sql))
const hAccounts = (await asH("select id, name, emoji from public.accounts")).rows
assert(
  hAccounts.length === 1 && hAccounts[0].name === "Personal" && hAccounts[0].emoji === "💳",
  "cada usuario nuevo empieza con la cuenta Personal",
  JSON.stringify(hAccounts),
)
const personalH = hAccounts[0].id
const withoutAccount = (
  await db.query(
    "select count(*) as n from public.profiles p where not exists (select 1 from public.accounts a where a.user_id = p.id)",
  )
).rows[0].n
assert(Number(withoutAccount) === 0, "todos los usuarios tienen cuenta (también los de antes)", "")
const orphanExpenses = (
  await db.query("select count(*) as n from public.expenses where account_id is null")
).rows[0].n
assert(Number(orphanExpenses) === 0, "los gastos de antes pasan a su cuenta principal", "")

await asH(
  "insert into public.categories (id, name, emoji, color, position) values ('88888888-0000-0000-0000-00000000000c', 'Comida', '🍽️', 'amber', 0)",
)
const saveH = (id, account, amount = 1000) =>
  asH(
    `select public.save_expense(p_id => '${id}', p_category_id => '88888888-0000-0000-0000-00000000000c', p_amount_cents => ${amount}, p_spent_at => now()${account ? `, p_account_id => '${account}'` : ""})`,
  )
await saveH("88888888-0000-0000-0000-0000000000e1", null)
const firstExpense = (await asH("select account_id from public.expenses")).rows[0]
assert(
  firstExpense?.account_id === personalH,
  "un gasto sin cuenta va a la principal",
  JSON.stringify(firstExpense),
)
await expectError(
  "sin Premium, solo una cuenta",
  "authenticated",
  H,
  "insert into public.accounts (name, emoji) values ('Padres', '👨‍👩‍👦')",
  /Límite de cuentas/,
)
await db.exec(`update public.profiles set premium_comp = true where id = '${H}'`)
const parents = (
  await asH(
    "insert into public.accounts (name, emoji, position) values ('Padres', '👨‍👩‍👦', 1) returning id",
  )
).rows[0].id
assert(Boolean(parents), "con Premium, varias cuentas", "")
await expectError(
  "no se repite el nombre de una cuenta",
  "authenticated",
  H,
  "insert into public.accounts (name, emoji) values ('padres', '💶')",
  /duplicate key/,
)
await saveH("88888888-0000-0000-0000-0000000000e2", parents, 2500)
await saveH("88888888-0000-0000-0000-0000000000e2", null, 3000)
const edited = (
  await asH(
    "select account_id, amount_cents from public.expenses where id = '88888888-0000-0000-0000-0000000000e2'",
  )
).rows[0]
assert(
  edited.account_id === parents && Number(edited.amount_cents) === 3000,
  "un gasto se guarda en la cuenta elegida y al editarlo sin cuenta no cambia",
  JSON.stringify(edited),
)
await asH(
  `insert into public.incomes (description, amount_cents, account_id) values ('Paga', 10000, '${parents}')`,
)
const hSummary = (
  await asH(
    "select * from public.account_summary(date_trunc('month', current_date)::date, (date_trunc('month', current_date) + interval '1 month')::date)",
  )
).rows
assert(
  hSummary.length === 2 &&
    hSummary[0].name === "Personal" &&
    Number(hSummary[0].spent_cents) === 1000 &&
    hSummary[1].name === "Padres" &&
    Number(hSummary[1].spent_cents) === 3000 &&
    Number(hSummary[1].income_cents) === 10000,
  "resumen por cuenta: gastado e ingresado, en su orden",
  JSON.stringify(hSummary),
)
const filtered = (await asH(`select id from public.search_expenses(p_account_id => '${parents}')`))
  .rows
assert(filtered.length === 1, "el historial filtra por cuenta", JSON.stringify(filtered))
const hByCategory = (
  await asH(
    `select total_cents from public.spending_by_category(date_trunc('month', current_date)::date, (date_trunc('month', current_date) + interval '1 month')::date, '${personalH}')`,
  )
).rows
assert(
  hByCategory.length === 1 && Number(hByCategory[0].total_cents) === 1000,
  "las estadísticas filtran por cuenta",
  JSON.stringify(hByCategory),
)
const parentsIncome = (
  await asH(
    `select public.income_total(date_trunc('month', current_date)::date, (date_trunc('month', current_date) + interval '1 month')::date, '${personalH}') as t`,
  )
).rows[0].t
assert(Number(parentsIncome) === 0, "los ingresos se cuentan por cuenta", String(parentsIncome))
await asH(
  `insert into public.recurring_incomes (description, amount_cents, day_of_month, account_id) values ('Paga semanal', 2000, 1, '${parents}')`,
)
await asH("select public.apply_recurring_incomes()")
const recurringAccount = (
  await asH("select account_id from public.incomes where description = 'Paga semanal'")
).rows[0]
assert(
  recurringAccount?.account_id === parents,
  "el ingreso programado se apunta en su cuenta",
  JSON.stringify(recurringAccount),
)
await expectError(
  "no se puede usar la cuenta de otro usuario",
  "authenticated",
  B,
  `insert into public.incomes (description, amount_cents, account_id) values ('x', 100, '${parents}')`,
  /foreign key|row-level security/,
)
await expectRows(
  "B no ve las cuentas de H",
  "authenticated",
  B,
  `select * from public.accounts where user_id = '${H}'`,
  0,
)
await expectError(
  "las cuentas no se borran (se archivan)",
  "authenticated",
  H,
  `delete from public.accounts where id = '${parents}'`,
  /permission denied/,
)
await expectAffected(
  "se puede archivar una cuenta",
  "authenticated",
  H,
  `update public.accounts set archived_at = now() where id = '${parents}'`,
  1,
)
await expectError(
  "nunca te quedas sin ninguna cuenta",
  "authenticated",
  H,
  `update public.accounts set archived_at = now() where id = '${personalH}'`,
  /al menos una cuenta/,
)
await db.exec(`update public.profiles set premium_comp = false where id = '${H}'`)
await expectError(
  "sin Premium no se puede reactivar una segunda cuenta",
  "authenticated",
  H,
  `update public.accounts set archived_at = null where id = '${parents}'`,
  /Límite de cuentas/,
)
await expectError(
  "anon no ve cuentas",
  "anon",
  null,
  "select * from public.accounts",
  /permission denied/,
)

console.log("\nBeta abierta")
const premiumOf = async (userId) =>
  (await as("authenticated", userId, () => db.query("select public.is_premium() as p"))).rows[0].p
assert((await premiumOf(B)) === false, "con la beta cerrada, B no es Premium", "")
await db.exec("update public.app_settings set beta_open = true")
assert((await premiumOf(B)) === true, "con la beta abierta, todos son Premium", "")
await expectAffected(
  "en beta se pueden crear varias cuentas sin pagar",
  "authenticated",
  B,
  "insert into public.accounts (name, emoji) values ('Ahorro', '🐷')",
  1,
)
await expectRows(
  "todos pueden leer si la beta está abierta",
  "authenticated",
  B,
  "select beta_open from public.app_settings",
  1,
)
await expectError(
  "nadie puede abrir o cerrar la beta desde la app",
  "authenticated",
  B,
  "update public.app_settings set beta_open = false",
  /permission denied/,
)
await expectError(
  "anon no ve los ajustes",
  "anon",
  null,
  "select * from public.app_settings",
  /permission denied/,
)
await db.exec("update public.app_settings set beta_open = false")
assert((await premiumOf(B)) === false, "al cerrar la beta vuelve a ser Gratis", "")

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
