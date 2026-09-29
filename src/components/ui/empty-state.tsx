import { cn } from "cn"
import type { LucideIcon } from "lucide-react"

type EmptyStateProps = React.ComponentProps<"div"> & {
  icon: LucideIcon
  title: string
  description?: string
  action?: React.ReactNode
}

function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
  ...props
}: EmptyStateProps) {
  return (
    <div
      data-slot="empty-state"
      className={cn(
        "flex flex-col items-center justify-center gap-3 px-8 py-12 text-center",
        className,
      )}
      {...props}
    >
      <div className="mb-1 flex size-16 items-center justify-center rounded-full bg-secondary">
        <Icon aria-hidden="true" className="size-7 text-muted-foreground" strokeWidth={1.8} />
      </div>
      <p className="text-[19px] font-extrabold">{title}</p>
      {description ? (
        <p className="max-w-[260px] text-sm text-muted-foreground">{description}</p>
      ) : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  )
}

export { EmptyState }
