"use client"

import { Chip } from "@/components/ui/chip"
import type { Category } from "@/lib/data/categories"
import { haptics } from "@/lib/haptics"

type CategoryPickerProps = {
  label: string
  categories: Category[]
  value: string
  onChange: (id: string) => void
}

/** Fila deslizable de categorías con su emoji. Siempre hay una elegida. */
export function CategoryPicker({ label, categories, value, onChange }: CategoryPickerProps) {
  return (
    <div
      role="group"
      aria-label={label}
      className="-mx-5 flex [scrollbar-width:none] gap-2 overflow-x-auto px-5 pb-1"
    >
      {categories.map((category) => (
        <Chip
          key={category.id}
          pressed={category.id === value}
          onPressedChange={() => {
            haptics.tap()
            onChange(category.id)
          }}
        >
          <span aria-hidden="true" className="text-base">
            {category.emoji}
          </span>
          {category.name}
        </Chip>
      ))}
    </div>
  )
}
