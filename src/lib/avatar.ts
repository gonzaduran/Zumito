import { getPublicEnv } from "@/lib/env"

/** URL pública de una foto de perfil (bucket "avatars"), o `null` si no hay. */
export function avatarUrl(path: string | null | undefined): string | null {
  if (!path) return null
  return `${getPublicEnv().NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/avatars/${path}`
}

/** Nombre para mostrar: el nombre, el @usuario o un signo de interrogación. */
export function personName(person: { display_name: string | null; username: string | null }) {
  return person.display_name ?? (person.username ? `@${person.username}` : "?")
}
