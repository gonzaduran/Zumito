import { cn } from "cn"

type AvatarProps = {
  url: string | null
  name: string
  size?: number
  className?: string
}

/** Foto de perfil redonda; sin foto, la inicial del nombre. Es decorativa: el nombre va al lado. */
export function Avatar({ url, name, size = 40, className }: AvatarProps) {
  const initial = name.replace(/^@/, "").trim().charAt(0).toUpperCase() || "?"
  return (
    <span
      aria-hidden="true"
      className={cn(
        "flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary-wash font-extrabold text-primary-text",
        className,
      )}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.42) }}
    >
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element -- foto pequeña de Supabase Storage
        <img src={url} alt="" width={size} height={size} className="size-full object-cover" />
      ) : (
        initial
      )}
    </span>
  )
}
