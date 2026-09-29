"use client"

import { cn } from "cn"
import { ArrowLeft } from "lucide-react"
import { useActionState, useState } from "react"

import { completeOnboarding } from "@/app/(auth)/onboarding/actions"
import { Logo } from "@/components/brand/logo"
import { Button } from "@/components/ui/button"
import { Chip } from "@/components/ui/chip"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { Dictionary } from "@/i18n/get-dictionary"
import { interpolate } from "@/i18n/interpolate"
import { defaultCategories, type DefaultCategoryKey } from "@/lib/default-categories"

const TOTAL_STEPS = 2

export function OnboardingForm({ labels }: { labels: Dictionary["onboarding"] }) {
  const [step, setStep] = useState<1 | 2>(1)
  const [name, setName] = useState("")
  const [selected, setSelected] = useState<Set<DefaultCategoryKey>>(
    () => new Set(defaultCategories.map((c) => c.key)),
  )
  const [state, formAction, saving] = useActionState(completeOnboarding, { error: null })

  const toggle = (key: DefaultCategoryKey, pressed: boolean) =>
    setSelected((current) => {
      const next = new Set(current)
      if (pressed) next.add(key)
      else next.delete(key)
      return next
    })

  return (
    <div className="flex flex-1 flex-col">
      <div className="mb-8 flex h-11 items-center justify-between">
        {step === 2 ? (
          <Button variant="ghost" size="icon" className="-ml-3" onClick={() => setStep(1)}>
            <ArrowLeft />
            <span className="sr-only">{labels.back}</span>
          </Button>
        ) : (
          <span />
        )}
        <p className="sr-only" aria-live="polite">
          {interpolate(labels.stepLabel, { current: step, total: TOTAL_STEPS })}
        </p>
        <div aria-hidden="true" className="flex gap-1.5">
          {[1, 2].map((dot) => (
            <span
              key={dot}
              className={cn(
                "h-2 rounded-full bg-border transition-all duration-300",
                dot === step ? "w-6 bg-primary" : "w-2",
              )}
            />
          ))}
        </div>
      </div>

      {step === 1 ? (
        <form
          className="flex flex-1 flex-col"
          onSubmit={(event) => {
            event.preventDefault()
            setStep(2)
          }}
        >
          <Logo size={88} className="text-foreground" />
          <h1 className="mt-8 text-[28px] leading-tight font-extrabold">{labels.welcomeTitle}</h1>
          <p className="mt-2 text-[15px] text-muted-foreground">{labels.welcomeText}</p>
          <div className="mt-10">
            <Label htmlFor="displayName">{labels.nameLabel}</Label>
            <Input
              id="displayName"
              autoComplete="given-name"
              placeholder={labels.namePlaceholder}
              maxLength={40}
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </div>
          <Button type="submit" size="lg" className="mt-auto w-full">
            {labels.continue}
          </Button>
        </form>
      ) : (
        <form action={formAction} className="flex flex-1 flex-col">
          <input type="hidden" name="displayName" value={name} />
          <input
            type="hidden"
            name="timezone"
            value={Intl.DateTimeFormat().resolvedOptions().timeZone}
          />
          {[...selected].map((key) => (
            <input key={key} type="hidden" name="categories" value={key} />
          ))}
          <h1 className="text-[28px] leading-tight font-extrabold">{labels.categoriesTitle}</h1>
          <p className="mt-2 text-[15px] text-muted-foreground">{labels.categoriesText}</p>
          <div
            role="group"
            aria-label={labels.categoriesTitle}
            className="mt-6 flex flex-wrap gap-2"
          >
            {defaultCategories.map(({ key, emoji }) => (
              <Chip
                key={key}
                pressed={selected.has(key)}
                onPressedChange={(pressed) => toggle(key, pressed)}
              >
                <span aria-hidden="true" className="text-base">
                  {emoji}
                </span>
                {labels.categories[key]}
              </Chip>
            ))}
          </div>
          <div className="mt-auto flex flex-col gap-3 pt-8">
            <p role="alert" className="min-h-5 text-center text-sm font-semibold text-destructive">
              {selected.size === 0
                ? labels.errors.noCategories
                : state.error
                  ? labels.errors[state.error]
                  : ""}
            </p>
            <Button type="submit" size="lg" disabled={saving || selected.size === 0}>
              {saving ? labels.saving : labels.finish}
            </Button>
          </div>
        </form>
      )}
    </div>
  )
}
