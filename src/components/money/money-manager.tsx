"use client"

import { Lock, Pause, Play, Repeat, Trash2 } from "lucide-react"
import Link from "next/link"
import { useState, useTransition } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { Dictionary } from "@/i18n/get-dictionary"
import { interpolate } from "@/i18n/interpolate"
import {
  addIncome,
  addRecurringIncome,
  deleteIncome,
  deleteRecurringIncome,
  setRecurringIncomeActive,
  type IncomeActionResult,
} from "@/lib/actions/incomes"
import { haptics } from "@/lib/haptics"

export type RecurringRow = {
  id: string
  description: string
  amount: string
  day: number
  active: boolean
}
export type IncomeRow = {
  id: string
  description: string
  amount: string
  date: string
  automatic: boolean
}

type MoneyManagerProps = {
  labels: Dictionary["money"]
  validation: Dictionary["validation"]
  plans: Pick<Dictionary["plans"], "locked">
  recurring: RecurringRow[]
  incomes: IncomeRow[]
  /** Sin Premium solo cabe un ingreso programado. */
  canAddRecurring: boolean
  /** Hoy en la zona del usuario (aaaa-mm-dd), valor por defecto de la fecha. */
  today: string
}

function Section({
  id,
  title,
  hint,
  children,
}: {
  id: string
  title: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <section aria-labelledby={id} className="flex flex-col gap-2">
      <div>
        <h2 id={id} className="text-[15px] font-extrabold">
          {title}
        </h2>
        {hint ? <p className="text-[13px] text-muted-foreground">{hint}</p> : null}
      </div>
      {children}
    </section>
  )
}

/** Ingresos programados (la nómina) e ingresos a mano del mes. */
export function MoneyManager(props: MoneyManagerProps) {
  const { labels } = props
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<{ form: "recurring" | "income"; text: string } | null>(null)

  const run = (
    form: "recurring" | "income" | null,
    action: () => Promise<IncomeActionResult>,
    success: string,
    onSuccess?: () => void,
  ) =>
    startTransition(async () => {
      const result = await action().catch(() => ({ ok: false, error: "failed" }) as const)
      if (result.ok) {
        haptics.success()
        toast.success(success)
        setError(null)
        onSuccess?.()
        return
      }
      haptics.error()
      const text =
        result.error === "failed"
          ? labels.failed
          : result.error === "premium"
            ? labels.lockedRecurring
            : props.validation[result.error]
      if (form) setError({ form, text })
      else toast.error(text)
    })

  const errorFor = (form: "recurring" | "income") =>
    error?.form === form ? (
      <p role="alert" className="text-sm font-semibold text-destructive-text">
        {error.text}
      </p>
    ) : null

  return (
    <div className="flex flex-col gap-7">
      <Section id="recurring-title" title={labels.recurringTitle} hint={labels.recurringHint}>
        {props.recurring.length === 0 ? (
          <p className="text-sm text-muted-foreground">{labels.recurringEmpty}</p>
        ) : (
          <Card className="p-0">
            <ul>
              {props.recurring.map((row) => (
                <li
                  key={row.id}
                  className="flex items-center gap-3 border-b border-border px-4 py-3 last:border-b-0"
                >
                  <Repeat aria-hidden="true" className="size-5 shrink-0 text-primary-text" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-bold">{row.description}</p>
                    <p className="text-[13px] text-muted-foreground">
                      {row.active
                        ? interpolate(labels.everyMonth, { day: String(row.day) })
                        : labels.paused}
                    </p>
                  </div>
                  <p className="num font-extrabold">{row.amount}</p>
                  <Button
                    variant="ghost"
                    size="icon"
                    disabled={pending}
                    aria-label={`${row.active ? labels.pause : labels.resume} ${row.description}`}
                    onClick={() =>
                      run(
                        null,
                        () => setRecurringIncomeActive(row.id, !row.active),
                        row.active ? labels.paused : labels.recurringSaved,
                      )
                    }
                  >
                    {row.active ? (
                      <Pause aria-hidden="true" className="size-5" />
                    ) : (
                      <Play aria-hidden="true" className="size-5" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    disabled={pending}
                    aria-label={interpolate(labels.deleteLabel, { name: row.description })}
                    onClick={() => run(null, () => deleteRecurringIncome(row.id), labels.deleted)}
                  >
                    <Trash2 aria-hidden="true" className="size-5" />
                  </Button>
                </li>
              ))}
            </ul>
          </Card>
        )}

        {props.canAddRecurring ? (
          <RecurringForm
            labels={labels}
            pending={pending}
            error={errorFor("recurring")}
            onSubmit={(input, reset) =>
              run("recurring", () => addRecurringIncome(input), labels.recurringSaved, reset)
            }
          />
        ) : (
          <Link
            href="/planes"
            className="flex min-h-11 items-center gap-2 text-sm font-bold text-primary-text outline-none focus-visible:rounded-md focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <Lock aria-hidden="true" className="size-4" />
            {labels.lockedRecurring}
            <span className="rounded-full bg-secondary px-2 py-0.5 text-xs text-foreground">
              {props.plans.locked}
            </span>
          </Link>
        )}
      </Section>

      <Section id="incomes-title" title={labels.incomesTitle}>
        {props.incomes.length === 0 ? (
          <p className="text-sm text-muted-foreground">{labels.incomesEmpty}</p>
        ) : (
          <Card className="p-0">
            <ul>
              {props.incomes.map((row) => (
                <li
                  key={row.id}
                  className="flex items-center gap-3 border-b border-border py-2 pr-2 pl-4 last:border-b-0"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-bold">{row.description}</p>
                    <p className="text-[13px] text-muted-foreground">
                      {row.date}
                      {row.automatic ? ` · ${labels.automatic}` : ""}
                    </p>
                  </div>
                  <p className="num font-extrabold text-positive">+{row.amount}</p>
                  <Button
                    variant="ghost"
                    size="icon"
                    disabled={pending}
                    aria-label={interpolate(labels.deleteLabel, { name: row.description })}
                    onClick={() => run(null, () => deleteIncome(row.id), labels.deleted)}
                  >
                    <Trash2 aria-hidden="true" className="size-5" />
                  </Button>
                </li>
              ))}
            </ul>
          </Card>
        )}
        <IncomeForm
          labels={labels}
          today={props.today}
          pending={pending}
          error={errorFor("income")}
          onSubmit={(input, reset) => run("income", () => addIncome(input), labels.saved, reset)}
        />
      </Section>
    </div>
  )
}

function RecurringForm({
  labels,
  pending,
  error,
  onSubmit,
}: {
  labels: Dictionary["money"]
  pending: boolean
  error: React.ReactNode
  onSubmit: (
    input: { description: string; amount: string; dayOfMonth: number },
    reset: () => void,
  ) => void
}) {
  const [description, setDescription] = useState(labels.recurringPlaceholder)
  const [amount, setAmount] = useState("")
  const [day, setDay] = useState("1")
  return (
    <Card>
      <form
        className="flex flex-col gap-3"
        aria-labelledby="add-recurring-title"
        onSubmit={(event) => {
          event.preventDefault()
          onSubmit({ description, amount, dayOfMonth: Number(day) }, () => setAmount(""))
        }}
      >
        <h3 id="add-recurring-title" className="font-extrabold">
          {labels.addRecurringTitle}
        </h3>
        <div>
          <Label htmlFor="recurring-description">{labels.descriptionLabel}</Label>
          <Input
            id="recurring-description"
            maxLength={80}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
          />
        </div>
        <div className="flex gap-3">
          <div className="flex-1">
            <Label htmlFor="recurring-amount">{labels.amountLabel}</Label>
            <Input
              id="recurring-amount"
              inputMode="decimal"
              autoComplete="off"
              placeholder="1.450"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              className="num"
            />
          </div>
          <div className="w-28">
            <Label htmlFor="recurring-day">{labels.dayLabel}</Label>
            <select
              id="recurring-day"
              value={day}
              onChange={(event) => setDay(event.target.value)}
              aria-describedby="recurring-day-hint"
              className="h-12 w-full rounded-md border border-border bg-card px-3 num font-bold outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              {Array.from({ length: 31 }, (_, index) => (
                <option key={index + 1} value={index + 1}>
                  {index + 1}
                </option>
              ))}
            </select>
          </div>
        </div>
        <p id="recurring-day-hint" className="text-xs text-muted-foreground">
          {labels.dayHint}
        </p>
        {error}
        <Button type="submit" disabled={pending}>
          {labels.addRecurring}
        </Button>
      </form>
    </Card>
  )
}

