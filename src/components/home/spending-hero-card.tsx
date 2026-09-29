"use client"

import { ArrowDown, ArrowUp } from "lucide-react"

import { ProgressRing } from "@/components/ui/progress-ring"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import type { Dictionary } from "@/i18n/get-dictionary"

export type Period = keyof Dictionary["home"]["periods"]

export type PeriodSummary = {
  /** Importe ya formateado, p. ej. "482,30 €". */
  amount: string
  /** Comparación con el periodo anterior, ya redactada. `null` si no aplica. */
  delta: { direction: "up" | "down"; label: string } | null
}

type SpendingHeroCardProps = {
  labels: Pick<Dictionary["home"], "periodsLabel" | "periods" | "spentLabel">
  summaries: Record<Period, PeriodSummary>
  /** Presupuesto del mes usado (0-1). Si no hay presupuesto, no se muestra el anillo. */
  budget?: { value: number; label: string; ariaLabel: string }
  defaultPeriod?: Period
}

const order: Period[] = ["today", "week", "month", "total"]

/** Tarjeta destacada del Inicio: gasto por periodo, comparación y progreso del presupuesto. */
export function SpendingHeroCard({
  labels,
  summaries,
  budget,
  defaultPeriod = "month",
}: SpendingHeroCardProps) {
  return (
    <section className="rounded-lg bg-linear-155 from-primary to-primary-strong p-5 text-primary-foreground shadow-card">
      <Tabs defaultValue={defaultPeriod}>
        <TabsList variant="segmented" aria-label={labels.periodsLabel} className="mb-4 bg-white/8">
          {order.map((period) => (
            <TabsTrigger
              key={period}
              value={period}
              className="text-xs text-white data-active:bg-white/90! data-active:text-primary-strong data-active:shadow-none!"
            >
              {labels.periods[period]}
            </TabsTrigger>
          ))}
        </TabsList>
        {order.map((period) => {
          const { amount, delta } = summaries[period]
          return (
            <TabsContent
              key={period}
              value={period}
              className="flex items-end justify-between gap-4"
            >
              <div className="min-w-0">
                <p className="text-xs font-bold text-white/90">{labels.spentLabel[period]}</p>
                <p className="mt-0.5 truncate num text-[38px] leading-tight font-extrabold">
                  {amount}
                </p>
                {delta ? (
                  <p className="mt-1 flex items-center gap-1 text-xs font-bold text-white/90">
                    {delta.direction === "up" ? (
                      <ArrowUp aria-hidden="true" className="size-3.5" strokeWidth={2.6} />
                    ) : (
                      <ArrowDown aria-hidden="true" className="size-3.5" strokeWidth={2.6} />
                    )}
                    {delta.label}
                  </p>
                ) : null}
              </div>
              {budget ? (
                <ProgressRing
                  value={budget.value}
                  label={budget.label}
                  ariaLabel={budget.ariaLabel}
                />
              ) : null}
            </TabsContent>
          )
        })}
      </Tabs>
    </section>
  )
}
