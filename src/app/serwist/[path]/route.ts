import { spawnSync } from "node:child_process"

import { createSerwistRoute } from "@serwist/turbopack"

/** Versión de la página sin conexión: el commit desplegado (Vercel) o el local. */
const revision =
  process.env.VERCEL_GIT_COMMIT_SHA ??
  (spawnSync("git", ["rev-parse", "HEAD"], { encoding: "utf-8" }).stdout?.trim() ||
    crypto.randomUUID())

/** Sirve el service worker compilado en /serwist/sw.js. */
export const { dynamic, dynamicParams, revalidate, generateStaticParams, GET } = createSerwistRoute(
  {
    additionalPrecacheEntries: [{ url: "/~offline", revision }],
    swSrc: "src/app/sw.ts",
    useNativeEsbuild: true,
  },
)