function IncomeForm({
  labels,
  today,
  pending,
  error,
  onSubmit,
}: {
  labels: Dictionary["money"]
  today: string
  pending: boolean
  error: React.ReactNode
  onSubmit: (
    input: { description: string; amount: string; receivedOn: string },
    reset: () => void,
  ) => void
}) {
  const [description, setDescription] = useState("")
  const [amount, setAmount] = useState("")
  const [date, setDate] = useState(today)
  return (
    <Card>
      <form
        className="flex flex-col gap-3"
        aria-labelledby="add-income-title"
        onSubmit={(event) => {
          event.preventDefault()
          onSubmit({ description, amount, receivedOn: date }, () => {
            setDescription("")
            setAmount("")
          })
        }}
      >
        <h3 id="add-income-title" className="font-extrabold">
          {labels.addIncomeTitle}
        </h3>
        <div>
          <Label htmlFor="income-description">{labels.descriptionLabel}</Label>
          <Input
            id="income-description"
            maxLength={80}
            placeholder={labels.incomePlaceholder}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
          />
        </div>
        <div className="flex gap-3">
          <div className="flex-1">
            <Label htmlFor="income-amount">{labels.amountLabel}</Label>
            <Input
              id="income-amount"
              inputMode="decimal"
              autoComplete="off"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              className="num"
            />
          </div>
          <div className="flex-1">
            <Label htmlFor="income-date">{labels.dateLabel}</Label>
            <Input
              id="income-date"
              type="date"
              max={today}
              value={date}
              onChange={(event) => setDate(event.target.value)}
            />
          </div>
        </div>
        {error}
        <Button type="submit" disabled={pending}>
          {labels.addIncome}
        </Button>
      </form>
    </Card>
  )
}
