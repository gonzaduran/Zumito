/**
 * Reparte un total entre varias personas a partes iguales, en céntimos. Lo que no se
 * puede dividir exacto (10 € entre 3) se lo llevan las primeras: 3,34 + 3,33 + 3,33.
 */
export function splitEqually(totalCents: number, people: number): number[] {
  if (people <= 0 || totalCents <= 0) return []
  const base = Math.floor(totalCents / people)
  const remainder = totalCents - base * people
  return Array.from({ length: people }, (_, index) => base + (index < remainder ? 1 : 0))
}

/** Lo que falta por asignar (positivo) o lo que sobra (negativo). */
export function remainingCents(totalCents: number, shares: number[]): number {
  return totalCents - shares.reduce((sum, share) => sum + share, 0)
}
