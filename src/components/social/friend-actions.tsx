"use client"

import { Trash2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { useTransition } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import type { Dictionary } from "@/i18n/get-dictionary"
import { interpolate } from "@/i18n/interpolate"
import {
  deleteSharedExpense,
  removeFriend,
  settleUp,
  type SocialResult,
} from "@/lib/actions/social"
import { haptics } from "@/lib/haptics"

type Labels = Dictionary["friends"]

function useRun(labels: Labels) {
  const [pending, startTransition] = useTransition()
  const run = (action: () => Promise<SocialResult>, success: string, after?: () => void) =>
    startTransition(async () => {
      const result = await action().catch(() => ({ ok: false, error: "failed" }) as const)
      if (result.ok) {
        haptics.success()
        toast.success(success)
        after?.()
      } else {
        haptics.error()
        toast.error(labels.failed)
      }
    })
  return { pending, run }
}

/** "Saldar cuentas": deja el saldo con este amigo a cero. */
export function SettleButton({ labels, friendId }: { labels: Labels; friendId: string }) {
  const { pending, run } = useRun(labels)
  return (
    <Button
      size="lg"
      disabled={pending}
      onClick={() => run(() => settleUp(friendId), labels.settledToast)}
    >
      {labels.settle}
    </Button>
  )
}

/** Borrar para todos un gasto compartido que creaste tú. */
export function DeleteSharedButton({
  labels,
  sharedExpenseId,
  name,
}: {
  labels: Labels
  sharedExpenseId: string
  name: string
}) {
  const { pending, run } = useRun(labels)
  return (
    <Button
      variant="ghost"
      size="icon"
      disabled={pending}
      aria-label={interpolate(labels.deleteShared, { name })}
      onClick={() => run(() => deleteSharedExpense(sharedExpenseId), labels.deleted)}
    >
      <Trash2 aria-hidden="true" className="size-5" />
    </Button>
  )
}

/** Dejar de ser amigos (los gastos ya compartidos se quedan). */
export function RemoveFriendButton({ labels, friendId }: { labels: Labels; friendId: string }) {
  const router = useRouter()
  const { pending, run } = useRun(labels)
  return (
    <Button
      variant="destructive"
      disabled={pending}
      onClick={() =>
        run(
          () => removeFriend(friendId),
          labels.removed,
          () => router.push("/amigos"),
        )
      }
    >
      {labels.remove}
    </Button>
  )
}
