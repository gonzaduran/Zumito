"use client"

import { cn } from "cn"
import { useEffect, useState } from "react"

import { Button } from "@/components/ui/button"
import { Chip } from "@/components/ui/chip"
import { Input } from "@/components/ui/input"
import type { Dictionary } from "@/i18n/get-dictionary"
import { applyAmountKey, formatAmountInput, keyFromKeyboard, toCents } from "@/lib/amount-input"
import type { Category } from "@/lib/data/categories"
import type { ExpenseInput } from "@/lib/validators/expense"

import { AmountKeypad } from "./amount-keypad"
import { CategoryPicker } from "./category-picker"

export type NewExpense = ExpenseInput & { id: string }

type AddExpenseFormProps = {
  labels: Dictionary["addExpense"]
  categories: Category[]
  defaultCategoryId: string
  onSave: (expense: NewExpense, category: Category) => void
}

type DateChoice = "today" | "yesterday" | "other"

/** Fecha local "aaaa-mm-dd" para el selector nativo. */
const toDateInputValue = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`

function resolveSpentAt(choice: DateChoice, otherDate: string): Date {
  const now = new Date()
  if (choice === "today") return now
  if (choice === "yesterday") {
    const yesterday = new Date(now)
    yesterday.setDate(now.getDate() - 1)
    return yesterday
  }
  // Día elegido a mediodía, para que la zona horaria no lo mueva de día.
  return new Date(`${otherDate}T12:00:00`)
}

export function AddExpenseForm({
  labels,
  categories,
  defaultCategoryId,
  onSave,
}: AddExpenseFormProps) {
  const [amount, setAmount] = useState("")
  const [categoryId, setCategoryId] = useState(defaultCategoryId)
  const [description, setDescription] = useState("")
  const [dateChoice, setDateChoice] = useState<DateChoice>("today")
  const [otherDate, setOtherDate] = useState(() => toDateInputValue(new Date()))

  const amountCents = toCents(amount)
  const canSave = amountCents > 0 && (dateChoice !== "other" || Boolean(otherDate))

  const save = () => {
    const category = categories.find((c) => c.id === categoryId)
    if (!canSave || !category) return
    onSave(
      {
        id: crypto.randomUUID(),
        categoryId,
        amountCents,
        description: description.trim() || undefined,
        spentAt: resolveSpentAt(dateChoice, otherDate),
      },
      category,
    )
  }

  // Teclado físico: números, coma o punto, borrar y Enter para guardar.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const { target } = event
      if (target instanceof Element && target.closest("input, textarea, select")) return
      if (event.key === "Enter") {
        event.preventDefault()
        document.getElementById("save-expense")?.click()
        return
      }
      const key = keyFromKeyboard(event.key)
      if (key && !event.metaKey && !event.ctrlKey && !event.altKey) {
        event.preventDefault()
        setAmount((current) => applyAmountKey(current, key))
      }
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [])

  return (
    <form
      className="flex flex-col gap-4 px-5"
      onSubmit={(event) => {
        event.preventDefault()
        save()
      }}
    >
      <output
        aria-live="polite"
        aria-label={labels.amountLabel}
        className="flex items-baseline justify-center gap-1.5 py-1"
      >
        <span
          className={cn(
            "num text-[52px] leading-none font-extrabold tracking-[-0.02em]",
            !amount && "text-muted-foreground",
          )}
        >
          {formatAmountInput(amount)}
        </span>
        <span className="num text-2xl font-bold text-muted-foreground">€</span>
      </output>

      <CategoryPicker
        label={labels.categoryLabel}
        categories={categories}
        value={categoryId}
        onChange={setCategoryId}
      />

      <Input
        aria-label={labels.descriptionLabel}
        placeholder={labels.descriptionPlaceholder}
        maxLength={80}
        enterKeyHint="done"
        value={description}
        onChange={(event) => setDescription(event.target.value)}
      />

      <div role="group" aria-label={labels.dateLabel} className="flex items-center gap-2">
        <Chip pressed={dateChoice === "today"} onPressedChange={() => setDateChoice("today")}>
          {labels.today}
        </Chip>
        <Chip
          pressed={dateChoice === "yesterday"}
          onPressedChange={() => setDateChoice("yesterday")}
        >
          {labels.yesterday}
        </Chip>
        {dateChoice === "other" ? (
          <Input
            type="date"
            aria-label={labels.otherDate}
            value={otherDate}
            max={toDateInputValue(new Date())}
            onChange={(event) => setOtherDate(event.target.value)}
            className="h-11 min-w-0 flex-1 rounded-full border-2 border-primary-text px-4 text-[13px] font-bold"
          />
        ) : (
          <Chip pressed={false} onPressedChange={() => setDateChoice("other")}>
            {labels.otherDate}
          </Chip>
        )}
      </div>

      <AmountKeypad
        labels={labels.keypad}
        onKey={(key) => setAmount((current) => applyAmountKey(current, key))}
      />

      <Button id="save-expense" type="submit" size="lg" disabled={!canSave}>
        {labels.save}
      </Button>
    </form>
  )
}
