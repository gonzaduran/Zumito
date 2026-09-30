// Recorrido completo de la app con Chrome sin interfaz (CDP) contra el Supabase simulado.
// Lo lanza e2e/run.mjs (npm run test:e2e). Uso directo: node e2e/flow.mjs <capturas> <light|dark>
import { spawn } from "node:child_process"
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

const BASE = "http://localhost:3123"
const OUT = process.argv[2] ?? "e2e/screenshots"
const scheme = process.argv[3] ?? "light"
mkdirSync(OUT, { recursive: true })
const CHROME_CANDIDATES = [
  process.env.CHROME_PATH,
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
]
const chrome = CHROME_CANDIDATES.find((path) => path && existsSync(path))
if (!chrome) {
  console.error("No encuentro Chrome. Indica su ruta con la variable CHROME_PATH.")
  process.exit(1)
}
const port = 9400 + Math.floor(Math.random() * 400)
const profileDir = mkdtempSync(join(tmpdir(), "cdp-"))
const proc = spawn(chrome, [
  "--headless=new",
  "--disable-gpu",
  "--hide-scrollbars",
  "--disk-cache-size=1",
  `--remote-debugging-port=${port}`,
  `--user-data-dir=${profileDir}`,
  "about:blank",
])
const cleanup = async () => {
  proc.kill()
  await sleep(800)
  try {
    rmSync(profileDir, { recursive: true, force: true })
  } catch {}
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
let targets
for (let i = 0; i < 50; i++) {
  try {
    targets = await (await fetch(`http://127.0.0.1:${port}/json`)).json()
    break
  } catch {
    await sleep(200)
  }
}
const ws = new WebSocket(targets.find((t) => t.type === "page").webSocketDebuggerUrl)
await new Promise((r) => ws.addEventListener("open", r))
let id = 0
const pending = new Map()
ws.addEventListener("message", (e) => {
  const m = JSON.parse(e.data)
  if (m.id && pending.has(m.id)) {
    pending.get(m.id)(m)
    pending.delete(m.id)
  }
})
const send = (method, params = {}) =>
  new Promise((r) => {
    const i = ++id
    pending.set(i, r)
    ws.send(JSON.stringify({ id: i, method, params }))
  })
const evaluate = async (expression) =>
  (await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true })).result
    .result.value

await send("Emulation.setDeviceMetricsOverride", {
  width: 390,
  height: 844,
  deviceScaleFactor: 2,
  mobile: true,
})
await send("Emulation.setEmulatedMedia", {
  features: [{ name: "prefers-color-scheme", value: scheme }],
})
await send("Page.enable")
// Un móvil en Canarias: la app debe guardar esa zona horaria, no suponer Madrid.
await send("Emulation.setTimezoneOverride", { timezoneId: "Atlantic/Canary" })

let fails = 0
const check = (name, cond, detail) => {
  if (!cond) fails++
  console.log(cond ? "  ✔" : "  ✘", name, cond ? "" : `→ ${detail}`)
}
const path = () => evaluate("location.pathname + location.search")
const text = async () => (await evaluate("document.body.innerText")).replace(/ /g, " ")
async function waitFor(fn, ms = 8000) {
  const end = Date.now() + ms
  while (Date.now() < end) {
    if (await fn()) return true
    await sleep(150)
  }
  return false
}
// Auditoría de accesibilidad con axe-core (WCAG 2.0 y 2.1, niveles A y AA).
const axeSource = readFileSync(
  new URL("../node_modules/axe-core/axe.min.js", import.meta.url),
  "utf8",
)
async function audit(name) {
  await sleep(450) // que terminen las animaciones de entrada
  await send("Runtime.evaluate", { expression: axeSource })
  const violations = await evaluate(`axe
    .run(document, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"] } })
    .then((r) => r.violations.map((v) => ({
      id: v.id,
      impact: v.impact,
      nodes: v.nodes.slice(0, 3).map((n) => n.target.join(" ") + " :: " + (n.failureSummary || "").split(String.fromCharCode(10)).slice(1, 2).join(" ")),
    })))`)
  check(`accesibilidad AA: ${name}`, violations.length === 0, JSON.stringify(violations))
}
const goto = async (p) => {
  await send("Page.navigate", { url: BASE + p })
  await sleep(1200)
}
const shot = async (name) => {
  const r = await send("Page.captureScreenshot", { format: "png" })
  writeFileSync(join(OUT, `${scheme}-${name}.png`), Buffer.from(r.result.data, "base64"))
}
const fill = (sel, value) =>
  evaluate(
    `(() => { const el = document.querySelector(${JSON.stringify(sel)}); const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set; set.call(el, ${JSON.stringify(value)}); el.dispatchEvent(new Event('input', { bubbles: true })); return true })()`,
  )
const clickSel = (sel) =>
  evaluate(
    `(() => { const el = document.querySelector(${JSON.stringify(sel)}); if (!el) return false; el.click(); return true })()`,
  )
const keypad = (k) =>
  evaluate(
    `(() => { const b = [...document.querySelectorAll('[aria-label="Teclado numérico"] button')].find((b) => (b.getAttribute('aria-label') ?? b.innerText.trim()) === ${JSON.stringify(k)}); b.click(); return true })()`,
  )
const pressedChips = () =>
  evaluate(
    "[...document.querySelectorAll('[aria-label=\"Categoría\"] [data-pressed]')].map((b) => b.innerText.trim())",
  )
const mock = async () => (await fetch("http://localhost:54329/__log")).json()
// Teclas especiales con su código real; el resto se envían como texto (dígitos, letras).
const SPECIAL_KEYS = { Enter: 13, Escape: 27, ArrowUp: 38, ArrowDown: 40, Backspace: 8 }
async function keyboard(key) {
  const code = SPECIAL_KEYS[key]
  const extra = code
    ? { code: key, windowsVirtualKeyCode: code, nativeVirtualKeyCode: code }
    : { text: key }
  await send("Input.dispatchKeyEvent", { type: code ? "rawKeyDown" : "keyDown", key, ...extra })
  await send("Input.dispatchKeyEvent", { type: "keyUp", key, ...(code ? extra : {}) })
}
const clickText = (t) =>
  evaluate(
    `(() => { const b = [...document.querySelectorAll('button')].find((b) => b.innerText.trim().includes(${JSON.stringify(t)})); if (!b) return false; b.click(); return true })()`,
  )

