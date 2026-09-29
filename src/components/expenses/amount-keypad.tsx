"use client"

import { Delete } from "lucide-react"

import type { Dictionary } from "@/i18n/get-dictionary"
import type { AmountKey } from "@/lib/amount-input"
import { haptics } from "@/lib/haptics"

type AmountKeypadProps = {
  labels: Dictionary["addExpense"]["keypad"]
  onKey: (key: AmountKey) => void
}

const keys: AmountKey[] = ["1", "2", "3", "4", "5", "6", "7", "8", "9", ",", "0", "backspace"]

/** Teclado numérico propio: grande, a una mano y sin abrir el teclado del sistema. */
export function AmountKeypad({ labels, onKey }: AmountKeypadProps) {
  return (
    <div role="group" aria-label={labels.label} className="grid grid-cols-3 gap-2">
      {keys.map((key) => (
        <button
          key={key}
          type="button"
          aria-label={
            key === "backspace" ? labels.backspace : key === "," ? labels.decimal : undefined
          }
          onClick={() => {
            haptics.tap()
            onKey(key)
          }}
          className="flex h-14 items-center justify-center rounded-md bg-card num text-2xl font-bold shadow-card transition-transform outline-none select-none focus-visible:ring-3 focus-visible:ring-ring/50 active:scale-95 active:bg-secondary motion-reduce:active:scale-100"
        >
          {key === "backspace" ? <Delete aria-hidden="true" className="size-6" /> : key}
        </button>
      ))}
    </div>
  )
}
