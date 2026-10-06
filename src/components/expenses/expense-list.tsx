"use client"

import { Trash2 } from "lucide-react"
import { useState, useTransition } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import type { Dictionary } from "@/i18n/get-dictionary"
import { interpolate } from "@/i18n/interpolate"
import { createExpense, deleteExpense, updateExpense } from "@/lib/actions/expenses"
import { deleteSharedExpense } from "@/lib/actions/social"
import { isCategoryColor } from "@/lib/category-colors"
import type { Category } from "@/lib/data/categories"
import type { ExpenseGroup, ListedExpense } from "@/lib/expense-view"
import type { NamedOption } from "@/lib/suggestions"
import { haptics } from "@/lib/haptics"
import { settle } from "@/lib/settle"

import { ExpenseForm, type ExpenseDraft } from "./expense-form"

type ExpenseListProps = {
  groups: ExpenseGroup[]
  categories: Category[]
  places: NamedOption[]
  people: NamedOption[]
  labels: {
    form: Dictionary["addExpense"]
    edit: Dictionary["editExpense"]
    dayTotal: string
    close: string
  }
}

const toDraft = (expense: ListedExpense): ExpenseDraft => ({
  id: expense.id,
  categoryId: expense.categoryId,
  accountId: expense.accountId,
  amountCents: expense.amountCents,
  description: expense.description ?? undefined,
  note: expense.note ?? undefined,
  spentAt: new Date(expense.spentAt),
  place: expense.placeName ?? undefined,
  mood: expense.mood ?? undefined,
  personIds: expense.people.map((person) => person.id),
})

/** Categorías para editar un gasto: si la suya está archivada, se añade para poder conservarla. */
function categoriesFor(expense: ListedExpense, categories: Category[]): Category[] {
  if (categories.some((c) => c.id === expense.categoryId)) return categories
  return [
    ...categories,
    {
      id: expense.categoryId,
      name: expense.categoryName,
      emoji: expense.emoji,
      color: isCategoryColor(expense.categoryColor) ? expense.categoryColor : "denim",
    },
  ]
}

