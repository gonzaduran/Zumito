// Pruebas de extremo a extremo: compila la app contra un Supabase simulado y la recorre
// con Chrome en modo claro y oscuro. Uso: npm run test:e2e
import { spawn, spawnSync } from "node:child_process"
import { readFileSync, rmSync, writeFileSync } from "node:fs"
import { createRequire } from "node:module"

const require = createRequire(import.meta.url)
const nextBin = require.resolve("next/dist/bin/next")
const PORT = 3123
const MOCK_PORT = 54329
// Compilación aparte: no pisa la de desarrollo ni usa tu .env.local.
const env = {
  ...process.env,
  NEXT_DIST_DIR: ".next-e2e",
  NEXT_PUBLIC_SUPABASE_URL: `http://localhost:${MOCK_PORT}`,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "clave-de-prueba",
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
async function waitForUrl(url) {
  for (let i = 0; i < 120; i++) {
    try {
      await fetch(url)
      return
    } catch {
      await sleep(500)
    }
  }
  throw new Error(`No responde ${url}`)
}
const startMock = async () => {
  const mock = spawn(process.execPath, ["e2e/mock-supabase.mjs"], { stdio: "ignore" })
  await waitForUrl(`http://localhost:${MOCK_PORT}/__log`)
  return mock
}

// Next añade la carpeta de compilación a tsconfig.json: se restaura al terminar.
const tsconfig = readFileSync("tsconfig.json", "utf8")
const restoreTsconfig = () => writeFileSync("tsconfig.json", tsconfig)

console.log("Compilando contra el Supabase simulado…")
const build = spawnSync(process.execPath, [nextBin, "build"], { env, stdio: "inherit" })
if (build.status !== 0) {
  restoreTsconfig()
  process.exit(build.status ?? 1)
}

const server = spawn(process.execPath, [nextBin, "start", "-p", String(PORT)], {
  env,
  stdio: "ignore",
})
let failed = false
try {
  await waitForUrl(`http://localhost:${PORT}/login`)
  for (const scheme of ["light", "dark"]) {
    console.log(`\n=== Modo ${scheme === "light" ? "claro" : "oscuro"} ===`)
    // Un servidor simulado nuevo en cada pasada: el recorrido empieza sin datos.
    const mock = await startMock()
    const run = spawnSync(process.execPath, ["e2e/flow.mjs", "e2e/screenshots", scheme], {
      stdio: "inherit",
    })
    mock.kill()
    if (run.status !== 0) failed = true
  }
} finally {
  server.kill()
  await sleep(500)
  rmSync(".next-e2e", { recursive: true, force: true })
  restoreTsconfig()
}
process.exit(failed ? 1 : 0)