console.log("Sin sesión")
await goto("/")
check("/ redirige a /login", (await path()) === "/login", await path())
await goto("/historial")
check(
  "/historial redirige a /login recordando la ruta",
  (await path()) === "/login?next=%2Fhistorial",
  await path(),
)
// El resto del recorrido entra desde un login sin ruta de vuelta.
await goto("/login")
await shot("01-login")
await audit("login")
const splash = await evaluate(
  "Promise.all([...document.querySelectorAll('link[rel=apple-touch-startup-image]')].map((l) => fetch(l.href).then((r) => r.ok && r.headers.get('content-type') === 'image/png')))",
)
check(
  "pantallas de carga de iPhone declaradas y accesibles sin sesión",
  splash.length === 9 && splash.every(Boolean),
  JSON.stringify(splash),
)

console.log("Login")
await fill("#email", "limite@test.es")
await clickText("Enviarme el código")
check(
  "límite de envíos muestra el aviso",
  await waitFor(async () => (await text()).includes("Has pedido muchos códigos")),
  await text(),
)
check(
  "tras el error, el email sigue escrito",
  (await evaluate("document.querySelector('#email').value")) === "limite@test.es",
  await evaluate("document.querySelector('#email').value"),
)
await fill("#email", "gonzalo@test.es")
await clickText("Enviarme el código")
check(
  "pasa al paso del código",
  await waitFor(async () => (await text()).includes("Revisa tu email")),
  await text(),
)
check("muestra el email en el texto", (await text()).includes("gonzalo@test.es"))
await shot("02-codigo")
await audit("código")
await fill("#code", "000000")
await clickText("Entrar")
check(
  "código incorrecto muestra error",
  await waitFor(async () => (await text()).includes("no es correcto")),
  await text(),
)
await shot("03-codigo-error")
await clickText("Usar otro email")
check(
  "'Usar otro email' vuelve al campo con el email anterior",
  await waitFor(
    async () => (await evaluate("document.querySelector('#email')?.value")) === "gonzalo@test.es",
  ),
  await text(),
)
await fill("#email", "otro@test.es")
await clickText("Enviarme el código")
check(
  "con el email nuevo pasa al código de ese email",
  await waitFor(async () => (await text()).includes("otro@test.es")),
  await text(),
)
check("y no muestra el email anterior", !(await text()).includes("gonzalo@test.es"), await text())
await fill("#code", "123456")
await clickText("Entrar")
check(
  "código correcto lleva al onboarding",
  await waitFor(async () => (await path()) === "/onboarding"),
  await path(),
)

console.log("Onboarding")
await sleep(600)
await shot("04-onboarding-1")
await audit("onboarding 1")
await goto("/")
check("sin onboarding, / vuelve al onboarding", (await path()) === "/onboarding", await path())
await sleep(500)
await fill("#displayName", "  Gonzalo ")
await clickText("Continuar")
check(
  "paso 2: categorías",
  await waitFor(async () => (await text()).includes("Elige tus categorías")),
  await text(),
)
const pressed = await evaluate("document.querySelectorAll('[data-slot=chip][data-pressed]').length")
check("las 12 categorías vienen marcadas", pressed === 12, pressed)
await clickText("Mascotas")
await clickText("Regalos")
await sleep(300)
await shot("05-onboarding-2")
await audit("onboarding 2")
await clickText("Empezar")
check(
  "al terminar presenta los planes",
  await waitFor(async () => (await path()) === "/planes?bienvenida=1"),
  await path(),
)
await waitFor(async () =>
  Boolean(await evaluate("Boolean(document.querySelector('[role=timer]'))")),
)
const plansText = await text()
check(
  "con la oferta de bienvenida y su cuenta atrás",
  plansText.includes("Oferta de bienvenida") &&
    /0[45]:\d\d/.test(await evaluate("document.querySelector('[role=timer]')?.innerText ?? ''")),
  plansText,
)
check(
  "el anual por defecto, con el precio tachado y el de oferta",
  plansText.includes("9,99 €") && plansText.includes("8,99 €") && plansText.includes("Ahorra 44 %"),
  plansText,
)
check(
  "explica la prueba de 7 días y la renovación",
  plansText.includes("Empezar 7 días gratis") &&
    plansText.includes("Hoy no pagas nada") &&
    plansText.includes("se renueva solo"),
  plansText,
)
check(
  "la oferta empieza una sola vez",
  Boolean((await mock()).profile.welcome_offer_started_at),
  JSON.stringify((await mock()).profile),
)
const offerStart = (await mock()).profile.welcome_offer_started_at
await evaluate(
  "[...document.querySelectorAll('[role=tab]')].find((t) => t.innerText.includes('Mensual')).click()",
)
await sleep(300)
check(
  "en mensual se ve 1,49 € al mes",
  (await text()).includes("1,49 €") && (await text()).includes("/mes"),
  await text(),
)
await shot("05b-planes")
await audit("planes")
await goto("/planes")
check(
  "volver a entrar no reinicia la cuenta atrás",
  (await mock()).profile.welcome_offer_started_at === offerStart,
  (await mock()).profile.welcome_offer_started_at,
)
await goto("/planes?bienvenida=1")
await evaluate(
  "[...document.querySelectorAll('a')].find((a) => a.innerText.includes('Seguir con el plan gratis')).click()",
)
check(
  "seguir gratis lleva al inicio",
  await waitFor(async () => (await path()) === "/"),
  await path(),
)
const log = await (await fetch("http://localhost:54329/__log")).json()
const rpc = log.log.find((l) => l.startsWith("rpc "))
const body = rpc ? JSON.parse(rpc.slice(4)) : null
check(
  "envía 10 categorías sin Mascotas ni Regalos",
  body?.p_categories.length === 10 &&
    !body.p_categories.some((c) => ["Mascotas", "Regalos"].includes(c.name)),
  rpc,
)
check(
  "en el orden sugerido y con su color",
  body?.p_categories[0]?.name === "Comida" && body.p_categories[0].color === "amber",
  rpc,
)
check("nombre recortado", body?.p_display_name === "Gonzalo", rpc)
check(
  "guarda la zona horaria del dispositivo",
  (await mock()).profile.timezone === "Atlantic/Canary",
  (await mock()).profile.timezone,
)
// El resto del recorrido compara con días de Madrid.
await fetch("http://localhost:54329/__profile?timezone=Europe/Madrid")

