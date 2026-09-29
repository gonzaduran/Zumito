import { cn } from "cn"
import { ChevronLeft } from "lucide-react"
import Link from "next/link"

type AppHeaderProps = {
  title: string
  eyebrow?: string
  action?: React.ReactNode
  /** Enlace para volver, en subpantallas. */
  back?: { href: string; label: string }
  className?: string
}

/** Cabecera minimalista: volver o texto pequeño opcional, título y una acción a la derecha. */
export function AppHeader({ title, eyebrow, action, back, className }: AppHeaderProps) {
  return (
    <header
      className={cn(
        "flex items-center justify-between gap-4 px-6 pt-[calc(env(safe-area-inset-top)+24px)] pb-2",
        className,
      )}
    >
      <div className="min-w-0">
        {back ? (
          <Link
            href={back.href}
            className="-ml-2 inline-flex h-11 items-center gap-1 rounded-sm pr-2 text-[13px] font-bold text-primary-text outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <ChevronLeft aria-hidden="true" className="size-5" />
            {back.label}
          </Link>
        ) : null}
        {eyebrow ? (
          <p className="text-[13px] font-semibold text-muted-foreground">{eyebrow}</p>
        ) : null}
        <h1 className="mt-0.5 truncate text-xl font-extrabold">{title}</h1>
      </div>
      {action}
    </header>
  )
}
