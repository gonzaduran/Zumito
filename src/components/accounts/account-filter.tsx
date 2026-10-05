"use client"

import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useTransition } from "react"

import { Chip } from "@/components/ui/chip"

import { useAccounts } from "./accounts-provider"

/**
 * Filtro por cuenta en la URL (?a=). Conserva el resto de filtros y vuelve a la primera
 * página. Solo se muestra con más de una cuenta.
 */
export function AccountFilter({ label, allLabel }: { label: string; allLabel: string }) {
  const { accounts } = useAccounts()
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [, startTransition] = useTransition()
  const accountId = searchParams.get("a") ?? ""

  if (accounts.length < 2) return null

  const select = (id: string) => {
    const params = new URLSearchParams(searchParams)
    if (id) params.set("a", id)
    else params.delete("a")
    params.delete("n")
    const search = params.toString()
    startTransition(() => router.replace(search ? `${pathname}?${search}` : pathname))
  }

  return (
    <div
      role="group"
      aria-label={label}
      className="-mx-6 flex [scrollbar-width:none] gap-2 overflow-x-auto px-6 pb-1"
    >
      <Chip pressed={!accountId} onPressedChange={() => select("")}>
        {allLabel}
      </Chip>
      {accounts.map((account) => (
        <Chip
          key={account.id}
          pressed={account.id === accountId}
          onPressedChange={(pressed) => select(pressed ? account.id : "")}
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