console.log("Inicio y ajustes")
await sleep(600)
check("saludo con el nombre", (await text()).includes("Hola, Gonzalo"), await text())
await shot("06-inicio")
await audit("inicio vacío")

console.log("Registro rápido")
check(
  "sin gastos, el inicio muestra el estado vacío",
  (await text()).includes("Aún no hay gastos hoy"),
  await text(),
)
await clickSel('button[aria-label="Añadir gasto"]')
check(
  "el + abre el panel",
  await waitFor(async () => (await text()).includes("Guardar gasto")),
  await text(),
)
check(
  "sin importe no se puede guardar",
  (await evaluate("document.querySelector('#submit-expense').disabled")) === true,
)
for (const k of ["1", "2", "Coma decimal", "5"]) await keypad(k)
const shown = [...(await evaluate("document.querySelector('output').innerText"))]
  .filter((ch) => ch.trim() !== "")
  .join("")
check("el teclado escribe 12,5 €", shown === "12,5€", shown)
check(
  "viene elegida la primera categoría",
  JSON.stringify(await pressedChips()).includes("Comida"),
  JSON.stringify(await pressedChips()),
)
await clickText("Cafés")
await fill('input[placeholder="¿En qué? (opcional)"]', "Café con Marta")
await sleep(200)
await shot("08-nuevo-gasto")
await audit("nuevo gasto")
const t0 = Date.now()
await clickSel("#submit-expense")
check(
  "el panel se cierra al instante",
  await waitFor(async () => !(await text()).includes("Guardar gasto"), 800),
  `${Date.now() - t0} ms`,
)
check(
  "avisa 'Gasto guardado' con importe y categoría",
  await waitFor(async () => {
    const t = await text()
    return t.includes("Gasto guardado") && t.includes("12,50 € en Cafés")
  }, 1500),
  await text(),
)
check(
  "el gasto aparece en el inicio",
  await waitFor(async () => (await text()).includes("Café con Marta"), 6000),
  await text(),
)
let m = await mock()
const inserted = m.expenses[0]
check(
  "se guarda en céntimos con su categoría y concepto",
  inserted?.amount_cents === 1250 &&
    inserted.category_id === m.categories.find((c) => c.name === "Cafés")?.id &&
    inserted.description === "Café con Marta",
  JSON.stringify(inserted),
)
check("el total de hoy muestra 12,50 €", (await text()).includes("12,50 €"), await text())
await sleep(500)
await shot("09-inicio-con-gasto")
await audit("inicio con datos")

await clickSel('button[aria-label="Añadir gasto"]')
await waitFor(async () => (await text()).includes("Guardar gasto"))
await sleep(300)
check(
  "recuerda la última categoría usada",
  JSON.stringify(await pressedChips()) === JSON.stringify(["☕Cafés"]) ||
    JSON.stringify(await pressedChips()).includes("Cafés"),
  JSON.stringify(await pressedChips()),
)
await keyboard("4")
await keyboard("2")
await keyboard("Enter")
check(
  "se guarda con el teclado físico y Enter",
  await waitFor(async () => (await text()).includes("42,00 € en Cafés"), 2000),
  await text(),
)
await clickText("Deshacer")
check(
  "deshacer avisa 'Gasto eliminado'",
  await waitFor(async () => (await text()).includes("Gasto eliminado"), 4000),
  await text(),
)
check(
  "y el gasto ya no está guardado",
  await waitFor(async () => (await mock()).expenses.length === 1, 4000),
  JSON.stringify((await mock()).expenses),
)

await fetch("http://localhost:54329/__fail?on=1")
await clickSel('button[aria-label="Añadir gasto"]')
await waitFor(async () => (await text()).includes("Guardar gasto"))
await keypad("5")
await clickSel("#submit-expense")
check(
  "si falla el guardado, avisa con 'Reintentar'",
  await waitFor(async () => {
    const t = await text()
    return t.includes("No se ha podido guardar el gasto") && t.includes("Reintentar")
  }, 4000),
  await text(),
)
await fetch("http://localhost:54329/__fail?on=0")
await clickText("Reintentar")
check(
  "al reintentar se guarda",
  await waitFor(async () => (await mock()).expenses.length === 2, 4000),
  JSON.stringify((await mock()).expenses),
)
console.log("Historial")
await goto("/historial")
check(
  "agrupa por día con el total",
  await waitFor(async () => {
    const t = await text()
    return t.includes("Hoy") && t.includes("17,50 €")
  }),
  await text(),
)
const rowCount = () => evaluate("document.querySelectorAll('main li button').length")
check("muestra los 2 gastos", (await rowCount()) === 2, await rowCount())
await fill('input[type="search"]', "marta")
check(
  "buscar actualiza la URL y filtra",
  await waitFor(async () => (await path()).includes("q=marta") && (await rowCount()) === 1),
  `${await path()} ${await rowCount()}`,
)
await fill('input[type="search"]', "")
await waitFor(async () => !(await path()).includes("q="))
await clickText("Comida")
check(
  "sin resultados muestra el aviso",
  await waitFor(async () => (await text()).includes("No hay resultados")),
  await text(),
)
await shot("10-historial-sin-resultados")
await evaluate(
  "[...document.querySelectorAll('a')].find((a) => a.innerText.includes('Quitar filtros')).click()",
)
check(
  "'Quitar filtros' vuelve a la lista completa",
  await waitFor(async () => (await rowCount()) === 2),
  await rowCount(),
)
await shot("11-historial")
await audit("historial")

