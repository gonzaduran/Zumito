"use client"

import { Search } from "lucide-react"
import { useId, useMemo, useState } from "react"

import { Chip } from "@/components/ui/chip"
import { Input } from "@/components/ui/input"
import type { Dictionary } from "@/i18n/get-dictionary"
import { interpolate } from "@/i18n/interpolate"
import { EMOJI_CATALOG, searchEmojis, suggestEmojis, type EmojiGroupKey } from "@/lib/emoji-catalog"

type EmojiPickerProps = {
  labels: Dictionary["emojiPicker"]
  /** Etiqueta del recuadro con el emoji elegido (también se puede escribir cualquiera). */
  inputLabel: string
  inputId: string
  value: string
  onChange: (emoji: string) => void
  /** Nombre de la categoría o cuenta: se usa para sugerir emojis. */
  name?: string
  invalid?: boolean
  describedBy?: string
}

type Tab = "suggested" | EmojiGroupKey

/** Emoji elegido + buscador en español + pestañas por grupo (cientos de emojis). */
export function EmojiPicker({
  labels,
  inputLabel,
  inputId,
  value,
  onChange,
  name = "",
  invalid,
  describedBy,
}: EmojiPickerProps) {
  const gridId = useId()
  const [query, setQuery] = useState("")
  const suggested = useMemo(() => suggestEmojis(name), [name])
  const [tab, setTab] = useState<Tab | null>(null)
  // Con sugerencias para el nombre se abren esas; si no, el primer grupo.
  const activeTab: Tab = tab ?? (suggested.length > 0 ? "suggested" : "food")

  const results = query.trim() ? searchEmojis(query) : null
  const visible =
    results ??
    (activeTab === "suggested"
      ? suggested
      : (EMOJI_CATALOG.find((group) => group.key === activeTab)?.emojis.map(([e]) => e) ?? []))

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <Input
          id={inputId}
          aria-label={inputLabel}
          value={value}
          maxLength={16}
          onChange={(event) => onChange(event.target.value)}
          className="h-14 w-16 shrink-0 px-0 text-center text-2xl"
          aria-invalid={invalid || undefined}
          aria-describedby={describedBy}
        />
        <div className="relative flex-1">
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 left-4 size-[18px] -translate-y-1/2 text-muted-foreground"
          />
          <Input
            type="search"
            aria-label={labels.searchLabel}
            aria-controls={gridId}
            placeholder={labels.searchPlaceholder}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="rounded-full pl-11"
          />
        </div>
      </div>

      {results === null ? (
        <div
          role="group"
          aria-label={labels.groupsLabel}
          className="-mx-5 flex [scrollbar-width:none] gap-2 overflow-x-auto px-5 pb-1"
        >
          {suggested.length > 0 ? (
            <Chip pressed={activeTab === "suggested"} onPressedChange={() => setTab("suggested")}>
              {interpolate(labels.suggestedFor, { name: name.trim() })}
            </Chip>
          ) : null}
          {EMOJI_CATALOG.map((group) => (
            <Chip
              key={group.key}
              pressed={activeTab === group.key}
              onPressedChange={() => setTab(group.key)}
            >
              <span aria-hidden="true" className="text-base">
                {group.emojis[0]?.[0]}
              </span>
              {labels.groups[group.key]}
            </Chip>
          ))}
        </div>
      ) : null}

      <div
        id={gridId}
        role="group"
        aria-label={labels.gridLabel}
        className="grid grid-cols-8 gap-1"
      >
        {visible.map((emoji) => (
          <button
            key={emoji}
            type="button"
            aria-pressed={emoji === value}
            onClick={() => onChange(emoji)}
            className="flex aspect-square min-h-9 items-center justify-center rounded-sm text-xl outline-none focus-visible:ring-3 focus-visible:ring-ring/50 aria-pressed:bg-primary-wash"
          >
            {emoji}
          </button>
        ))}
      </div>
      {results !== null && results.length === 0 ? (
        <p className="text-sm text-muted-foreground">{labels.noResults}</p>
      ) : null}
    </div>
  )
}
