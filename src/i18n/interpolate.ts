/** Sustituye `{clave}` en un texto del diccionario. Ej.: interpolate("Hola, {name}", { name: "Ana" }) */
export function interpolate(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in values ? String(values[key]) : match,
  )
}
