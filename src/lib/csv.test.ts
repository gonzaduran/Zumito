import { describe, expect, it } from "vitest"

import { escapeCsvCell, toCsv } from "./csv"

describe("CSV", () => {
  it("deja el texto normal tal cual", () => {
    expect(escapeCsvCell("Mercadona")).toBe("Mercadona")
    expect(escapeCsvCell("12,50")).toBe("12,50")
  })

  it("entrecomilla separadores, comillas y saltos de línea", () => {
    expect(escapeCsvCell("Cena; copas")).toBe('"Cena; copas"')
    expect(escapeCsvCell('El "bueno"')).toBe('"El ""bueno"""')
    expect(escapeCsvCell("línea 1\nlínea 2")).toBe('"línea 1\nlínea 2"')
  })

  it("neutraliza fórmulas", () => {
    expect(escapeCsvCell("=HYPERLINK(1)")).toBe("'=HYPERLINK(1)")
    expect(escapeCsvCell("@SUM(A1)")).toBe("'@SUM(A1)")
  })

  it("une filas con ; y CRLF, con BOM al principio", () => {
    expect(
      toCsv([
        ["Fecha", "Importe"],
        ["01/10/2026", "12,50"],
      ]),
    ).toBe("﻿Fecha;Importe\r\n01/10/2026;12,50\r\n")
  })
})
