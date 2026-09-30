import { cn } from "cn"
import { ChevronRight, Wallet } from "lucide-react"
import Link from "next/link"

type BalanceCardProps =
  | {
      kind: "balance"
      /** "Te quedan este mes" o "Te has pasado este mes". */
      title: string
      amount: string
      over: boolean
      detail: string
      linkLabel: string
    }
  | { kind: "cta"; title: string; text: string; cta: string }

const linkClass =
  "flex items-center gap-3 rounded-lg bg-card p-4 shadow-card outline-none focus-visible:ring-3 focus-visible:ring-ring/50"

/** Cuánto te queda este mes (ingresos − gastos) o la invitación a añadir la nómina. */
export function BalanceCard(props: BalanceCardProps) {
  if (props.kind === "cta") {
    return (
      <Link href="/ajustes/dinero" className={linkClass}>
        <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary-wash text-primary-text">
          <Wallet aria-hidden="true" className="size-5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-extrabold">{props.title}</span>
          <span className="block text-[13px] text-muted-foreground">{props.text}</span>
          <span className="mt-1 block text-sm font-bold text-primary-text">{props.cta}</span>
        </span>
        <ChevronRight aria-hidden="true" className="size-5 shrink-0 text-muted-foreground" />
      </Link>
    )
  }
  return (
    <Link
      href="/ajustes/dinero"
      className={linkClass}
      aria-label={`${props.title}: ${props.amount}. ${props.detail}. ${props.linkLabel}`}
    >
      <span className="min-w-0 flex-1">
        <span className="block text-[13px] font-bold text-muted-foreground">{props.title}</span>
        <span
          className={cn(
            "block num text-[28px] leading-tight font-extrabold",
            props.over && "text-destructive",
          )}
        >
          {props.amount}
        </span>
        <span className="block num text-[13px] text-muted-foreground">{props.detail}</span>
      </span>
      <ChevronRight aria-hidden="true" className="size-5 shrink-0 text-muted-foreground" />
    </Link>
  )
}
