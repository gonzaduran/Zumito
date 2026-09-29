"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"

import { createClient } from "@/lib/supabase/server"
import { categoryInputSchema, type CategoryInput } from "@/lib/validators/category"

export type CategoryActionResult = { ok: true } | { ok: false; error: "duplicate" | "failed" }

/** Nombre repetido: el índice único de nombres activos lo rechaza. */
const UNIQUE_VIOLATION = "23505"

const fail = (code?: string): CategoryActionResult => ({
  ok: false,
  error: code === UNIQUE_VIOLATION ? "duplicate" : "failed",
})

const done = (): CategoryActionResult => {
  revalidatePath("/", "layout")
  return { ok: true }
}

export async function createCategory(input: CategoryInput): Promise<CategoryActionResult> {
  const parsed = categoryInputSchema.safeParse(input)
  if (!parsed.success) return fail()

  const supabase = await createClient()
  // Las nuevas van al final.
  const { count } = await supabase.from("categories").select("id", { count: "exact", head: true })
  const { error } = await supabase
    .from("categories")
    .insert({ ...parsed.data, position: count ?? 0 })
  return error ? fail(error.code) : done()
}

export async function updateCategory(
  id: string,
  input: CategoryInput,
): Promise<CategoryActionResult> {
  const parsed = categoryInputSchema.safeParse(input)
  if (!parsed.success || !z.uuid().safeParse(id).success) return fail()

  const supabase = await createClient()
  const { error } = await supabase.from("categories").update(parsed.data).eq("id", id)
  return error ? fail(error.code) : done()
}

/** Archivar oculta la categoría para nuevos gastos; sus gastos se conservan. */
export async function setCategoryArchived(
  id: string,
  archived: boolean,
): Promise<CategoryActionResult> {
  if (!z.uuid().safeParse(id).success) return fail()

  const supabase = await createClient()
  const { error } = await supabase
    .from("categories")
    .update({ archived_at: archived ? new Date().toISOString() : null })
    .eq("id", id)
  return error ? fail(error.code) : done()
}

export async function reorderCategories(ids: string[]): Promise<CategoryActionResult> {
  const parsed = z.array(z.uuid()).max(200).safeParse(ids)
  if (!parsed.success) return fail()

  const supabase = await createClient()
  const { error } = await supabase.rpc("reorder_categories", { p_ids: parsed.data })
  return error ? fail(error.code) : done()
}
