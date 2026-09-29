import { cn } from "cn"

function Label({ className, ...props }: React.ComponentProps<"label">) {
  return (
    <label
      data-slot="label"
      className={cn("mb-2 block text-[13px] font-extrabold text-muted-foreground", className)}
      {...props}
    />
  )
}

export { Label }
