/**
 * CSV para Excel en español: separador ";" (la coma es el decimal), BOM UTF-8 para
 * que se lean bien las tildes y saltos de línea CRLF.
 */

const SEPARATOR = ";"

export function escapeCsvCell(value: string): string {
  // Evita que Excel interprete el texto como fórmula (inyección CSV).
  const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value
  return /[";\r\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe
}

export function toCsv(rows: string[][]): string {
  return `﻿${rows.map((row) => row.map(escapeCsvCell).join(SEPARATOR)).join("\r\n")}\r\n`
}
