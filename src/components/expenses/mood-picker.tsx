"use client"

import { cn } from "cn"

import type { Dictionary } from "@/i18n/get-dictionary"
import { moods, type Mood } from "@/lib/validators/expense"

const EMOJI: Record<Mood, string> = { good: "😀", neutral: "😐", bad: "😞" }

type MoodPickerProps = {
  label: string
  names: Dictionary["addExpense"]["moods"]
  value: Mood | undefined
  onChange: (value: Mood | undefined) => void
}

/** Estado de ánimo opcional: tocar el elegido lo quita. */
export function MoodPicker({ label, names, value, onChange }: MoodPickerProps) {
  return (
    <div role="group" aria-label={label}>
      <p className="mb-2 text-[13px] font-extrabold text-muted-foreground">{label}</p>
      <div className="flex gap-2">
        {moods.map((mood) => (
          <button
            key={mood}
            type="button"
            aria-pressed={value === mood}
            aria-label={names[mood]}
            onClick={() => onChange(value === mood ? undefined : mood)}
            className={cn(
              "flex h-12 flex-1 items-center justify-center rounded-md border-2 border-border bg-card text-2xl transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
              value === mood && "border-primary-text bg-primary-wash",
            )}
          >
            <span aria-hidden="true">{EMOJI[mood]}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
