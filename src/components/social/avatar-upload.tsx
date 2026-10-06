"use client"

import { Camera } from "lucide-react"
import { useRef, useState, useTransition } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import type { Dictionary } from "@/i18n/get-dictionary"
import { setAvatar } from "@/lib/actions/social"
import { haptics } from "@/lib/haptics"
import { createClient } from "@/lib/supabase/client"

import { Avatar } from "./avatar"

const SIZE = 256

/** Recorta al centro en cuadrado y la reduce a 256 px en WebP: pesa unos pocos KB. */
async function toSquareWebp(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file)
  const side = Math.min(bitmap.width, bitmap.height)
  const canvas = document.createElement("canvas")
  canvas.width = SIZE
  canvas.height = SIZE
  const context = canvas.getContext("2d")
  if (!context) throw new Error("Sin canvas")
  context.drawImage(
    bitmap,
    (bitmap.width - side) / 2,
    (bitmap.height - side) / 2,
    side,
    side,
    0,
    0,
    SIZE,
    SIZE,
  )
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/webp", 0.85),
  )
  if (!blob) throw new Error("Sin imagen")
  return blob
}

type AvatarUploadProps = {
  labels: Pick<
    Dictionary["settings"],
    | "avatarLabel"
    | "avatarAdd"
    | "avatarChange"
    | "avatarRemove"
    | "avatarSaved"
    | "avatarRemoved"
    | "avatarFailed"
  >
  userId: string
  name: string
  currentPath: string | null
  currentUrl: string | null
}

/** Subir, cambiar o quitar la foto de perfil (se guarda en Supabase Storage). */
export function AvatarUpload({ labels, userId, name, currentPath, currentUrl }: AvatarUploadProps) {
  const input = useRef<HTMLInputElement>(null)
  const [url, setUrl] = useState(currentUrl)
  const [path, setPath] = useState(currentPath)
  const [pending, startTransition] = useTransition()

  const upload = (file: File) =>
    startTransition(async () => {
      try {
        const blob = await toSquareWebp(file)
        const newPath = `${userId}/${Date.now()}.webp`
        const supabase = createClient()
        const { error } = await supabase.storage
          .from("avatars")
          .upload(newPath, blob, { contentType: "image/webp", upsert: true })
        if (error) throw error
        const result = await setAvatar(newPath)
        if (!result.ok) throw new Error(result.error)
        if (path) await supabase.storage.from("avatars").remove([path])
        setPath(newPath)
        setUrl(URL.createObjectURL(blob))
        haptics.success()
        toast.success(labels.avatarSaved)
      } catch {
        haptics.error()
        toast.error(labels.avatarFailed)
      }
    })

  const remove = () =>
    startTransition(async () => {
      const result = await setAvatar(null).catch(() => ({ ok: false }) as const)
      if (!result.ok) {
        toast.error(labels.avatarFailed)
        return
      }
      if (path) await createClient().storage.from("avatars").remove([path])
      setPath(null)
      setUrl(null)
      toast.success(labels.avatarRemoved)
    })

  return (
    <div className="flex items-center gap-4">
      <Avatar url={url} name={name} size={64} />
      <div className="flex flex-wrap gap-2">
        <input
          ref={input}
          type="file"
          accept="image/*"
          className="sr-only"
          aria-label={labels.avatarLabel}
          onChange={(event) => {
            const file = event.target.files?.[0]
            if (file) upload(file)
            event.target.value = ""
          }}
        />
        <Button
          variant="secondary"
          size="sm"
          disabled={pending}
          onClick={() => input.current?.click()}
        >
          <Camera aria-hidden="true" />
          {url ? labels.avatarChange : labels.avatarAdd}
        </Button>
        {url ? (
          <Button variant="ghost" size="sm" disabled={pending} onClick={remove}>
            {labels.avatarRemove}
          </Button>
        ) : null}
      </div>
    </div>
  )
}
