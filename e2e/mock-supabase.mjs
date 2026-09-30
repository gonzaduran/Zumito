// Supabase simulado para las pruebas de extremo a extremo: solo las rutas que usa Zumito,
// con los datos en memoria. Imita lo esencial de Postgres (claves únicas y foráneas).
import { randomUUID } from "node:crypto"
import { createServer } from "node:http"

const PORT = 54329
const b64 = (obj) => Buffer.from(JSON.stringify(obj)).toString("base64url")
const user = {
  id: "11111111-1111-4111-8111-111111111111",
  aud: "authenticated",
  role: "authenticated",
  email: "gonzalo@test.es",
  app_metadata: { provider: "email" },
  user_metadata: {},
  created_at: new Date().toISOString(),
}
const now = () => Math.floor(Date.now() / 1000)
const token = `${b64({ alg: "HS256", typ: "JWT" })}.${b64({ sub: user.id, email: user.email, role: "authenticated", aud: "authenticated", iat: now(), exp: now() + 3600, session_id: "s1" })}.${Buffer.from("firma-de-prueba").toString("base64url")}`
const profile = {
  display_name: null,
  onboarded_at: null,
  timezone: "Europe/Madrid",
  premium_comp: false,
  welcome_offer_started_at: null,
}
let categories = []
let expenses = []
let budgets = []
let places = []
let people = []

/** Busca por nombre (sin mayúsculas) o lo crea, como ensure_place/ensure_person. */
const ensureNamed = (list, raw) => {
  const name = (raw ?? "").trim()
  if (!name) return null
  const found = list.find((item) => item.name.toLowerCase() === name.toLowerCase())
  if (found) return found.id
  const item = { id: randomUUID(), name }
  list.push(item)
  return item.id
}
const usesOf = (id, key) =>
  expenses.filter((e) => (key === "place" ? e.place_id === id : e.person_ids?.includes(id))).length
const peopleOf = (e) =>
  (e.person_ids ?? [])
    .map((id) => people.find((p) => p.id === id))
    .filter(Boolean)
    .sort((a, b) => a.name.localeCompare(b.name))
    .map(({ id, name }) => ({ id, name }))
const log = []

const readBody = (req) =>
  new Promise((resolve) => {
    let d = ""
    req.on("data", (c) => (d += c))
    req.on("end", () => resolve(d ? JSON.parse(d) : {}))
  })
const send = (res, status, body) => {
  res.writeHead(status, { "content-type": "application/json" })
  res.end(body === undefined ? "" : JSON.stringify(body))
}
const madridDay = (d) => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Madrid" }).format(d)
/** Respuesta de PostgREST según pida un objeto (single/maybeSingle) o una lista. */
const rows = (req, res, list) => {
  const accept = req.headers.accept ?? ""
  if (!accept.includes("vnd.pgrst.object")) return send(res, 200, list)
  if (list.length === 1) return send(res, 200, list[0])
  return send(res, 406, {
    code: "PGRST116",
    message: "JSON object requested, multiple (or no) rows returned",
  })
}

createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`)
  const logged = (req.headers.authorization ?? "") === `Bearer ${token}`
  log.push(`${req.method} ${url.pathname}${url.search}`)

  if (url.pathname === "/__log")
    return send(res, 200, { log, profile, categories, expenses, budgets, places, people })
  if (url.pathname === "/__profile") {
    for (const [key, value] of url.searchParams)
      profile[key] = value === "true" ? true : value === "false" ? false : value
    return send(res, 200, profile)
  }
  if (url.pathname === "/__fail") {
    profile.failInserts = url.searchParams.get("on") === "1"
    return send(res, 200, {})
  }

  // --- Auth ---
  if (req.method === "POST" && url.pathname === "/auth/v1/otp") {
    const body = await readBody(req)
    if (body.email === "limite@test.es")
      return send(res, 429, { code: "over_email_send_rate_limit", msg: "rate limit" })
    return send(res, 200, {})
  }
  if (req.method === "POST" && url.pathname === "/auth/v1/verify") {
    const body = await readBody(req)
    if (body.token !== "123456")
      return send(res, 403, { code: "otp_expired", msg: "Token has expired or is invalid" })
    return send(res, 200, {
      access_token: token,
      token_type: "bearer",
      expires_in: 3600,
      expires_at: now() + 3600,
      refresh_token: "refresh",
      user,
    })
  }
  if (req.method === "GET" && url.pathname === "/auth/v1/user") {
    return logged ? send(res, 200, user) : send(res, 401, { code: "bad_jwt", msg: "invalid" })
  }
  if (req.method === "POST" && url.pathname === "/auth/v1/logout") return send(res, 204)

  if (url.pathname.startsWith("/rest/v1/") && !logged)
    return send(res, 401, { message: "JWT expected" })

  // --- Datos ---
  if (req.method === "GET" && url.pathname === "/rest/v1/profiles") return rows(req, res, [profile])
  if (req.method === "GET" && url.pathname === "/rest/v1/subscriptions") return rows(req, res, [])
  if (req.method === "POST" && url.pathname === "/rest/v1/rpc/start_welcome_offer") {
    profile.welcome_offer_started_at ??= new Date().toISOString()
    return send(res, 200, profile.welcome_offer_started_at)
  }
  if (req.method === "POST" && url.pathname === "/rest/v1/rpc/complete_onboarding") {
    const body = await readBody(req)
    log.push(`rpc ${JSON.stringify(body)}`)
    if (!profile.onboarded_at) {
      categories = body.p_categories.map((c, i) => ({
        id: randomUUID(),
        ...c,
        position: i,
        archived_at: null,
      }))
      profile.display_name = body.p_display_name
      profile.onboarded_at = new Date().toISOString()
    }
    return send(res, 204)
  }
  if (url.pathname === "/rest/v1/categories" && (req.method === "GET" || req.method === "HEAD")) {
    const onlyActive = url.searchParams.get("archived_at") === "is.null"
    const list = categories
      .filter((c) => !onlyActive || !c.archived_at)
      .sort((a, b) => a.position - b.position)
    if (req.method === "HEAD") {
      res.writeHead(200, { "content-range": `*/${list.length}` })
      return res.end()
    }
    const withArchived = (url.searchParams.get("select") ?? "").includes("archived_at")
    return rows(
      req,
      res,
      list.map(({ id, name, emoji, color, archived_at }) =>
        withArchived ? { id, name, emoji, color, archived_at } : { id, name, emoji, color },
      ),
    )
  }
  const nameTaken = (name, exceptId) =>
    categories.some(
      (c) =>
        c.id !== exceptId &&
        !c.archived_at &&
        c.name.trim().toLowerCase() === name.trim().toLowerCase(),
    )
  if (req.method === "POST" && url.pathname === "/rest/v1/categories") {
    const body = await readBody(req)
    const cat = Array.isArray(body) ? body[0] : body
    if (nameTaken(cat.name)) return send(res, 409, { code: "23505", message: "duplicate key" })
    categories.push({ id: randomUUID(), archived_at: null, ...cat })
    return send(res, 201)
  }
  if (req.method === "PATCH" && url.pathname === "/rest/v1/categories") {
    const id = (url.searchParams.get("id") ?? "").replace(/^eq./, "")
    const body = await readBody(req)
    const current = categories.find((c) => c.id === id)
    const next = { ...current, ...body }
    if (!next.archived_at && nameTaken(next.name, id))
      return send(res, 409, { code: "23505", message: "duplicate key" })
    categories = categories.map((c) => (c.id === id ? next : c))
    return send(res, 204)
  }
  if (req.method === "POST" && url.pathname === "/rest/v1/rpc/reorder_categories") {
    const body = await readBody(req)
    categories = categories.map((c) =>
      body.p_ids.includes(c.id) ? { ...c, position: body.p_ids.indexOf(c.id) } : c,
    )
    return send(res, 204)
  }
  if (req.method === "PATCH" && url.pathname === "/rest/v1/profiles") {
    Object.assign(profile, await readBody(req))
    return send(res, 204)
  }
  if (req.method === "POST" && url.pathname === "/rest/v1/rpc/delete_my_account") {
    log.push("delete account")
    categories = []
    expenses = []
    budgets = []
    places = []
    people = []
    Object.assign(profile, {
      display_name: null,
      onboarded_at: null,
      timezone: "Europe/Madrid",
      deleted: true,
    })
    return send(res, 204)
  }
  if (req.method === "POST" && url.pathname === "/rest/v1/rpc/expense_summary") {
    const today = madridDay(new Date())
    const sum = (f) => expenses.filter(f).reduce((a, e) => a + e.amount_cents, 0)
    return send(res, 200, [
      {
        today_cents: sum((e) => madridDay(new Date(e.spent_at)) === today),
        week_cents: sum((e) => madridDay(new Date(e.spent_at)).slice(0, 7) === today.slice(0, 7)),
        month_cents: sum((e) => madridDay(new Date(e.spent_at)).slice(0, 7) === today.slice(0, 7)),
        total_cents: sum(() => true),
      },
    ])
  }
  if (req.method === "GET" && url.pathname === "/rest/v1/expenses") {
    const select = url.searchParams.get("select") ?? ""
    const order = url.searchParams.get("order") ?? "spent_at.desc"
    const key = order.split(".")[0]
    const limit = Number(url.searchParams.get("limit") ?? 1000)
    const offset = Number(url.searchParams.get("offset") ?? 0)
    const list = [...expenses]
      .sort((a, b) => b[key].localeCompare(a[key]))
      .slice(offset, offset + limit)
      .map((e) => {
        if (select === "category_id") return { category_id: e.category_id }
        const c = categories.find((c) => c.id === e.category_id)
        return {
          id: e.id,
          amount_cents: e.amount_cents,
          description: e.description,
          note: e.note ?? null,
          spent_at: e.spent_at,
          mood: e.mood ?? null,
          category: c ? { name: c.name, emoji: c.emoji } : null,
          place: e.place_id ? { name: places.find((p) => p.id === e.place_id)?.name } : null,
          expense_people: peopleOf(e).map((p) => ({ person: { name: p.name } })),
        }
      })
    return rows(req, res, list)
  }
  if (req.method === "POST" && url.pathname === "/rest/v1/rpc/save_expense") {
    const b = await readBody(req)
    const expense = {
      id: b.p_id,
      category_id: b.p_category_id,
      amount_cents: b.p_amount_cents,
      description: b.p_description?.trim() || null,
      note: b.p_note?.trim() || null,
      spent_at: b.p_spent_at,
    }
    log.push(`insert ${JSON.stringify(expense)}`)
    if (profile.failInserts) return send(res, 500, { message: "fallo simulado" })
    await new Promise((r) => setTimeout(r, 400)) // latencia de red
    if (!categories.some((c) => c.id === expense.category_id))
      return send(res, 409, { code: "23503", message: "foreign key" })
    expense.place_id = ensureNamed(places, b.p_place)
    expense.mood = b.p_mood ?? null
    const newIds = (b.p_new_people ?? []).map((name) => ensureNamed(people, name))
    expense.person_ids = [...new Set([...(b.p_person_ids ?? []), ...newIds])].filter(Boolean)
    // Como save_expense: el mismo id actualiza en lugar de duplicar.
    const existing = expenses.find((e) => e.id === expense.id)
    if (existing) Object.assign(existing, expense)
    else expenses.push({ ...expense, created_at: new Date().toISOString() })
    return send(res, 204)
  }
  if (req.method === "POST" && url.pathname === "/rest/v1/rpc/places_by_frequency") {
    const list = places.map((p) => ({ ...p, uses: usesOf(p.id, "place") }))
    return send(
      res,
      200,
      list.sort((a, b) => b.uses - a.uses || a.name.localeCompare(b.name)),
    )
  }
  if (req.method === "POST" && url.pathname === "/rest/v1/rpc/people_by_frequency") {
    const list = people.map((p) => ({ ...p, uses: usesOf(p.id, "person") }))
    return send(
      res,
      200,
      list.sort((a, b) => b.uses - a.uses || a.name.localeCompare(b.name)),
    )
  }
  if (req.method === "POST" && url.pathname === "/rest/v1/rpc/search_expenses") {
    const body = await readBody(req)
    const q = (body.p_query ?? "").toLowerCase()
    const list = expenses
      .map((e) => ({ e, c: categories.find((c) => c.id === e.category_id) }))
      .map(({ e, c }) => ({ e, c, place: places.find((p) => p.id === e.place_id) }))
      .filter(
        ({ e, c, place }) =>
          (!body.p_category_id || e.category_id === body.p_category_id) &&
          (!body.p_place_id || e.place_id === body.p_place_id) &&
          (!body.p_person_id || e.person_ids?.includes(body.p_person_id)) &&
          (body.p_min_cents == null || e.amount_cents >= body.p_min_cents) &&
          (body.p_max_cents == null || e.amount_cents <= body.p_max_cents) &&
          (!q ||
            [e.description, e.note, c?.name, place?.name].some((t) =>
              t?.toLowerCase().includes(q),
            )),
      )
      .map(({ e, c, place }) => ({
        id: e.id,
        amount_cents: e.amount_cents,
        description: e.description,
        note: e.note,
        spent_at: e.spent_at,
        category_id: e.category_id,
        category_name: c.name,
        category_emoji: c.emoji,
        category_color: c.color,
        place_id: e.place_id ?? null,
        place_name: place?.name ?? null,
        mood: e.mood ?? null,
        people: peopleOf(e),
        day: madridDay(new Date(e.spent_at)),
      }))
    for (const r of list)
      r.day_total_cents = list
        .filter((o) => o.day === r.day)
        .reduce((a, o) => a + o.amount_cents, 0)
    list.sort((a, b) => b.spent_at.localeCompare(a.spent_at))
    return send(res, 200, list.slice(0, body.p_limit ?? 50))
  }
  if (req.method === "POST" && url.pathname === "/rest/v1/rpc/spending_by_category") {
    const body = await readBody(req)
    const totals = new Map()
    for (const e of expenses) {
      const day = madridDay(new Date(e.spent_at))
      if (day < body.p_from || day >= body.p_to) continue
      const cat = categories.find((c) => c.id === e.category_id)
      const row = totals.get(cat.id) ?? {
        category_id: cat.id,
        name: cat.name,
        emoji: cat.emoji,
        color: cat.color,
        total_cents: 0,
        expense_count: 0,
      }
      row.total_cents += e.amount_cents
      row.expense_count += 1
      totals.set(cat.id, row)
    }
    return send(
      res,
      200,
      [...totals.values()].sort((a, b) => b.total_cents - a.total_cents),
    )
  }
  if (req.method === "POST" && url.pathname === "/rest/v1/rpc/spending_by_month") {
    const body = await readBody(req)
    const n = body.p_months ?? 6
    const [y, m] = madridDay(new Date()).split("-").map(Number)
    const rows = []
    for (let i = n - 1; i >= 0; i--) {
      const month = new Date(Date.UTC(y, m - 1 - i, 1)).toISOString().slice(0, 7)
      rows.push({
        month: `${month}-01`,
        total_cents: expenses
          .filter((e) => madridDay(new Date(e.spent_at)).startsWith(month))
          .reduce((a, e) => a + e.amount_cents, 0),
      })
    }
    return send(res, 200, rows)
  }
  if (req.method === "POST" && url.pathname === "/rest/v1/rpc/set_budgets") {
    const body = await readBody(req)
    log.push(`budgets ${JSON.stringify(body)}`)
    // Como en la base de datos: sin Premium solo cambia el total y los de categoría se conservan.
    budgets = profile.premium_comp
      ? body.p_budgets
      : [
          ...body.p_budgets.filter((b) => b.category_id === null),
          ...budgets.filter((b) => b.category_id !== null),
        ]
    return send(res, 204)
  }
  if (req.method === "POST" && url.pathname === "/rest/v1/rpc/budget_status") {
    const month = madridDay(new Date()).slice(0, 7)
    const monthExpenses = expenses.filter((e) => madridDay(new Date(e.spent_at)).startsWith(month))
    const rows = budgets.map((b) => {
      const cat = categories.find((c) => c.id === b.category_id)
      return {
        category_id: b.category_id,
        name: cat?.name ?? null,
        emoji: cat?.emoji ?? null,
        amount_cents: b.amount_cents,
        spent_cents: monthExpenses
          .filter((e) => !b.category_id || e.category_id === b.category_id)
          .reduce((a, e) => a + e.amount_cents, 0),
      }
    })
    rows.sort((a, b) => (a.category_id === null ? -1 : b.category_id === null ? 1 : 0))
    return send(res, 200, rows)
  }
  if (req.method === "DELETE" && url.pathname === "/rest/v1/expenses") {
    const id = (url.searchParams.get("id") ?? "").replace(/^eq\./, "")
    expenses = expenses.filter((e) => e.id !== id)
    return send(res, 204)
  }
  send(res, 404, { message: `sin mock: ${req.method} ${url.pathname}` })
}).listen(PORT, () => console.log(`mock en ${PORT}`))
