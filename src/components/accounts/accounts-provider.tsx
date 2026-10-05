"use client"

import { createContext, useContext, useMemo, useState } from "react"

export type AccountOption = { id: string; name: string; emoji: string }

type AccountsContextValue = {
  accounts: AccountOption[]
  /** Cuenta del último gasto: la que se preselecciona en uno nuevo. */
  lastUsedAccountId: string | null
  setLastUsedAccountId: (id: string) => void
}

const AccountsContext = createContext<AccountsContextValue>({
  accounts: [],
  lastUsedAccountId: null,
  setLastUsedAccountId: () => {},
})

/** Las cuentas del usuario, cargadas una vez en el layout de la app. */
export function AccountsProvider({
  accounts,
  lastUsedAccountId: initialLastUsed,
  children,
}: {
  accounts: AccountOption[]
  lastUsedAccountId: string | null
  children: React.ReactNode
}) {
  const [lastUsedAccountId, setLastUsedAccountId] = useState(initialLastUsed)
  const value = useMemo(
    () => ({ accounts, lastUsedAccountId, setLastUsedAccountId }),
    [accounts, lastUsedAccountId],
  )
  return <AccountsContext value={value}>{children}</AccountsContext>
}

export const useAccounts = () => useContext(AccountsContext)
