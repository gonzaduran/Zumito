"use client"

import { cn } from "cn"
import { MapPin } from "lucide-react"
import { useId, useState } from "react"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { suggest, type NamedOption } from "@/lib/suggestions"

type PlaceComboboxProps = {
  label: string
  placeholder: string
  suggestionsLabel: string
  value: string
  onChange: (value: string) => void
  options: NamedOption[]
}

/** Campo de lugar con autocompletado por frecuencia de uso (patrón combobox de ARIA). */
export function PlaceCombobox({
  label,
  placeholder,
  suggestionsLabel,
  value,
  onChange,
  options,
}: PlaceComboboxProps) {
  const id = useId()
  const listId = `${id}-list`
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(-1)
  const suggestions = suggest(value, options)
  const expanded = open && suggestions.length > 0

  const choose = (name: string) => {
    onChange(name)
    setOpen(false)
    setActive(-1)
  }

  return (
    <div className="relative">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <MapPin
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 left-3.5 size-[18px] -translate-y-1/2 text-muted-foreground"
        />
        <Input
          id={id}
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={expanded}
          aria-controls={listId}
          aria-activedescendant={expanded && active >= 0 ? `${listId}-${active}` : undefined}
          autoComplete="off"
          maxLength={80}
          placeholder={placeholder}
          value={value}
          className="pl-10"
          onChange={(event) => {
            onChange(event.target.value)
            setOpen(true)
            setActive(-1)
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setOpen(false)}
          onKeyDown={(event) => {
            if (event.key === "ArrowDown") {
              event.preventDefault()
              setOpen(true)
              setActive((current) => Math.min(current + 1, suggestions.length - 1))
            } else if (event.key === "ArrowUp") {
              event.preventDefault()
              setActive((current) => Math.max(current - 1, -1))
            } else if (event.key === "Enter") {
              // Enter elige la sugerencia; nunca envía el formulario desde este campo.
              event.preventDefault()
              const option = expanded && active >= 0 ? suggestions[active] : undefined
              if (option) choose(option.name)
              else setOpen(false)
            } else if (event.key === "Escape" && expanded) {
              // Cierra la lista sin cerrar el panel.
              event.preventDefault()
              event.stopPropagation()
              setOpen(false)
            }
          }}
        />
      </div>
      {expanded ? (
        <ul
          id={listId}
          role="listbox"
          aria-label={suggestionsLabel}
          className="absolute inset-x-0 top-full z-10 mt-1 overflow-hidden rounded-sm border border-border bg-popover py-1 shadow-card"
        >
          {suggestions.map((option, index) => (
            <li
              key={option.id}
              id={`${listId}-${index}`}
              role="option"
              aria-selected={index === active}
              // mousedown: se elige antes de que el campo pierda el foco.
              onMouseDown={(event) => {
                event.preventDefault()
                choose(option.name)
              }}
              className={cn(
                "flex min-h-11 cursor-pointer items-center px-3.5 text-sm font-semibold",
                index === active && "bg-secondary",
              )}
            >
              {option.name}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}
