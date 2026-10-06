"use client"

import { cn } from "cn"
import { Check } from "lucide-react"
import { useState } from "react"

import { Button } from "@/components/ui/button"
import { Chip } from "@/components/ui/chip"
import { EmojiPicker } from "@/components/ui/emoji-picker"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { Dictionary } from "@/i18n/get-dictionary"
import { categoryColors, categoryColorVar, type CategoryColor } from "@/lib/category-colors"
import { suggestEmojis, normalize } from "@/lib/emoji-catalog"
import { categoryInputSchema, type CategoryInput } from "@/lib/validators/category"

/** Emoji de una categoría nueva hasta que se elija otro o el nombre sugiera uno. */
const DEFAULT_EMOJI = "🏷️"

type CategoryFormProps = {
  labels: Dictionary["categories"]
  emojiLabels: Dictionary["emojiPicker"]
  /** Nombres que ya existen: no se proponen como idea. */
  existingNames?: string[]
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
  emojiLabels,
  existingNames = [],
  colorNames,
  validation,
  initial,
  submitLabel,
  pending,
  onSubmit,
  footer,
}: CategoryFormProps) {
  const [name, setName] = useState(initial?.name ?? "")
  const [emoji, setEmoji] = useState(initial?.emoji ?? DEFAULT_EMOJI)
  // Al crear, el emoji sigue al nombre ("Supermercado" → 🛒) hasta que se elige uno a mano.
  const [emojiChosen, setEmojiChosen] = useState(Boolean(initial))
  const taken = new Set(existingNames.map(normalize))
  const ideas = initial ? [] : labels.ideas.filter((idea) => !taken.has(normalize(idea.name)))

  const changeName = (value: string) => {
    setName(value)
    setErrors((current) => ({ ...current, name: undefined }))
    if (!emojiChosen) setEmoji(suggestEmojis(value)[0] ?? DEFAULT_EMOJI)
  }
  const chooseEmoji = (value: string) => {
    setEmoji(value)
    setEmojiChosen(true)
    setErrors((current) => ({ ...current, emoji: undefined }))
  }
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
      {ideas.length > 0 ? (
        <div>
          <p className="mb-2 text-[13px] font-extrabold text-muted-foreground">
            {labels.ideasLabel}
          </p>
          <div
            role="group"
            aria-label={labels.ideasLabel}
            className="-mx-5 flex [scrollbar-width:none] gap-2 overflow-x-auto px-5 pb-1"
          >
            {ideas.map((idea) => (
              <Chip
                key={idea.name}
                pressed={normalize(name) === normalize(idea.name)}
                onPressedChange={() => {
                  changeName(idea.name)
                  chooseEmoji(idea.emoji)
                }}
              >
                <span aria-hidden="true" className="text-base">
                  {idea.emoji}
                </span>
                {idea.name}
              </Chip>
            ))}
          </div>
        </div>
      ) : null}

      <div>
        <Label htmlFor="category-name">{labels.nameLabel}</Label>
        <Input
          id="category-name"
          value={name}
          maxLength={30}
          placeholder={labels.namePlaceholder}
          onChange={(event) => changeName(event.target.value)}
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
        <p className="mb-2 text-[13px] font-extrabold text-muted-foreground">{labels.emojiLabel}</p>
        <EmojiPicker
          labels={emojiLabels}
          inputLabel={labels.emojiLabel}
          inputId="category-emoji"
          value={emoji}
          onChange={chooseEmoji}
          name={name}
          invalid={Boolean(errors.emoji)}
          describedBy={errors.emoji ? "category-emoji-error" : undefined}
        />
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
