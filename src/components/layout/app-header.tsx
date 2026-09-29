import { cn } from "cn"

type AppHeaderProps = {
  title: string
  eyebrow?: string
  action?: React.ReactNode
  className?: string
}

/** Cabecera minimalista: texto pequeño opcional, título y una acción a la derecha. */
export function AppHeader({ title, eyebrow, action, className }: AppHeaderProps) {
  return (
    <header
      className={cn(
        "flex items-center justify-between gap-4 px-6 pt-[calc(env(safe-area-inset-top)+24px)] pb-2",
        className,
      )}
    >
      <div className="min-w-0">
        {eyebrow ? (
          <p className="text-[13px] font-semibold text-muted-foreground">{eyebrow}</p>
        ) : null}
        <h1 className="mt-0.5 truncate text-xl font-extrabold">{title}</h1>
      </div>
      {action}
    </header>
  )
}
