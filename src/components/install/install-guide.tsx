"use client"

import { CircleCheck, Download } from "lucide-react"
import Link from "next/link"
import { useState } from "react"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useInstallPrompt, usePlatform } from "@/hooks/use-platform"
import type { Dictionary } from "@/i18n/get-dictionary"
import { interpolate } from "@/i18n/interpolate"

import { StepArt, type StepArtKey } from "./step-art"

type System = "ios" | "android"

type InstallGuideProps = {
  labels: Dictionary["installGuide"]
  host: string
}

/** Tutorial ilustrado para añadir Zumito a la pantalla de inicio en iPhone y Android. */
export function InstallGuide({ labels, host }: InstallGuideProps) {
  const platform = usePlatform()
  const install = useInstallPrompt()
  const [chosen, setChosen] = useState<System | null>(null)
  // Se abre con el sistema del móvil que se está usando.
  const system: System = chosen ?? (platform === "android" ? "android" : "ios")
  const steps = labels.steps[system]

  return (
    <div className="flex flex-col gap-6">
      {platform === "installed" ? (
        <Card className="flex items-center gap-3 bg-primary-wash">
          <CircleCheck aria-hidden="true" className="size-5 shrink-0 text-primary-text" />
          <p className="text-sm font-bold">{labels.installed}</p>
        </Card>
      ) : null}

      {install ? (
        <Button size="lg" onClick={install}>
          <Download />
          {labels.installNow}
        </Button>
      ) : null}

      <Tabs value={system} onValueChange={(value) => setChosen(value as System)}>
        <TabsList variant="segmented" aria-label={labels.tabsLabel}>
          <TabsTrigger value="ios">{labels.ios}</TabsTrigger>
          <TabsTrigger value="android">{labels.android}</TabsTrigger>
        </TabsList>
      </Tabs>

      <ol className="flex flex-col gap-4">
        {steps.map((step, index) => (
          <li key={step.title}>
            <Card className="flex flex-col gap-4">
              <div className="flex items-start gap-3">
                <span
                  aria-hidden="true"
                  className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-extrabold text-primary-foreground"
                >
                  {index + 1}
                </span>
                <div className="min-w-0">
                  <h2 className="font-extrabold">
                    <span className="sr-only">
                      {interpolate(labels.stepLabel, { number: String(index + 1) })}:{" "}
                    </span>
                    {step.title}
                  </h2>
                  <p className="mt-1 text-sm text-muted-foreground">{step.text}</p>
                </div>
              </div>
              <StepArt art={step.art as StepArtKey} labels={labels.art} host={host} />
            </Card>
          </li>
        ))}
      </ol>

      <p className="text-center text-xs text-muted-foreground">
        {system === "ios" ? labels.iosNote : labels.androidNote}
      </p>

      <Card className="flex flex-col gap-2 bg-primary-wash">
        <h2 className="font-extrabold">{labels.nextTitle}</h2>
        <p className="text-sm">{labels.nextText}</p>
        <Link
          href="/ajustes/atajos"
          className="flex min-h-11 items-center text-sm font-bold text-primary-text outline-none focus-visible:rounded-md focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          {labels.nextLink}
        </Link>
      </Card>
    </div>
  )
}