await evaluate(
  "[...document.querySelectorAll('main li button')].find((b) => b.innerText.includes('Café con Marta')).click()",
)
check(
  "tocar un gasto abre 'Editar gasto'",
  await waitFor(async () => (await text()).includes("Editar gasto")),
  await text(),
)
const editShown = [...(await evaluate("document.querySelector('output').innerText"))]
  .filter((ch) => ch.trim() !== "")
  .join("")
check("viene con su importe", editShown === "12,5€", editShown)
check(
  "y su categoría",
  JSON.stringify(await pressedChips()).includes("Cafés"),
  JSON.stringify(await pressedChips()),
)
await shot("12-editar")
await audit("editar gasto")
for (const k of ["Borrar", "Borrar", "Borrar", "Borrar", "9"]) await keypad(k)
await clickText("Guardar cambios")
check(
  "guardar cambios avisa",
  await waitFor(async () => (await text()).includes("Cambios guardados")),
  await text(),
)
check(
  "y actualiza el importe",
  await waitFor(
    async () =>
      (await mock()).expenses.find((e) => e.description === "Café con Marta")?.amount_cents === 900,
    4000,
  ),
  JSON.stringify((await mock()).expenses),
)
check(
  "conserva la hora original",
  (await mock()).expenses.find((e) => e.description === "Café con Marta")?.spent_at ===
    inserted.spent_at,
  JSON.stringify((await mock()).expenses),
)
await waitFor(async () => (await text()).includes("9,00 €"), 4000)
await evaluate(
  "[...document.querySelectorAll('main li button')].find((b) => b.innerText.includes('Café con Marta')).click()",
)
await waitFor(async () => (await text()).includes("Eliminar gasto"))
await clickText("Eliminar gasto")
check(
  "eliminar lo quita de la lista al instante",
  await waitFor(async () => !(await text()).includes("Café con Marta"), 800),
  await text(),
)
check(
  "y en el servidor",
  await waitFor(async () => (await mock()).expenses.length === 1, 4000),
  (await mock()).expenses.length,
)
await clickText("Deshacer")
check(
  "deshacer lo recupera",
  await waitFor(
    async () => (await mock()).expenses.length === 2 && (await text()).includes("Café con Marta"),
    5000,
  ),
  await text(),
)

console.log("Estadísticas")
await goto("/estadisticas")
const monthTotal = (await mock()).expenses.reduce((a, e) => a + e.amount_cents, 0)
const euros = (cents) =>
  new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" })
    .format(cents / 100)
    .replace(/ /g, " ")
check(
  "muestra el total del mes",
  await waitFor(async () => (await text()).includes(euros(monthTotal))),
  `${euros(monthTotal)} | ${await text()}`,
)
check(
  "reparto por categoría con porcentaje",
  (await text()).includes("Por categoría") &&
    (await text()).includes("Cafés") &&
    (await text()).includes("100 %"),
  await text(),
)
check(
  "dibuja el gráfico de 6 meses",
  (await evaluate("document.querySelectorAll('.recharts-bar-rectangle').length")) === 6,
  await evaluate("document.querySelectorAll('.recharts-bar-rectangle').length"),
)
check(
  "incluye la tabla para lectores de pantalla",
  (await evaluate("document.querySelectorAll('table.sr-only tbody tr').length")) === 6,
)
check(
  "no deja ir a meses futuros",
  (await evaluate("document.querySelectorAll('a[aria-label=\"Mes siguiente\"]').length")) === 0,
)
await sleep(400)
await shot("15-estadisticas")
await audit("estadísticas")
await clickSel('a[aria-label="Mes anterior"]')
check(
  "el mes anterior sin gastos muestra el estado vacío",
  await waitFor(
    async () => (await path()).includes("m=") && (await text()).includes("Sin gastos en"),
  ),
  `${await path()} ${await text()}`,
)
check(
  "y ya deja volver al mes siguiente",
  (await evaluate("document.querySelectorAll('a[aria-label=\"Mes siguiente\"]').length")) === 1,
)
await goto("/estadisticas?m=2099-01")
check(
  "un mes futuro en la URL vuelve al actual",
  (await text()).includes(euros(monthTotal)),
  await text(),
)
await goto("/")
check(
  "el inicio muestra las categorías del mes",
  await waitFor(
    async () => (await text()).includes("Categorías") && (await text()).includes("Ver todo"),
  ),
  await text(),
)
await shot("16-inicio-categorias")

