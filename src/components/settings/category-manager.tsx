"use client"

import { ArchiveRestore, ChevronDown, ChevronUp, Plus } from "lucide-react"
import { useState, useTransition } from "react"
import { toast } from "sonner"

import { CategoryForm } from "@/components/forms/category-form"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import type { Dictionary } from "@/i18n/get-dictionary"
import { interpolate } from "@/i18n/interpolate"
import {
  createCategory,
  reorderCategories,
  setCategoryArchived,
  updateCategory,
  type CategoryActionResult,
} from "@/lib/actions/categories"
import { categoryColorVar } from "@/lib/category-colors"
import type { ManagedCategory } from "@/lib/data/categories"
import { haptics } from "@/lib/haptics"
import { settle } from "@/lib/settle"
import type { CategoryInput } from "@/lib/validators/category"

type CategoryManagerProps = {
  categories: ManagedCategory[]
  labels: Dictionary["categories"]
  colorNames: Dictionary["categoryColors"]
  validation: Dictionary["validation"]
  closeLabel: string
}

type Editing = { mode: "new" } | { mode: "edit"; category: ManagedCategory } | null

/** Lista de categorías: crear, editar, ordenar, archivar y restaurar. */
export function CategoryManager({
  categories,
  labels,
  colorNames,
  validation,
  closeLabel,
}: CategoryManagerProps) {
  const [editing, setEditing] = useState<Editing>(null)
  const [pending, startTransition] = useTransition()
  // Orden optimista mientras se guarda el nuevo.
  const [order, setOrder] = useState<string[] | null>(null)

  const active = categories.filter((c) => !c.archived)
  const archived = categories.filter((c) => c.archived)
  // Las que no estén en el orden optimista (p. ej. recién creadas) van al final.
  const sorted = order
    ? [
        ...order.flatMap((id) => active.find((c) => c.id === id) ?? []),
        ...active.filter((c) => !order.includes(c.id)),
      ]
    : active

  const run = (action: Promise<CategoryActionResult>, success: string, close = true) =>
    startTransition(async () => {
      const result = await settle(action)
      if (result.ok) {
        haptics.success()
        toast.success(success)
        if (close) setEditing(null)
        return
      }
      haptics.error()
      const duplicate = "error" in result && result.error === "duplicate"
      toast.error(duplicate ? labels.duplicate : labels.failed)
    })

  const move = (index: number, step: -1 | 1) => {
    const ids = sorted.map((c) => c.id)
    const target = index + step
    const [id] = ids.splice(index, 1)
    if (!id || target < 0 || target > ids.length) return
    ids.splice(target, 0, id)
    setOrder(ids)
    haptics.tap()
    startTransition(async () => {
      const result = await settle(reorderCategories(ids))
      if (!result.ok) {
        setOrder(null)
        toast.error(labels.failed)
      }
    })
  }

  const submit = (input: CategoryInput) => {
    if (editing?.mode === "edit") run(updateCategory(editing.category.id, input), labels.saved)
    else run(createCategory(input), labels.created)
  }

  return (
    <div className="flex flex-col gap-6">
      <Card className="py-1">
        <ul>
          {sorted.map((category, index) => (
            <li
              key={category.id}
              className="flex items-center gap-1 border-b border-border last:border-b-0"
            >
              <button
                type="button"
                onClick={() => setEditing({ mode: "edit", category })}
                aria-label={interpolate(labels.edit, { name: category.name })}
                className="flex min-h-14 min-w-0 flex-1 items-center gap-3 rounded-sm py-2 text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                <span
                  aria-hidden="true"
                  className="flex size-9 shrink-0 items-center justify-center rounded-full bg-secondary text-lg"
                >
                  {category.emoji}
                </span>
                <span className="min-w-0 flex-1 truncate font-bold">{category.name}</span>
                <span
                  aria-hidden="true"
                  className="size-3 shrink-0 rounded-full"
                  style={{ background: categoryColorVar(category.color) }}
                />
              </button>
              <Button
                variant="ghost"
                size="icon"
                disabled={index === 0}
                aria-label={interpolate(labels.moveUp, { name: category.name })}
                onClick={() => move(index, -1)}
              >
                <ChevronUp />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                disabled={index === sorted.length - 1}
                aria-label={interpolate(labels.moveDown, { name: category.name })}
                onClick={() => move(index, 1)}
              >
                <ChevronDown />
              </Button>
            </li>
          ))}
        </ul>
      </Card>

      <Button variant="secondary" size="lg" onClick={() => setEditing({ mode: "new" })}>
        <Plus />
        {labels.add}
      </Button>

      {archived.length > 0 ? (
        <section aria-labelledby="archived-title">
          <h2 id="archived-title" className="mb-1 text-[15px] font-extrabold">
            {labels.archivedTitle}
          </h2>
          <Card className="py-1">
            <ul>
              {archived.map((category) => (
                <li
                  key={category.id}
                  className="flex min-h-14 items-center gap-3 border-b border-border py-2 last:border-b-0"
                >
                  <span aria-hidden="true" className="text-lg opacity-60">
                    {category.emoji}
                  </span>
                  <span className="min-w-0 flex-1 truncate font-bold text-muted-foreground">
                    {category.name}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={pending}
                    onClick={() =>
                      run(setCategoryArchived(category.id, false), labels.restored, false)
                    }
                  >
                    <ArchiveRestore />
                    {labels.restore}
                  </Button>
                </li>
              ))}
            </ul>
          </Card>
        </section>
      ) : null}

      <Sheet open={editing !== null} onOpenChange={(open) => !open && setEditing(null)}>
        <SheetContent closeLabel={closeLabel}>
          <SheetHeader>
            <SheetTitle>{editing?.mode === "edit" ? labels.editTitle : labels.newTitle}</SheetTitle>
          </SheetHeader>
          {editing ? (
            <CategoryForm
              key={editing.mode === "edit" ? editing.category.id : "new"}
              labels={labels}
              colorNames={colorNames}
              validation={validation}
              initial={editing.mode === "edit" ? editing.category : undefined}
              submitLabel={editing.mode === "edit" ? labels.save : labels.create}
              pending={pending}
              onSubmit={submit}
              footer={
                editing.mode === "edit" ? (
                  <div className="flex flex-col gap-1.5">
                    <Button
                      type="button"
                      variant="destructive"
                      disabled={pending}
                      onClick={() =>
                        run(setCategoryArchived(editing.category.id, true), labels.archived)
                      }
                    >
                      {labels.archive}
                    </Button>
                    <p className="text-center text-xs text-muted-foreground">
                      {labels.archiveHint}
                    </p>
                  </div>
                ) : null
              }
            />
          ) : null}
        </SheetContent>
      </Sheet>
    </div>
  )
}
