import "server-only"

import { cache } from "react"

import { isCategoryColor, type CategoryColor } from "@/lib/category-colors"
import { createClient } from "@/lib/supabase/server"

export type Category = { id: string; name: string; emoji: string; color: CategoryColor }

/** Categorías activas del usuario, en su orden. */
export const getCategories = cache(async (): Promise<Category[]> => {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("categories")
    .select("id, name, emoji, color")
    .is("archived_at", null)
    .order("position")
  if (error) throw error
  // La base de datos solo admite colores de la paleta; el filtro es solo para el tipo.
  return data.flatMap((c) => (isCategoryColor(c.color) ? [{ ...c, color: c.color }] : []))
})

export type ManagedCategory = Category & { archived: boolean }

/** Todas las categorías, también las archivadas, para gestionarlas en Ajustes. */
export async function getAllCategories(): Promise<ManagedCategory[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("categories")
    .select("id, name, emoji, color, archived_at")
    .order("position")
  if (error) throw error
  return data.flatMap(({ archived_at, ...c }) =>
    isCategoryColor(c.color) ? [{ ...c, color: c.color, archived: archived_at !== null }] : [],
  )
}
