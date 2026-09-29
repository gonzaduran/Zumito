import Link from "next/link"

type SectionHeaderProps = {
  title: string
  link?: { href: string; label: string }
}

export function SectionHeader({ title, link }: SectionHeaderProps) {
  return (
    <div className="flex items-center justify-between">
      <h2 className="text-[15px] font-extrabold">{title}</h2>
      {link ? (
        <Link
          href={link.href}
          className="-mr-2 inline-flex h-11 items-center rounded-sm px-2 text-xs font-bold text-primary-text outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          {link.label}
        </Link>
      ) : null}
    </div>
  )
}