/** Lista de gastos (agrupada o no). Al tocar uno se abre para editarlo o borrarlo. */
export function ExpenseList({ groups, categories, places, people, labels }: ExpenseListProps) {
  const [editing, setEditing] = useState<ListedExpense | null>(null)
  // Borrados optimistas: desaparecen al instante, antes de que responda el servidor.
  const [hidden, setHidden] = useState<Set<string>>(() => new Set())
  const [, startTransition] = useTransition()
  const { edit } = labels

  const setHiddenId = (id: string, isHidden: boolean) =>
    setHidden((current) => {
      const next = new Set(current)
      if (isHidden) next.add(id)
      else next.delete(id)
      return next
    })

  const save = (draft: ExpenseDraft) => {
    setEditing(null)
    haptics.success()
    toast.success(edit.saved, { id: draft.id })
    startTransition(async () => {
      const { ok } = await settle(updateExpense(draft))
      if (ok) return
      haptics.error()
      toast.error(edit.saveFailed, {
        id: draft.id,
        action: { label: edit.retry, onClick: () => save(draft) },
      })
    })
  }

  const restore = (draft: ExpenseDraft) => {
    setHiddenId(draft.id, false)
    startTransition(async () => {
      const { ok } = await settle(createExpense(draft))
      if (!ok) toast.error(edit.saveFailed, { id: draft.id })
      else toast.dismiss(draft.id)
    })
  }

  // Borrar un gasto compartido que creé yo: desaparece para todos (sin deshacer).
  const removeShared = (expense: ListedExpense) => {
    if (!expense.sharedExpenseId) return
    const sharedId = expense.sharedExpenseId
    setEditing(null)
    setHiddenId(expense.id, true)
    haptics.success()
    toast(edit.sharedDeleted, { id: expense.id })
    startTransition(async () => {
      const { ok } = await settle(deleteSharedExpense(sharedId))
      if (ok) return
      haptics.error()
      setHiddenId(expense.id, false)
      toast.error(edit.deleteFailed, { id: expense.id })
    })
  }

  const remove = (expense: ListedExpense) => {
    const draft = toDraft(expense)
    setEditing(null)
    setHiddenId(expense.id, true)
    haptics.success()
    toast(edit.deleted, {
      id: expense.id,
      duration: 6000,
      action: { label: edit.undo, onClick: () => restore(draft) },
    })
    startTransition(async () => {
      const { ok } = await settle(deleteExpense(expense.id))
      if (ok) return
      haptics.error()
      setHiddenId(expense.id, false)
      toast.error(edit.deleteFailed, { id: expense.id })
    })
  }

  return (
    <>
      {groups.map((group) => {
        const items = group.items.filter((item) => !hidden.has(item.id))
        if (items.length === 0) return null
        return (
          <section key={group.key} aria-label={group.label}>
            {group.label ? (
              <div className="flex items-baseline justify-between pt-2 pb-1">
                <h2 className="text-[13px] font-extrabold text-muted-foreground">{group.label}</h2>
                {group.total ? (
                  <p className="num text-[13px] font-bold text-muted-foreground">
                    <span className="sr-only">{labels.dayTotal}: </span>
                    {group.total}
                  </p>
                ) : null}
              </div>
            ) : null}
            <ul>
              {items.map((item) => (
                <li key={item.id} className="border-b border-border last:border-b-0">
                  <button
                    type="button"
                    onClick={() => setEditing(item)}
                    aria-label={interpolate(edit.open, { title: item.title, amount: item.amount })}
                    className="flex min-h-14 w-full items-center gap-3 py-3 text-left outline-none focus-visible:rounded-sm focus-visible:ring-3 focus-visible:ring-ring/50"
                  >
                    <span
                      aria-hidden="true"
                      className="flex size-[34px] shrink-0 items-center justify-center rounded-full bg-secondary text-[17px]"
                    >
                      {item.emoji}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-bold">{item.title}</span>
                      <span className="mt-px block text-xs text-muted-foreground">
                        {item.subtitle}
                      </span>
                    </span>
                    <span className="num text-sm font-extrabold">{item.amount}</span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )
      })}

      <Sheet open={editing !== null} onOpenChange={(open) => !open && setEditing(null)}>
        <SheetContent closeLabel={labels.close}>
          <SheetHeader>
            <SheetTitle>{edit.title}</SheetTitle>
          </SheetHeader>
          {editing ? (
            <ExpenseForm
              key={editing.id}
              labels={labels.form}
              submitLabel={edit.save}
              categories={categoriesFor(editing, categories)}
              places={places}
              people={people}
              initial={toDraft(editing)}
              defaultCategoryId={editing.categoryId}
              onSubmit={save}
              shared={
                editing.sharedExpenseId
                  ? {
                      with: `${interpolate(edit.sharedWith, { names: editing.sharedWith ?? "" })}. ${edit.sharedAmountLocked}`,
                    }
                  : undefined
              }
              footer={
                editing.sharedExpenseId && editing.sharedMine ? (
                  <Button type="button" variant="destructive" onClick={() => removeShared(editing)}>
                    <Trash2 />
                    {edit.deleteForAll}
                  </Button>
                ) : (
                  <div className="flex flex-col gap-1.5">
                    <Button type="button" variant="destructive" onClick={() => remove(editing)}>
                      <Trash2 />
                      {editing.sharedExpenseId ? edit.deleteMine : edit.delete}
                    </Button>
                    {editing.sharedExpenseId ? (
                      <p className="text-center text-xs text-muted-foreground">
                        {edit.deleteMineHint}
                      </p>
                    ) : null}
                  </div>
                )
              }
            />
          ) : null}
        </SheetContent>
      </Sheet>
    </>
  )
}