console.log("Presupuestos")
await goto("/ajustes")
await evaluate(
  "[...document.querySelectorAll('a')].find((a) => a.innerText.includes('Presupuestos')).click()",
)
check(
  "Ajustes lleva a Presupuestos",
  await waitFor(async () => (await path()) === "/ajustes/presupuestos"),
  await path(),
)
check(
  "la pestaña Ajustes sigue marcada",
  (await evaluate("document.querySelector('nav a[aria-current=page]')?.innerText")) === "Ajustes",
)
const cafesId = (await mock()).categories.find((c) => c.name === "Cafés").id
check(
  "sin Premium, los de categoría tienen candado",
  (await text()).includes("Desbloquear con Premium") &&
    (await evaluate(`document.querySelector('#budget-${cafesId}').disabled`)) === true,
  await text(),
)
check(
  "y el total sí se puede editar",
  (await evaluate("document.querySelector('#budget-total').disabled")) === false,
)
await shot("16b-presupuestos-candado")
await audit("presupuestos con candado")
// Fundador: Premium concedido a mano.
await fetch("http://localhost:54329/__profile?premium_comp=true")
await goto("/ajustes/presupuestos")
await fill("#budget-total", "doce")
await clickText("Guardar presupuestos")
check(
  "un importe no válido se marca y avisa",
  await waitFor(
    async () =>
      (await text()).includes("Revisa los importes marcados") &&
      (await evaluate("document.querySelector('#budget-total').getAttribute('aria-invalid')")) ===
        "true",
  ),
  await text(),
)
check(
  "y no se pierde lo escrito",
  (await evaluate("document.querySelector('#budget-total').value")) === "doce",
)
await fill("#budget-total", "20")
await fill(`#budget-${cafesId}`, "10,00")
await clickText("Guardar presupuestos")
check(
  "guarda y avisa",
  await waitFor(async () => (await text()).includes("Presupuestos guardados")),
  await text(),
)
const saved = (await mock()).budgets
check(
  "guarda los importes en céntimos",
  JSON.stringify(saved) ===
    JSON.stringify([
      { category_id: null, amount_cents: 2000 },
      { category_id: cafesId, amount_cents: 1000 },
    ]),
  JSON.stringify(saved),
)
await sleep(500)
await shot("17-presupuestos")
await audit("presupuestos")
await goto("/")
check(
  "el inicio avisa de que te has pasado en Cafés",
  await waitFor(async () => (await text()).includes("Te has pasado del presupuesto de Cafés")),
  await text(),
)
check("y el anillo muestra el % del total", (await text()).includes("70 %"), await text())
await shot("18-inicio-presupuesto")
await fetch("http://localhost:54329/__profile?premium_comp=false")
await goto("/")
check(
  "si deja de ser Premium, el aviso de categoría se pausa",
  !(await text()).includes("Te has pasado del presupuesto de Cafés"),
  await text(),
)
await goto("/ajustes/presupuestos")
await waitFor(async () => (await text()).includes("En pausa"))
check(
  "y los presupuestos de categoría quedan en pausa, sin borrarse",
  (await text()).includes("En pausa") &&
    (await evaluate(`document.querySelector('#budget-${cafesId}').value`)) === "10",
  await text(),
)
await fetch("http://localhost:54329/__profile?premium_comp=true")
await goto("/ajustes/presupuestos")
await fill(`#budget-${cafesId}`, "")
await clickText("Guardar presupuestos")
await waitFor(async () => (await mock()).budgets.length === 1)
await goto("/")
check(
  "sin excesos, dice cuánto llevas del total",
  await waitFor(async () =>
    (await text()).includes("Vas bien: llevas 14,00 € de 20,00 € este mes"),
  ),
  await text(),
)

console.log("Categorías")
await goto("/ajustes")
await evaluate(
  "[...document.querySelectorAll('a')].find((a) => a.innerText.includes('Categorías')).click()",
)
check(
  "Ajustes lleva a Categorías",
  await waitFor(async () => (await path()) === "/ajustes/categorias"),
  await path(),
)
const catRows = () => evaluate("document.querySelectorAll('main ul li').length")
check("lista las 10 categorías elegidas", (await catRows()) === 10, await catRows())
const openNew = async () => {
  await clickText("Nueva categoría")
  await waitFor(async () => (await text()).includes("Crear categoría"))
}
await openNew()
await clickText("Crear categoría")
check(
  "sin nombre avisa",
  await waitFor(async () => (await text()).includes("Ponle un nombre a la categoría")),
  await text(),
)
await fill("#category-name", "Gimnasio")
await evaluate(
  "[...document.querySelectorAll('[aria-label=Sugerencias] button')].find((b) => b.innerText.includes('🏋')).click()",
)
await clickSel('[role=radio][aria-label="Océano"]')
await sleep(200)
await shot("20-nueva-categoria")
await audit("nueva categoría")
await clickText("Crear categoría")
check(
  "crea la categoría",
  await waitFor(async () => (await text()).includes("Categoría creada")),
  await text(),
)
const gym = (await mock()).categories.find((c) => c.name === "Gimnasio")
check(
  "con su emoji, color y al final",
  gym?.emoji === "🏋️" && gym.color === "ocean" && gym.position === 10,
  JSON.stringify(gym),
)
await waitFor(async () => (await catRows()) === 11)
await openNew()
await fill("#category-name", "comida")
await clickText("Crear categoría")
check(
  "no deja repetir nombre",
  await waitFor(async () => (await text()).includes("Ya tienes una categoría con ese nombre")),
  await text(),
)
await keyboard("Escape")
await sleep(400)
await clickSel('button[aria-label="Subir Gimnasio"]')
check(
  "subir cambia el orden",
  await waitFor(
    async () => (await mock()).categories.find((c) => c.name === "Gimnasio")?.position === 9,
    4000,
  ),
  JSON.stringify((await mock()).categories.map((c) => c.name + c.position)),
)
await clickSel('button[aria-label="Editar Cafés"]')
await waitFor(async () => (await text()).includes("Editar categoría"))
await fill("#category-name", "Café")
await clickText("Guardar cambios")
check(
  "renombra la categoría",
  await waitFor(async () => (await mock()).categories.some((c) => c.name === "Café"), 4000),
  JSON.stringify((await mock()).categories.map((c) => c.name)),
)
await waitFor(
  async () =>
    await evaluate("Boolean(document.querySelector('button[aria-label=\"Editar Café\"]'))"),
  4000,
)
await clickSel('button[aria-label="Editar Café"]')
await waitFor(async () => (await text()).includes("Archivar"))
await clickText("Archivar")
check(
  "archivar la pasa a Archivadas",
  await waitFor(
    async () => (await text()).includes("Archivadas") && (await text()).includes("Restaurar"),
    4000,
  ),
  await text(),
)
await shot("21-categorias")
await audit("categorías")
await goto("/historial")
await evaluate(
  "[...document.querySelectorAll('main li button')].find((b) => b.innerText.includes('Café con Marta')).click()",
)
await waitFor(async () => (await text()).includes("Editar gasto"))
check(
  "un gasto de categoría archivada se puede editar con su categoría",
  JSON.stringify(await pressedChips()).includes("Café"),
  JSON.stringify(await pressedChips()),
)
await keyboard("Escape")
await goto("/ajustes/categorias")
await clickText("Restaurar")
check(
  "restaurar la devuelve",
  await waitFor(async () => !(await text()).includes("Archivadas"), 4000),
  await text(),
)

