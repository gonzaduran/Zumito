/** Opción de autocompletado: lugar o persona con su número de usos. */
export type NamedOption = { id: string; name: string; uses: number }

/** Minúsculas y sin tildes, para comparar "Café" con "cafe". */
export const normalizeName = (value: string) =>
  value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .trim()
    .toLowerCase()

/**
 * Sugerencias para lo que se está escribiendo: primero las que empiezan por el texto,
 * luego las que lo contienen; dentro de cada grupo, las más usadas antes.
 * Sin texto, las más usadas. No sugiere el valor exacto ya escrito.
 */
export function suggest(query: string, options: NamedOption[], limit = 5): NamedOption[] {
  const needle = normalizeName(query)
  const byUses = [...options].sort((a, b) => b.uses - a.uses || a.name.localeCompare(b.name))
  if (!needle) return byUses.slice(0, limit)

  const starts: NamedOption[] = []
  const contains: NamedOption[] = []
  for (const option of byUses) {
    const name = normalizeName(option.name)
    if (name === needle) continue
    if (name.startsWith(needle)) starts.push(option)
    else if (name.includes(needle)) contains.push(option)
  }
  return [...starts, ...contains].slice(0, limit)
}

/** Busca una opción por nombre, sin distinguir mayúsculas ni tildes. */
export function findByName<T extends { name: string }>(options: T[], name: string): T | undefined {
  const needle = normalizeName(name)
  return needle ? options.find((option) => normalizeName(option.name) === needle) : undefined
}
