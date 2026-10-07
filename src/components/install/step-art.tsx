import { cn } from "cn"
import {
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Compass,
  Copy,
  Download,
  EllipsisVertical,
  Globe,
  History,
  Lock,
  Plus,
  Share,
  SquarePlus,
  Star,
} from "lucide-react"

import { Logo } from "@/components/brand/logo"
import type { Dictionary } from "@/i18n/get-dictionary"

export type StepArtKey =
  | "safari"
  | "share"
  | "addHome"
  | "confirmIos"
  | "done"
  | "chrome"
  | "menu"
  | "install"
  | "confirmAndroid"

type StepArtProps = {
  art: StepArtKey
  labels: Dictionary["installGuide"]["art"]
  /** Dirección de la app (p. ej. zumito-eight.vercel.app). */
  host: string
}

/** Lo que hay que tocar en cada paso: con borde de color y en negrita (el texto no se anima para no perder contraste). */
const target =
  "rounded-md bg-card font-extrabold text-foreground ring-2 ring-primary-text ring-offset-2 ring-offset-background"

function Frame({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "mx-auto flex w-full max-w-[280px] flex-col gap-2 overflow-hidden rounded-[22px] border-4 border-border bg-background p-3",
        className,
      )}
    >
      {children}
    </div>
  )
}

function Row({
  icon: Icon,
  label,
  active = false,
}: {
  icon: typeof Copy
  label: string
  active?: boolean
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-between rounded-md bg-card px-3 py-2 text-[13px] font-semibold",
        active && target,
      )}
    >
      {label}
      <Icon className="size-4" />
    </div>
  )
}

/** Dibujo del paso: la parte de la pantalla de iPhone o Android que se toca. */
export function StepArt({ art, labels, host }: StepArtProps) {
  switch (art) {
    case "safari":
    case "share":
      return (
        <Frame>
          <div className="flex h-12 items-center justify-center rounded-md bg-card">
            <Logo size={28} className="text-foreground" />
          </div>
          <div
            className={cn(
              "flex items-center gap-1.5 rounded-full bg-card px-3 py-1.5 text-[12px] font-semibold",
              art === "safari" && target,
            )}
          >
            <Lock className="size-3" />
            <span className="truncate">{host}</span>
          </div>
          <div className="flex items-center justify-between px-2 text-muted-foreground">
            <ChevronLeft className="size-5" />
            <ChevronRight className="size-5" />
            <span className={cn("p-1", art === "share" && target)}>
              <Share className="size-5" />
            </span>
            <BookOpen className="size-5" />
            {art === "safari" ? <Compass className="size-5" /> : <Copy className="size-5" />}
          </div>
        </Frame>
      )
    case "addHome":
      return (
        <Frame>
          <Row icon={Copy} label={labels.copy} />
          <Row icon={Star} label={labels.addFavorite} />
          <Row icon={SquarePlus} label={labels.addHome} active />
        </Frame>
      )
    case "confirmIos":
      return (
        <Frame>
          <div className="flex items-center justify-between text-[13px] font-semibold">
            <span className="text-muted-foreground">{labels.cancel}</span>
            <span className={cn("px-2 py-0.5 font-extrabold", target)}>{labels.add}</span>
          </div>
          <div className="flex items-center gap-3 rounded-md bg-card p-2">
            <span className="flex size-11 items-center justify-center rounded-xl bg-background">
              <Logo size={30} className="text-foreground" />
            </span>
            <div className="min-w-0">
              <p className="text-[13px] font-bold">Zumito</p>
              <p className="truncate text-[11px] text-muted-foreground">{host}</p>
            </div>
          </div>
        </Frame>
      )
    case "done":
      return (
        <Frame>
          <div className="grid grid-cols-4 gap-3 p-1">
            {Array.from({ length: 7 }, (_, index) => (
              <span key={index} className="aspect-square rounded-xl bg-card" />
            ))}
            <span
              className={cn("flex aspect-square items-center justify-center rounded-xl", target)}
            >
              <Logo size={26} className="text-foreground" />
            </span>
          </div>
        </Frame>
      )
    case "chrome":
    case "menu":
      return (
        <Frame>
          <div className="flex items-center gap-2">
            <div
              className={cn(
                "flex min-w-0 flex-1 items-center gap-1.5 rounded-full bg-card px-3 py-1.5 text-[12px] font-semibold",
                art === "chrome" && target,
              )}
            >
              <Globe className="size-3" />
              <span className="truncate">{host}</span>
            </div>
            <span className={cn("p-1", art === "menu" && target)}>
              <EllipsisVertical className="size-5" />
            </span>
          </div>
          <div className="flex h-14 items-center justify-center rounded-md bg-card">
            <Logo size={28} className="text-foreground" />
          </div>
        </Frame>
      )
    case "install":
      return (
        <Frame>
          <Row icon={Plus} label={labels.newTab} />
          <Row icon={History} label={labels.history} />
          <Row icon={Download} label={labels.install} active />
        </Frame>
      )
    case "confirmAndroid":
      return (
        <Frame>
          <div className="flex flex-col gap-3 rounded-md bg-card p-3">
            <div className="flex items-center gap-3">
              <Logo size={30} className="text-foreground" />
              <div className="min-w-0">
                <p className="text-[13px] font-bold">Zumito</p>
                <p className="truncate text-[11px] text-muted-foreground">{host}</p>
              </div>
            </div>
            <div className="flex justify-end gap-3 text-[13px] font-bold">
              <span className="px-2 py-1 text-muted-foreground">{labels.cancel}</span>
              <span className={cn("px-3 py-1", target)}>{labels.installButton}</span>
            </div>
          </div>
        </Frame>
      )
  }
}
