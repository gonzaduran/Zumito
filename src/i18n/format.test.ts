import { describe, expect, it } from "vitest"

import { calendarDay, formatCents, formatDate, formatMoment, formatMonth } from "./format"

const labels = { today: "Hoy", yesterday: "Ayer" }
const clean = (text: string) => text.replace(/ /g, " ")

describe("formato", () => {
  it("formatea céntimos en euros", () => {
    expect(clean(formatCents(1250))).toBe("12,50 €")
    expect(clean(formatCents(0))).toBe("0,00 €")
  })

  it("fecha dd/mm/aaaa en la zona del usuario", () => {
    // 22:30 UTC del 30/09 son las 00:30 del 01/10 en Madrid.
    const date = new Date("2026-09-30T22:30:00Z")
    expect(formatDate(date)).toBe("01/10/2026")
    expect(formatDate(date, { timeZone: "UTC" })).toBe("30/09/2026")
  })

  it("el mes depende de la zona del usuario, no del servidor", () => {
    const date = new Date("2026-09-30T22:30:00Z")
    expect(formatMonth(date)).toBe("Octubre")
    expect(formatMonth(date, { timeZone: "UTC" })).toBe("Septiembre")
  })

  it("Hoy y Ayer según el día de calendario local", () => {
    const now = new Date("2026-10-01T10:00:00Z") // 12:00 en Madrid
    expect(formatMoment(new Date("2026-09-30T22:30:00Z"), labels, { now })).toBe("Hoy · 00:30")
    expect(formatMoment(new Date("2026-09-30T21:30:00Z"), labels, { now })).toBe("Ayer · 23:30")
    expect(formatMoment(new Date("2026-09-29T08:05:00Z"), labels, { now })).toBe(
      "29/09/2026 · 10:05",
    )
  })

  it("Ayer funciona el día del cambio de hora", () => {
    // 25/10/2026: en Madrid se atrasa el reloj (el día tiene 25 horas).
    const now = new Date("2026-10-25T23:30:00Z") // lunes 26/10 00:30 en Madrid
    expect(calendarDay(now)).toBe("2026-10-26")
    expect(formatMoment(new Date("2026-10-25T00:30:00Z"), labels, { now })).toBe("Ayer · 02:30")
  })
})
