"use client"

import { Copy, Download, ExternalLink } from "lucide-react"
import Link from "next/link"
import { useState } from "react"
import { toast } from "sonner"

import { Button, buttonVariants } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { usePlatform } from "@/hooks/use-platform"
import type { Dictionary } from "@/i18n/get-dictionary"
import { interpolate } from "@/i18n/interpolate"

type System = "ios" | "android"

type ShortcutsGuideProps = {
  labels: Dictionary["shortcuts"]
  links: { amount: string; plain: string; category: string | null }
  /** Enlace de iCloud al atajo ya hecho, si existe. */
  readyMadeUrl: string | null
}

function Steps({ steps }: { steps: { title: string; text: string }[] }) {
  return (
    <ol className="flex flex-col gap-3">
      {steps.map((step, index) => (
        <li key={step.title}>
          <Card className="flex items-start gap-3">
            <span
              aria-hidden="true"
              className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-extrabold text-primary-foreground"
            >
              {index + 1}
            </span>
            <div className="min-w-0">
              <h3 className="font-extrabold">{step.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{step.text}</p>
            </div>
          </Card>
        </li>
      ))}
    </ol>
  )
}

function CopyLink({
  labels,
  name,
  url,
}: {
  labels: Dictionary["shortcuts"]
  name: string
  url: string
}) {
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url)
      toast.success(labels.copied)
    } catch {
      toast(url)
    }
  }
  return (
    <div className="flex flex-col gap-2 border-b border-border px-4 py-3 last:border-b-0">
      <p className="text-sm font-bold">{name}</p>
      <div className="flex items-center gap-2">
        <code className="min-w-0 flex-1 truncate rounded-md bg-secondary px-3 py-2 num text-[12px]">
          {url}
        </code>
        <Button
          variant="secondary"
          size="icon"
          aria-label={interpolate(labels.copyLabel, { name })}
          onClick={copy}
        >
          <Copy aria-hidden="true" className="size-5" />
        </Button>
      </div>
    </div>
  )
}

/** Cómo apuntar gastos con un atajo: app Atajos en iPhone y atajo del icono en Android. */
export function ShortcutsGuide({ labels, links, readyMadeUrl }: ShortcutsGuideProps) {
  const platform = usePlatform()
  const [chosen, setChosen] = useState<System | null>(null)
  const system: System = chosen ?? (platform === "android" ? "android" : "ios")

  const linkList = (
    <section aria-labelledby="shortcut-links" className="flex flex-col gap-2">
      <h2 id="shortcut-links" className="text-[15px] font-extrabold">
        {labels.linksTitle}
      </h2>
      <Card className="p-0">
        <CopyLink labels={labels} name={labels.linkAmount} url={links.amount} />
        <CopyLink labels={labels} name={labels.linkPlain} url={links.plain} />
        {links.category ? (
          <CopyLink labels={labels} name={labels.linkCategory} url={links.category} />
        ) : null}
      </Card>
      <Link href="/apuntar?importe=5" className={buttonVariants({ variant: "outline" })}>
        <ExternalLink aria-hidden="true" />
        {labels.tryIt}
      </Link>
    </section>
  )

  return (
    <div className="flex flex-col gap-6">
      <Tabs value={system} onValueChange={(value) => setChosen(value as System)}>
        <TabsList variant="segmented" aria-label={labels.tabsLabel}>
          <TabsTrigger value="ios">{labels.ios}</TabsTrigger>
          <TabsTrigger value="android">{labels.android}</TabsTrigger>
        </TabsList>
      </Tabs>

      {system === "ios" ? (
        <>
          {readyMadeUrl ? (
            <div className="flex flex-col gap-1.5">
              <a href={readyMadeUrl} className={buttonVariants({ size: "lg" })}>
                <Download aria-hidden="true" />
                {labels.readyMade}
              </a>
              <p className="text-center text-xs text-muted-foreground">{labels.readyMadeHint}</p>
            </div>
          ) : null}
          <section aria-labelledby="shortcut-create" className="flex flex-col gap-2">
            <h2 id="shortcut-create" className="text-[15px] font-extrabold">
              {labels.createTitle}
            </h2>
            <Steps steps={labels.iosSteps} />
          </section>
          {linkList}
          <section aria-labelledby="shortcut-where" className="flex flex-col gap-2">
            <h2 id="shortcut-where" className="text-[15px] font-extrabold">
              {labels.whereTitle}
            </h2>
            <Card className="p-0">
              <ul>
                {labels.where.map((place) => (
                  <li
                    key={place.title}
                    className="border-b border-border px-4 py-3 last:border-b-0"
                  >
                    <p className="font-bold">{place.title}</p>
                    <p className="text-sm text-muted-foreground">{place.text}</p>
                  </li>
                ))}
              </ul>
            </Card>
          </section>
          <p className="rounded-md bg-secondary px-4 py-3 text-[13px] font-semibold">
            {labels.iosNote}
          </p>
        </>
      ) : (
        <>
          <Steps steps={labels.androidSteps} />
          <Link
            href="/ajustes/instalar"
            className="flex min-h-11 items-center text-sm font-bold text-primary-text outline-none focus-visible:rounded-md focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            {labels.installLink}
          </Link>
          {linkList}
        </>
      )}
    </div>
  )
}
