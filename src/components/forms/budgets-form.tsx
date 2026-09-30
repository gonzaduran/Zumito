"use client"

import { cn } from "cn"
import { Lock } from "lucide-react"
import Link from "next/link"
import { startTransition, useActionState, useEffect } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import type { Dictionary } from "@/i18n/get-dictionary"
import { interpolate } from "@/i18n/interpolate"
import { saveBudgets, type SaveBudgetsState } from "@/lib/actions/budgets"
import { categoryColorVar, type CategoryColor } from "@/lib/category-colors"
import { haptics } from "@/lib/haptics"

export type BudgetField = {
  /** "total" o el id de la categoría. */
  id: string
  label: string
  emoji?: string
  color?: CategoryColor
  /** Importe actual para el campo ("150,00") o vacío si no hay presupuesto. */
  value: string
  /** Gastado este mes y presupuesto, ya formateados. */
  spent: string
  budget?: string
  /** Uso del presupuesto (0-1+), si lo hay. */
  ratio?: number
}

type BudgetsFormProps = {
  labels: Dictionary["budgets"]
  total: BudgetField
  categories: BudgetField[]
  /** Sin Premium: textos del candado. Los presupuestos por categoría se ven pero no se editan. */
  lock: Pick<Dictionary["plans"], "locked" | "unlock" | "pausedBudget"> | null
}

const initialState: SaveBudgetsState = { status: "idle", invalid: [] }

function BudgetRow({
  field,
  name,
  labels,
  invalid,
  disabled = false,
}: {
  field: BudgetField
  name: string
  labels: Dictionary["budgets"]
  invalid: boolean
  disabled?: boolean
}) {
  const inputId = `budget-${field.id}`
  const hintId = `${inputId}-hint`
  const over = (field.ratio ?? 0) > 1
  return (
    <div className="flex flex-col gap-2 border-b border-border py-3 last:border-b-0">
      <div className="flex items-center gap-3">
        {field.emoji ? (
          <span aria-hidden="true" className="w-[22px] text-center text-lg">
            {field.emoji}
          </span>
        ) : null}
        <label htmlFor={inputId} className="min-w-0 flex-1 truncate text-sm font-bold">
          {field.label}
        </label>
        <div className="relative w-32 shrink-0">
          <Input
            id={inputId}
            name={name}
            inputMode="decimal"
            autoComplete="off"
            placeholder={labels.placeholder}
            defaultValue={field.value}
            disabled={disabled}
            aria-invalid={invalid || undefined}
            aria-describedby={hintId}
            className="h-11 pr-8 text-right num font-bold placeholder:text-sm placeholder:font-semibold"
          />
          <span
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 right-3.5 -translate-y-1/2 text-sm font-bold text-muted-foreground"
          >
            €
          </span>
        </div>
      </div>
      <p id={hintId} className={cn("text-xs text-muted-foreground", field.emoji && "pl-[34px]")}>
        {field.budget
          ? interpolate(labels.spentOf, { spent: field.spent, budget: field.budget })
          : interpolate(labels.spentThisMonth, { spent: field.spent })}
      </p>
      {field.ratio !== undefined ? (
        <div
          aria-hidden="true"
          className={cn("h-1 overflow-hidden rounded-full bg-border", field.emoji && "ml-[34px]")}
        >
          <div
            className="h-full rounded-full"
            style={{
              width: `${Math.min(field.ratio, 1) * 100}%`,
              background: over
                ? "var(--destructive)"
                : field.color
                  ? categoryColorVar(field.color)
                  : "var(--primary)",
            }}
          />
        </div>
      ) : null}
    </div>
  )
}

/** Presupuesto total del mes y por categoría. Un campo vacío es "sin límite". */
export function BudgetsForm({ labels, total, categories, lock }: BudgetsFormProps) {
  const [state, formAction, saving] = useActionState(saveBudgets, initialState)

  useEffect(() => {
    if (state.status === "saved") {
      haptics.success()
      toast.success(labels.saved)
    } else if (state.status === "error") {
      haptics.error()
      toast.error(state.invalid.length > 0 ? labels.invalid : labels.saveFailed)
    }
  }, [state, labels])

  const isInvalid = (id: string) => state.invalid.includes(id)

  return (
    <form
      className="flex flex-col gap-6"
      // Envío manual: con `action`, React vaciaría el formulario y se perdería lo escrito.
      onSubmit={(event) => {
        event.preventDefault()
        const data = new FormData(event.currentTarget)
        startTransition(() => formAction(data))
      }}
    >
      <section aria-labelledby="budget-total-title">
        <h2 id="budget-total-title" className="mb-1 text-[15px] font-extrabold">
          {labels.totalTitle}
        </h2>
        <Card className="py-1">
          <BudgetRow field={total} name="total" labels={labels} invalid={isInvalid("total")} />
        </Card>
      </section>

      <section aria-labelledby="budget-categories-title">
        <div className="mb-1 flex items-center justify-between gap-3">
          <h2 id="budget-categories-title" className="text-[15px] font-extrabold">
            {labels.byCategoryTitle}
          </h2>
          {lock ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-1 text-xs font-bold">
              <Lock aria-hidden="true" className="size-3.5" />
              {lock.locked}
            </span>
          ) : null}
        </div>
        {lock ? (
          <div className="mb-2 flex flex-col gap-1">
            {categories.some((field) => field.value) ? (
              <p className="text-xs text-muted-foreground">{lock.pausedBudget}</p>
            ) : null}
            <Link
              href="/planes"
              className="flex min-h-11 items-center gap-2 text-sm font-bold text-primary-text outline-none focus-visible:rounded-md focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <Lock aria-hidden="true" className="size-4" />
              {lock.unlock}
            </Link>
          </div>
        ) : null}
        <Card className="py-1">
          {categories.map((field) => (
            <BudgetRow
              key={field.id}
              field={field}
              name={`category:${field.id}`}
              labels={labels}
              invalid={isInvalid(field.id)}
              disabled={lock !== null}
            />
          ))}
        </Card>
      </section>

      <Button type="submit" size="lg" disabled={saving}>
        {saving ? labels.saving : labels.save}
      </Button>
    </form>
  )
}
