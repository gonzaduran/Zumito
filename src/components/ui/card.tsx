import { cn } from "cn"

function Card({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card"
      className={cn("rounded-md bg-card p-4 text-card-foreground shadow-card", className)}
      {...props}
    />
  )
}

export { Card }
