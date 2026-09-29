import { expect, it } from "vitest"

import { settle } from "./settle"

it("devuelve el resultado o { ok: false } si la acción falla por red", async () => {
  await expect(settle(Promise.resolve({ ok: true }))).resolves.toEqual({ ok: true })
  await expect(settle(Promise.reject(new TypeError("Failed to fetch")))).resolves.toEqual({
    ok: false,
  })
})
