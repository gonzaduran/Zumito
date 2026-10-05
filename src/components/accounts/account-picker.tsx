"use client"

import { Chip } from "@/components/ui/chip"
import { haptics } from "@/lib/haptics"

import type { AccountOption } from "./accounts-provider"

type AccountPickerProps = {
  label: string
  accounts: AccountOption[]
  value: string | undefined
  onChange: (id: string) => void
}

/** Cuenta del gasto o ingreso. Solo se muestra si hay más de una. */
export function AccountPicker({ label, accounts, value, onChange }: AccountPickerProps) {
  if (accounts.length < 2) return null
  return (
    <div
      role="group"
      aria-label={label}
      className="-mx-5 flex [scrollbar-width:none] gap-2 overflow-x-auto px-5 pb-1"
    >
      {accounts.map((account) => (
        <Chip
          key={account.id}
          pressed={account.id === value}
          onPressedChange={() => {
            haptics.tap()
            onChange(account.id)
          }}
        >
          <span aria-hidden="true" className="text-base">
            {account.emoji}
          </span>
          {account.name}
        </Chip>
      ))}
    </div>
  )
}
