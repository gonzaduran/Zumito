"use client"

import { cn } from "cn"
import { Check } from "lucide-react"
import { useState } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { Dictionary } from "@/i18n/get-dictionary"
import { categoryColors, categoryColorVar, type CategoryColor } from "@/lib/category-colors"
import { categoryInputSchema, type CategoryInput } from "@/lib/validators/category"

/** Emojis habituales para categorías de gasto. */
const EMOJI_SUGGESTIONS = [
  "🍽️",
  "🛒",
  "☕",
  "🍻",
  "🚌",
  "⛽",
  "🏠",
  "💊",
  "👕",
  "🎁",
  "✈️",
  "📱",
  "🐶",
  "🎬",
  "🏋️",
  "📚",
  "💡",
  "🚗",
  "👶",
  "💇",
  "🎮",
  "🧾",
  "🏥",
  "💼",
]

type CategoryFormProps = {
  labels: Dictionary["categories"]
  colorNames: Dictionary["categoryColors"]
  validation: Dictionary["validation"]
  initial?: CategoryInput
  submitLabel: string
  pending: boolean
  onSubmit: (input: CategoryInput) => void
  footer?: React.ReactNode
}

export function CategoryForm({
  labels,
  colorNames,
  validation,
  initial,
  submitLabel,
  pending,
  onSubmit,
  footer,
}: CategoryFormProps) {
  const [name, setName] = useState(initial?.name ?? "")
  const [emoji, setEmoji] = useState(initial?.emoji ?? EMOJI_SUGGESTIONS[0] ?? "")
  const [color, setColor] = useState<CategoryColor>(initial?.color ?? "denim")
  const [errors, setErrors] = useState<Partial<Record<keyof CategoryInput, string>>>({})

  const submit = () => {
    const parsed = categoryInputSchema.safeParse({ name, emoji, color })
    if (!parsed.success) {
      const next: typeof errors = {}
      for (const issue of parsed.error.issues) {
        const field = issue.path[0] as keyof CategoryInput
        next[field] ??= validation[issue.message as keyof Dictionary["validation"]]
      }
      setErrors(next)
      return
    }
    setErrors({})
    onSubmit(parsed.data)
  }

  return (
    <form
      className="flex flex-col gap-5 px-5"
      onSubmit={(event) => {
        event.preventDefault()
        submit()
      }}
    >
      <div>
        <Label htmlFor="category-name">{labels.nameLabel}</Label>
        <Input
          id="category-name"
          value={name}
          maxLength={30}
          placeholder={labels.namePlaceholder}
          onChange={(event) => {
            setName(event.target.value)
            setErrors((current) => ({ ...current, name: undefined }))
          }}
          aria-invalid={errors.name ? true : undefined}
          aria-describedby={errors.name ? "category-name-error" : undefined}
        />
        {errors.name ? (
          <p id="category-name-error" className="mt-1.5 text-sm font-semibold text-destructive">
            {errors.name}
          </p>
        ) : null}
      </div>

      <div>
        <Label htmlFor="category-emoji">{labels.emojiLabel}</Label>
        <div className="flex items-start gap-3">
          <Input
            id="category-emoji"
            value={emoji}
            maxLength={16}
            onChange={(event) => {
              setEmoji(event.target.value)
              setErrors((current) => ({ ...current, emoji: undefined }))
            }}
            className="h-14 w-16 shrink-0 px-0 text-center text-2xl"
            aria-invalid={errors.emoji ? true : undefined}
            aria-describedby={errors.emoji ? "category-emoji-error" : undefined}
          />
          <div
            role="group"
            aria-label={labels.emojiSuggestions}
            className="grid flex-1 grid-cols-8 gap-1"
          >
            {EMOJI_SUGGESTIONS.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                aria-pressed={suggestion === emoji}
                onClick={() => {
                  setEmoji(suggestion)
                  setErrors((current) => ({ ...current, emoji: undefined }))
                }}
                className="flex aspect-square min-h-9 items-center justify-center rounded-sm text-lg outline-none focus-visible:ring-3 focus-visible:ring-ring/50 aria-pressed:bg-primary-wash"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
        {errors.emoji ? (
          <p id="category-emoji-error" className="mt-1.5 text-sm font-semibold text-destructive">
            {errors.emoji}
          </p>
        ) : null}
      </div>

      <div>
        <p
          id="category-color-label"
          className="mb-2 text-[13px] font-extrabold text-muted-foreground"
        >
          {labels.colorLabel}
        </p>
        <div
          role="radiogroup"
          aria-labelledby="category-color-label"
          className="grid grid-cols-6 gap-2"
        >
          {categoryColors.map((option) => (
            <button
              key={option}
              type="button"
              role="radio"
              aria-checked={option === color}
              aria-label={colorNames[option]}
              onClick={() => setColor(option)}
              className={cn(
                "flex size-11 items-center justify-center justify-self-center rounded-full outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                option === color && "ring-3 ring-foreground ring-offset-2 ring-offset-popover",
              )}
              style={{ background: categoryColorVar(option) }}
            >
              {option === color ? (
                <Check aria-hidden="true" className="size-5 text-background" strokeWidth={3} />
              ) : null}
            </button>
          ))}
        </div>
      </div>

      <Button type="submit" size="lg" disabled={pending}>
        {pending ? labels.saving : submitLabel}
      </Button>
      {footer}
    </form>
  )
}
