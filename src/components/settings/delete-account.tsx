"use client"

import { Trash2 } from "lucide-react"
import { useActionState, useEffect, useState } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import type { Dictionary } from "@/i18n/get-dictionary"
import { deleteAccount } from "@/lib/actions/profile"
import { clearLocalData } from "@/lib/local-data"

/** Borrar la cuenta, con confirmación. Si sale bien, la acción redirige al login. */
export function DeleteAccount({
  labels,
  closeLabel,
}: {
  labels: Dictionary["settings"]
  closeLabel: string
}) {
  const [open, setOpen] = useState(false)
  const [state, formAction, pending] = useActionState(deleteAccount, { ok: true })

  useEffect(() => {
    if (!state.ok) toast.error(labels.deleteFailed)
  }, [state, labels.deleteFailed])

  return (
    <>
      <Button variant="destructive" className="w-full" onClick={() => setOpen(true)}>
        <Trash2 />
        {labels.deleteAccount}
      </Button>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent closeLabel={closeLabel}>
          <SheetHeader>
            <SheetTitle>{labels.deleteTitle}</SheetTitle>
            <SheetDescription>{labels.deleteDescription}</SheetDescription>
          </SheetHeader>
          <form
            action={formAction}
            onSubmit={() => void clearLocalData()}
            className="flex flex-col gap-2 px-5 pt-2"
          >
            <Button type="submit" variant="destructive" size="lg" disabled={pending}>
              {labels.deleteConfirm}
            </Button>
            <Button type="button" variant="ghost" size="lg" onClick={() => setOpen(false)}>
              {labels.deleteCancel}
            </Button>
          </form>
        </SheetContent>
      </Sheet>
    </>
  )
}
