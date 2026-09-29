"use client"

import { Dialog as SheetPrimitive } from "@base-ui/react/dialog"
import { cn } from "cn"
import { XIcon } from "lucide-react"

import { Button } from "@/components/ui/button"

function Sheet(props: SheetPrimitive.Root.Props) {
  return <SheetPrimitive.Root data-slot="sheet" {...props} />
}

function SheetTrigger(props: SheetPrimitive.Trigger.Props) {
  return <SheetPrimitive.Trigger data-slot="sheet-trigger" {...props} />
}

function SheetClose(props: SheetPrimitive.Close.Props) {
  return <SheetPrimitive.Close data-slot="sheet-close" {...props} />
}

/** Panel inferior (bottom sheet) pensado para usarse con una mano. */
function SheetContent({
  className,
  children,
  closeLabel = "Cerrar",
  ...props
}: SheetPrimitive.Popup.Props & { closeLabel?: string }) {
  return (
    <SheetPrimitive.Portal>
      <SheetPrimitive.Backdrop
        data-slot="sheet-overlay"
        className="fixed inset-0 z-50 bg-overlay transition-opacity duration-200 data-ending-style:opacity-0 data-starting-style:opacity-0"
      />
      <SheetPrimitive.Popup
        data-slot="sheet-content"
        className={cn(
          "fixed inset-x-0 bottom-0 z-50 mx-auto flex max-h-[92dvh] w-full max-w-lg flex-col rounded-t-lg bg-popover pb-[max(1rem,env(safe-area-inset-bottom))] text-popover-foreground shadow-card transition-transform duration-300 ease-out outline-none data-ending-style:translate-y-full data-starting-style:translate-y-full motion-reduce:transition-none",
          className,
        )}
        {...props}
      >
        <div aria-hidden="true" className="mx-auto mt-2.5 h-[5px] w-10 rounded-full bg-border" />
        {children}
        <SheetPrimitive.Close
          data-slot="sheet-close"
          render={<Button variant="secondary" size="icon" className="absolute top-3 right-4" />}
        >
          <XIcon className="size-4" strokeWidth={2.6} />
          <span className="sr-only">{closeLabel}</span>
        </SheetPrimitive.Close>
      </SheetPrimitive.Popup>
    </SheetPrimitive.Portal>
  )
}

function SheetHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sheet-header"
      className={cn("flex flex-col gap-1 px-5 pt-3 pr-16 pb-2", className)}
      {...props}
    />
  )
}

function SheetTitle({ className, ...props }: SheetPrimitive.Title.Props) {
  return (
    <SheetPrimitive.Title
      data-slot="sheet-title"
      className={cn("text-[17px] font-extrabold", className)}
      {...props}
    />
  )
}

function SheetDescription({ className, ...props }: SheetPrimitive.Description.Props) {
  return (
    <SheetPrimitive.Description
      data-slot="sheet-description"
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  )
}

export { Sheet, SheetTrigger, SheetClose, SheetContent, SheetHeader, SheetTitle, SheetDescription }
