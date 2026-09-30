import { cn } from "cn"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "min-h-20 w-full min-w-0 resize-none rounded-sm border border-border bg-card px-3.5 py-3 text-base text-foreground transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-primary-text focus-visible:ring-3 focus-visible:ring-primary-wash disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive",
        className,
      )}
      {...props}
    />
  )
}

export { Textarea }
