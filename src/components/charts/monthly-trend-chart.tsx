"use client"

import { useRouter } from "next/navigation"
import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis } from "recharts"

export type MonthPoint = {
  month: string
  /** Etiqueta corta del eje: "sept". */
  short: string
  /** Etiqueta completa: "septiembre de 2026". */
  label: string
  cents: number
  /** Importe ya formateado. */
  amount: string
}

type MonthlyTrendChartProps = {
  points: MonthPoint[]
  selectedMonth: string
  labels: { title: string; month: string; amount: string }
}

type TrendTooltipProps = { active?: boolean; payload?: ReadonlyArray<{ payload?: unknown }> }

function TrendTooltip({ active, payload }: TrendTooltipProps) {
  const point = payload?.[0]?.payload as MonthPoint | undefined
  if (!active || !point) return null
  return (
    <div className="rounded-sm border border-border bg-popover px-3 py-2 text-[13px] shadow-card">
      <p className="font-semibold text-muted-foreground">{point.label}</p>
      <p className="num font-extrabold">{point.amount}</p>
    </div>
  )
}

/** Gasto de los últimos meses (una sola serie). Tocar una columna abre ese mes. */
export function MonthlyTrendChart({ points, selectedMonth, labels }: MonthlyTrendChartProps) {
  const router = useRouter()

  return (
    <figure>
      <div aria-hidden="true" className="h-44 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={points}
            margin={{ top: 8, right: 0, bottom: 0, left: 0 }}
            // Sin foco de teclado: el gráfico está oculto a lectores de pantalla y sus
            // datos están en la tabla de abajo.
            accessibilityLayer={false}
          >
            <XAxis
              dataKey="short"
              axisLine={false}
              tickLine={false}
              tick={{ fill: "var(--muted-foreground)", fontSize: 12, fontWeight: 600 }}
            />
            <Tooltip
              cursor={{ fill: "var(--secondary)", radius: 8 }}
              content={({ active, payload }) => <TrendTooltip active={active} payload={payload} />}
            />
            <Bar
              dataKey="cents"
              maxBarSize={24}
              radius={[4, 4, 0, 0]}
              minPointSize={2}
              className="cursor-pointer"
              onClick={(_, index) => {
                const point = points[index]
                if (point) router.push(`/estadisticas?m=${point.month}`, { scroll: false })
              }}
            >
              {points.map((point) => (
                <Cell
                  key={point.month}
                  fill={
                    point.month === selectedMonth ? "var(--primary)" : "var(--muted-foreground)"
                  }
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      {/* Los mismos datos como tabla, para lectores de pantalla. */}
      <table className="sr-only">
        <caption>{labels.title}</caption>
        <thead>
          <tr>
            <th scope="col">{labels.month}</th>
            <th scope="col">{labels.amount}</th>
          </tr>
        </thead>
        <tbody>
          {points.map((point) => (
            <tr key={point.month}>
              <th scope="row">{point.label}</th>
              <td>{point.amount}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  )
}