console.log("Perfil y datos")
await goto("/ajustes")
await fill("#display-name", "Gonzalo D.")
await clickText("Guardar")
check(
  "cambia el nombre",
  await waitFor(async () => (await mock()).profile.display_name === "Gonzalo D.", 4000),
  (await mock()).profile.display_name,
)
const csv = await evaluate(
  "fetch('/ajustes/exportar').then(async (r) => ({ type: r.headers.get('content-type'), disposition: r.headers.get('content-disposition'), body: await r.text() }))",
)
check(
  "exporta los gastos en CSV",
  csv.type.includes("text/csv") &&
    csv.disposition.includes("zumito-gastos-") &&
    csv.body.includes("Fecha;Hora;Importe;Categoría;Concepto;Lugar;Con quién;Ánimo;Nota"),
  JSON.stringify(csv).slice(0, 300),
)
check(
  "con importes en formato español",
  csv.body.includes(";9,00;Café;Café con Marta;"),
  csv.body.slice(0, 300),
)

console.log("Más detalles")
const fillArea = (sel, value) =>
  evaluate(
    `(() => { const el = document.querySelector(${JSON.stringify(sel)}); const set = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set; set.call(el, ${JSON.stringify(value)}); el.dispatchEvent(new Event('input', { bubbles: true })); return true })()`,
  )
const detailsExpanded = () =>
  evaluate(
    "[...document.querySelectorAll('button')].find((b) => b.innerText.includes('Más detalles'))?.getAttribute('aria-expanded')",
  )
const dialogButton = (label) =>
  `[...document.querySelectorAll('[role=dialog] button')].find((b) => b.innerText.trim() === ${JSON.stringify(label)})`
const openAdd = async () => {
  await clickSel('button[aria-label="Añadir gasto"]')
  await waitFor(async () => (await text()).includes("Guardar gasto"))
  await sleep(300)
}
await goto("/")
await openAdd()
check(
  "los detalles empiezan plegados",
  (await detailsExpanded()) === "false",
  await detailsExpanded(),
)
for (const k of ["2", "3", "Coma decimal", "5"]) await keypad(k)
await clickText("Más detalles")
check("se despliegan al tocar", await waitFor(async () => (await detailsExpanded()) === "true"))
await fill("input[role=combobox]", "Mercadona")
await clickText("Añadir persona")
await waitFor(
  async () =>
    await evaluate(`Boolean(document.querySelector('input[aria-label="Nombre de la persona"]'))`),
)
await fill('input[aria-label="Nombre de la persona"]', "Marta")
await keyboard("Enter")
check(
  "la persona nueva aparece como chip marcado",
  await waitFor(async () =>
    JSON.stringify(
      await evaluate(
        `[...document.querySelectorAll('[aria-label="Con quién"] [data-pressed]')].map((b) => b.innerText.trim())`,
      ),
    ).includes("Marta"),
  ),
)
await fill("input[type=time]", "09:15")
await fillArea("textarea", "Compra semanal")
await clickSel('button[aria-label="Bien"]')
await audit("más detalles")
await shot("23-mas-detalles")
const beforeDetails = (await mock()).expenses.length
await clickSel("#submit-expense")
check(
  "guarda con los detalles",
  await waitFor(async () => (await mock()).expenses.length === beforeDetails + 1, 5000),
)
let m2 = await mock()
const detailed = m2.expenses.find((e) => e.amount_cents === 2350)
const localTime = (iso) =>
  new Intl.DateTimeFormat("es-ES", {
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone: "Atlantic/Canary",
  }).format(new Date(iso))
check(
  "con lugar, persona, nota, ánimo y la hora elegida",
  m2.places.some((p) => p.name === "Mercadona" && p.id === detailed?.place_id) &&
    m2.people.some((p) => p.name === "Marta" && detailed?.person_ids.includes(p.id)) &&
    detailed?.note === "Compra semanal" &&
    detailed?.mood === "good" &&
    localTime(detailed.spent_at) === "09:15",
  JSON.stringify({ detailed, places: m2.places, people: m2.people }),
)

await openAdd()
await keypad("4")
await clickText("Más detalles")
await fill("input[role=combobox]", "mer")
check(
  "autocompleta el lugar por lo usado",
  await waitFor(async () =>
    (
      await evaluate("[...document.querySelectorAll('[role=option]')].map((o) => o.innerText)")
    ).includes("Mercadona"),
  ),
)
await evaluate("document.querySelector('input[role=combobox]').focus()")
await keyboard("ArrowDown")
await keyboard("Enter")
check(
  "elige la sugerencia con el teclado",
  (await evaluate("document.querySelector('input[role=combobox]').value")) === "Mercadona",
)
await evaluate(
  `[...document.querySelectorAll('[aria-label="Con quién"] button')].find((b) => b.innerText.trim() === 'Marta').click()`,
)
await sleep(200)
await clickSel("#submit-expense")
await waitFor(async () => (await mock()).expenses.some((e) => e.amount_cents === 400), 5000)
m2 = await mock()
const second = m2.expenses.find((e) => e.amount_cents === 400)
check(
  "reutiliza el lugar y la persona sin duplicarlos",
  m2.places.length === 1 &&
    m2.people.length === 1 &&
    second?.place_id === m2.places[0].id &&
    second.person_ids[0] === m2.people[0].id,
  JSON.stringify({ second, places: m2.places, people: m2.people }),
)

