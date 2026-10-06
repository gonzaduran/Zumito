import "server-only"

import { cache } from "react"

import { createClient } from "@/lib/supabase/server"

/** Amigos y solicitudes (recibidas y enviadas), con su saldo. */
export const getMyFriends = cache(async () => {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc("my_friends")
  if (error) throw error
  return data
})

/** Gastos compartidos con un amigo, los más recientes primero. */
export const getSharedWithFriend = cache(async (friendId: string) => {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc("shared_with_friend", {
    p_friend_id: friendId,
    p_limit: 100,
  })
  if (error) throw error
  return data
})
