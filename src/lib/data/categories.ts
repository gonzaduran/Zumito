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
