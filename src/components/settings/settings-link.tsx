import { ChevronRight, type LucideIcon } from "lucide-react"
import Link from "next/link"

type SettingsLinkProps = {
  href: string
  icon: LucideIcon
  title: string
  hint?: string
  /** Descarga de archivo en lugar de navegación. */
  download?: boolean
}

export function SettingsLink({ href, icon: Icon, title, hint, download }: SettingsLinkProps) {
  const content = (
    <>
      <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary-wash text-primary-text">
        <Icon aria-hidden="true" className="size-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-bold">{title}</span>
        {hint ? <span className="block text-[13px] text-muted-foreground">{hint}</span> : null}
      </span>
      <ChevronRight aria-hidden="true" className="size-5 text-muted-foreground" />
    </>
  )
  const className =
    "flex min-h-16 items-center gap-3 border-b border-border px-4 py-3 outline-none last:border-b-0 focus-visible:rounded-md focus-visible:ring-3 focus-visible:ring-ring/50"
  // Las descargas son un <a> normal: Link intentaría navegar dentro de la app.
  return download ? (
    <a href={href} download className={className}>
      {content}
    </a>
  ) : (
    <Link href={href} className={className}>
      {content}
    </Link>
  )
}