console.log("Filtros del historial")
await goto("/historial")
const historyRows = () => evaluate("document.querySelectorAll('main li button').length")
const allRows = await historyRows()
await clickText("Lugar")
await waitFor(async () => await evaluate(`Boolean(${dialogButton("Mercadona")})`))
await audit("filtro de lugar")
await evaluate(dialogButton("Mercadona") + ".click()")
check(
  "filtra por lugar",
  await waitFor(async () => (await path()).includes("l=") && (await historyRows()) === 2, 5000),
  `${await path()} ${await historyRows()}`,
)
await goto("/historial")
await clickText("Persona")
await waitFor(async () => await evaluate(`Boolean(${dialogButton("Marta")})`))
await evaluate(dialogButton("Marta") + ".click()")
check(
  "filtra por persona",
  await waitFor(async () => (await path()).includes("p=") && (await historyRows()) === 2, 5000),
  `${await path()} ${await historyRows()}`,
)
await goto("/historial")
await clickText("Importe")
await waitFor(async () => await evaluate("Boolean(document.querySelector('#amount-min'))"))
await fill("#amount-min", "20")
await clickText("Aplicar")
check(
  "filtra por importe mínimo",
  await waitFor(async () => (await path()).includes("min=20") && (await historyRows()) === 1, 5000),
  `${await path()} ${await historyRows()}`,
)
check("y el chip muestra el filtro", (await text()).includes("Desde 20,00 €"), await text())
await shot("24-historial-filtros")
await goto("/historial?min=abc&l=no-es-un-id")
check(
  "parámetros de filtro no válidos se ignoran",
  (await historyRows()) === allRows,
  `${await historyRows()} de ${allRows}`,
)

console.log("Añadir desde un enlace (/add)")
const outputText = async () =>
  [...(await evaluate("document.querySelector('output')?.innerText ?? ''"))]
    .filter((ch) => ch.trim() !== "")
    .join("")
await goto("/add?categoria=CAFE&importe=3,5&descripcion=Caf%C3%A9%20solo&lugar=Bar%20Pepe")
await waitFor(async () => (await text()).includes("Guardar gasto"))
check("prellena el importe", (await outputText()) === "3,5€", await outputText())
check(
  "prellena la categoría por nombre sin distinguir mayúsculas ni tildes",
  JSON.stringify(await pressedChips()).includes("Café"),
  JSON.stringify(await pressedChips()),
)
check(
  "prellena el concepto",
  (await evaluate(`document.querySelector('input[placeholder="¿En qué? (opcional)"]').value`)) ===
    "Café solo",
)
check(
  "y el lugar, con los detalles abiertos",
  (await evaluate("document.querySelector('input[role=combobox]')?.value")) === "Bar Pepe",
)
await audit("añadir desde enlace")
await shot("25-add-enlace")
await clickSel("#submit-expense")
check(
  "al guardar vuelve al inicio",
  await waitFor(async () => (await path()) === "/", 4000),
  await path(),
)
check(
  "y guarda el gasto del enlace",
  await waitFor(
    async () =>
      (await mock()).expenses.some((e) => e.amount_cents === 350 && e.description === "Café solo"),
    5000,
  ),
)
await goto("/add?categoria=Nada&importe=2000000")
check(
  "avisa de categoría desconocida",
  await waitFor(async () => (await text()).includes("No tienes ninguna categoría llamada «Nada»")),
  await text(),
)
check(
  "y de importe no válido (tope de 1.000.000 €)",
  (await text()).includes("El importe del enlace no es válido"),
)
check("sin prellenar el importe inválido", (await outputText()) === "0€", await outputText())

console.log("PWA y sin conexión")
await goto("/")
check(
  "registra el service worker",
  await waitFor(
    async () =>
      await evaluate(
        "navigator.serviceWorker.getRegistration().then((r) => Boolean(r && (r.active || r.installing || r.waiting)))",
      ),
    10000,
  ),
)
await send("Network.enable")
const network = async (offline) => {
  await send("Network.emulateNetworkConditions", {
    offline,
    latency: 0,
    downloadThroughput: -1,
    uploadThroughput: -1,
  })
  await waitFor(async () => (await evaluate("navigator.onLine")) === !offline, 3000)
}
await network(true)
await sleep(400)
const beforeOffline = (await mock()).expenses.length
await clickSel('button[aria-label="Añadir gasto"]')
await waitFor(async () => (await text()).includes("Guardar gasto"))
await keypad("7")
await clickSel("#submit-expense")
check(
  "sin conexión, avisa de que se guardará después",
  await waitFor(
    async () => (await text()).includes("Sin conexión: lo guardaremos en cuanto vuelva"),
    3000,
  ),
  await text(),
)
check(
  "queda en la cola del navegador",
  (await evaluate("JSON.parse(localStorage.getItem('zumito:pending-expenses') ?? '[]').length")) ===
    1,
)
check("y no ha llegado al servidor", (await mock()).expenses.length === beforeOffline)
await shot("19-sin-conexion")
await network(false)
check(
  "al volver la conexión se guarda solo",
  await waitFor(async () => (await mock()).expenses.length === beforeOffline + 1, 8000),
  (await mock()).expenses.length,
)
check(
  "avisa de que se han guardado los pendientes",
  await waitFor(async () => (await text()).includes("Gastos pendientes guardados"), 4000),
  await text(),
)
check(
  "y la cola queda vacía",
  (await evaluate("JSON.parse(localStorage.getItem('zumito:pending-expenses') ?? '[]').length")) ===
    0,
)
await network(true)
await clickSel('button[aria-label="Añadir gasto"]')
await waitFor(async () => (await text()).includes("Guardar gasto"))
await keypad("3")
await clickSel("#submit-expense")
await waitFor(async () => (await text()).includes("Sin conexión"))
await clickText("Deshacer")
check(
  "deshacer sin conexión lo quita de la cola",
  await waitFor(
    async () =>
      (await evaluate(
        "JSON.parse(localStorage.getItem('zumito:pending-expenses') ?? '[]').length",
      )) === 0,
    3000,
  ),
)
await network(false)
await sleep(1500)
check(
  "y no se envía al volver la red",
  (await mock()).expenses.length === beforeOffline + 1,
  (await mock()).expenses.length,
)

