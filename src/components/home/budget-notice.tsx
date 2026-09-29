import { cn } from "cn"
import { Check, OctagonAlert, TriangleAlert } from "lucide-react"

type BudgetNoticeProps = {
  /** `ok`: dentro del presupuesto. `warning`: cerca del límite. `over`: superado. */
  tone: "ok" | "warning" | "over"
  message: string
}

const icons = {
  ok: { icon: Check, className: "text-primary-text" },
  warning: { icon: TriangleAlert, className: "text-cat-amber" },
  over: { icon: OctagonAlert, className: "text-destructive" },
}

/** Aviso breve sobre el presupuesto, p. ej. "Vas por el 80% del presupuesto de Ocio". */
export function BudgetNotice({ tone, message }: BudgetNoticeProps) {
  const { icon: Icon, className } = icons[tone]

  return (
    <div className="flex items-center gap-2.5 rounded-md bg-secondary px-4 py-3.5">
      <Icon
        aria-hidden="true"
        className={cn("size-[18px] shrink-0", className)}
        strokeWidth={2.2}
      />
      <p className="text-[13px] font-semibold">{message}</p>
    </div>
  )
}
