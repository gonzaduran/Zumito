"use client"

import { createContext, useContext } from "react"

export type FriendOption = { id: string; name: string; avatarUrl: string | null }

type SocialContextValue = {
  /** Tú (para poner tu parte y "Yo" en quién pagó). */
  me: { id: string; name: string } | null
  /** Amigos aceptados, con los que se puede dividir un gasto. */
  friends: FriendOption[]
}

const SocialContext = createContext<SocialContextValue>({ me: null, friends: [] })

/** Tus amigos, cargados una vez en el layout de la app. */
export function SocialProvider({
  me,
  friends,
  children,
}: SocialContextValue & { children: React.ReactNode }) {
  return <SocialContext value={{ me, friends }}>{children}</SocialContext>
}

export const useSocial = () => useContext(SocialContext)