console.log("Pantalla pequeña (iPhone SE)")
await send("Emulation.setDeviceMetricsOverride", {
  width: 375,
  height: 667,
  deviceScaleFactor: 2,
  mobile: true,
})
await goto("/")
await clickSel('button[aria-label="Añadir gasto"]')
await waitFor(async () => (await text()).includes("Guardar gasto"))
await sleep(500)
await shot("13-se-panel")
const reach = await evaluate(
  `(() => { const popup = document.querySelector('[data-slot=sheet-content]'); const btn = document.querySelector('#submit-expense'); popup.scrollTop = popup.scrollHeight; const r = btn.getBoundingClientRect(); return { scrollable: popup.scrollHeight > popup.clientHeight, visible: r.bottom <= innerHeight && r.top >= 0, bottom: Math.round(r.bottom), h: innerHeight } })()`,
)
check(
  "el panel cabe o se puede desplazar hasta 'Guardar gasto'",
  reach.visible,
  JSON.stringify(reach),
)
await sleep(200)
await shot("14-se-panel-abajo")
await keyboard("Escape")
await send("Emulation.setDeviceMetricsOverride", {
  width: 390,
  height: 844,
  deviceScaleFactor: 2,
  mobile: true,
})

await goto("/login")
check("con sesión, /login lleva al inicio", (await path()) === "/", await path())
await goto("/onboarding")
check("con onboarding hecho, /onboarding lleva al inicio", (await path()) === "/", await path())
await goto("/ajustes")
check("ajustes muestra el email", (await text()).includes("gonzalo@test.es"), await text())
check(
  "y el plan: Fundador",
  (await text()).includes("Fundador · Premium para siempre"),
  await text(),
)
await shot("07-ajustes")
await audit("ajustes")
// Un gasto pendiente de esta cuenta y pantallas en caché: no deben quedar en el dispositivo.
await evaluate(
  `localStorage.setItem('zumito:pending-expenses', JSON.stringify([{ id: '${crypto.randomUUID()}', categoryId: '${crypto.randomUUID()}', amountCents: 100, spentAt: new Date().toISOString() }]))`,
)
// Ninguna pantalla privada puede quedar en caché (la precaché y /login no tienen datos).
const privateCached = async () =>
  evaluate(`(async () => {
    const privatePaths = ["/", "/historial", "/estadisticas", "/ajustes"]
    const found = []
    for (const key of await caches.keys()) {
      if (key.includes("precache")) continue
      for (const request of await (await caches.open(key)).keys()) {
        const path = new URL(request.url).pathname
        if (privatePaths.some((p) => path === p || path.startsWith(p + "/"))) found.push(key + " " + path)
      }
    }
    return found
  })()`)
const privateBefore = await privateCached()
await clickText("Cerrar sesión")
check(
  "cerrar sesión lleva a /login",
  await waitFor(async () => (await path()) === "/login"),
  await path(),
)
check(
  "cerrar sesión vacía la cola sin conexión",
  (await evaluate("localStorage.getItem('zumito:pending-expenses')")) === null,
)
check(
  "antes de cerrar sesión había pantallas privadas en caché",
  privateBefore.length > 0,
  JSON.stringify(privateBefore),
)
check(
  "y al cerrarla no deja ninguna",
  await waitFor(async () => (await privateCached()).length === 0, 4000),
  JSON.stringify(await privateCached()),
)
await goto("/")
check("tras cerrar sesión, / vuelve a pedir login", (await path()) === "/login", await path())

console.log("Enlace del email")
await goto("/auth/confirm?token_hash=malo&type=email")
check(
  "enlace inválido vuelve al login con aviso",
  (await path()) === "/login?error=link" && (await text()).includes("El enlace no es válido"),
  `${await path()}`,
)

console.log("Enlace /add sin sesión")
await goto("/add?categoria=Comida&importe=5")
check(
  "sin sesión, /add lleva al login recordando a dónde iba",
  (await path()).startsWith("/login?next=") &&
    decodeURIComponent(await path()).includes("/add?categoria=Comida&importe=5"),
  await path(),
)
await fill("#email", "gonzalo@test.es")
await clickText("Enviarme el código")
await waitFor(async () => (await text()).includes("Revisa tu email"))
await fill("#code", "123456")
await clickText("Entrar")
check(
  "tras entrar vuelve a /add con los mismos parámetros",
  await waitFor(async () => (await path()) === "/add?categoria=Comida&importe=5", 6000),
  await path(),
)
const afterLogin = [...(await evaluate("document.querySelector('output')?.innerText ?? ''"))]
  .filter((ch) => ch.trim() !== "")
  .join("")
check("y el formulario sigue prellenado", afterLogin === "5€", afterLogin)
await goto("/login?next=https://malo.example")
check("un next externo no redirige fuera", (await path()) === "/", await path())

console.log("Borrar la cuenta")
await goto("/ajustes")
await clickText("Borrar mi cuenta")
check(
  "pide confirmación",
  await waitFor(async () => (await text()).includes("¿Borrar tu cuenta?")),
  await text(),
)
await shot("22-borrar-cuenta")
await clickText("Sí, borrar todo")
check(
  "borra la cuenta y vuelve al login",
  await waitFor(
    async () => (await path()) === "/login" && (await mock()).log.includes("delete account"),
    6000,
  ),
  await path(),
)

console.log(fails ? `\n${fails} fallos` : "\nFlujo completo correcto")
ws.close()
await cleanup()
process.exit(fails ? 1 : 0)
