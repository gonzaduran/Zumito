"use client"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import type { Dictionary } from "@/i18n/get-dictionary"

type Period = keyof Dictionary["home"]["periods"]

type PeriodSummaryProps = {
  label: string
  periods: Dictionary["home"]["periods"]
  amount: string
}

const order: Period[] = ["today", "week", "month", "total"]

/** Total gastado por periodo (Hoy, Semana, Mes, Total) con la cifra como protagonista. */
export function PeriodSummary({ label, periods, amount }: PeriodSummaryProps) {
  return (
    <Tabs defaultValue="month">
      <TabsList aria-label={label}>
        {order.map((period) => (
          <TabsTrigger key={period} value={period}>
            {periods[period]}
          </TabsTrigger>
        ))}
      </TabsList>
      {order.map((period) => (
        <TabsContent key={period} value={period}>
          <p className="num text-[44px] leading-tight font-extrabold tracking-[-0.01em]">
            {amount}
          </p>
        </TabsContent>
      ))}
    </Tabs>
  )
}
