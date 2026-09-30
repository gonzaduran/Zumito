"use client"

import { Plus } from "lucide-react"
import { useId, useState } from "react"

import { Button } from "@/components/ui/button"
import { Chip } from "@/components/ui/chip"
import { Input } from "@/components/ui/input"
import type { Dictionary } from "@/i18n/get-dictionary"
import { findByName, normalizeName, type NamedOption } from "@/lib/suggestions"

type PeoplePickerProps = {
  labels: Pick<
    Dictionary["addExpense"],
    "peopleLabel" | "addPerson" | "newPersonLabel" | "newPersonPlaceholder" | "addPersonConfirm"
  >
  people: NamedOption[]
  selectedIds: string[]
  newNames: string[]
  onChange: (selectedIds: string[], newNames: string[]) => void
}

/** Con quién: chips de personas guardadas (por frecuencia) y alta rápida de nuevas. */
export function PeoplePicker({
  labels,
  people,
  selectedIds,
  newNames,
  onChange,
}: PeoplePickerProps) {
  const inputId = useId()
  const [adding, setAdding] = useState(false)
  const [name, setName] = useState("")

  const toggle = (id: string, pressed: boolean) =>
    onChange(pressed ? [...selectedIds, id] : selectedIds.filter((x) => x !== id), newNames)

  const add = () => {
    const trimmed = name.trim().slice(0, 40)
    if (!trimmed) return
    // Si ya existe, se marca la que hay en lugar de crear otra igual.
    const existing = findByName(people, trimmed)
    if (existing) {
      if (!selectedIds.includes(existing.id)) onChange([...selectedIds, existing.id], newNames)
    } else if (!newNames.some((n) => normalizeName(n) === normalizeName(trimmed))) {
      onChange(selectedIds, [...newNames, trimmed])
    }
    setName("")
  }

  return (
    <div role="group" aria-label={labels.peopleLabel}>
      <p className="mb-2 text-[13px] font-extrabold text-muted-foreground">{labels.peopleLabel}</p>
      <div className="flex flex-wrap gap-2">
        {people.map((person) => (
          <Chip
            key={person.id}
            pressed={selectedIds.includes(person.id)}
            onPressedChange={(pressed) => toggle(person.id, pressed)}
          >
            {person.name}
          </Chip>
        ))}
        {newNames.map((newName) => (
          <Chip
            key={`new-${newName}`}
            pressed
            onPressedChange={() =>
              onChange(
                selectedIds,
                newNames.filter((n) => n !== newName),
              )
            }
          >
            {newName}
          </Chip>
        ))}
        {!adding ? (
          <Chip pressed={false} onPressedChange={() => setAdding(true)}>
            <Plus aria-hidden="true" className="size-4" />
            {labels.addPerson}
          </Chip>
        ) : null}
      </div>
      {adding ? (
        <div className="mt-2 flex gap-2">
          <Input
            id={inputId}
            aria-label={labels.newPersonLabel}
            placeholder={labels.newPersonPlaceholder}
            autoComplete="off"
            autoFocus
            maxLength={40}
            value={name}
            onChange={(event) => setName(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault()
                add()
              }
            }}
            className="h-11"
          />
          <Button type="button" variant="secondary" size="sm" onClick={add}>
            {labels.addPersonConfirm}
          </Button>
        </div>
      ) : null}
    </div>
  )
}
