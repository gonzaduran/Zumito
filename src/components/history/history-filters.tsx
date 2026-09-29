"use client"

import { Search } from "lucide-react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useEffect, useState, useTransition } from "react"

import { Chip } from "@/components/ui/chip"
import { Input } from "@/components/ui/input"
import type { Dictionary } from "@/i18n/get-dictionary"
import type { Category } from "@/lib/data/categories"

type HistoryFiltersProps = {
  labels: Dictionary["history"]
  categories: Category[]
}

const SEARCH_DELAY_MS = 300

/** Buscador y filtro por categoría. El estado vive en la URL (?q=…&c=…). */
export function HistoryFilters({ labels, categories }: HistoryFiltersProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [, startTransition] = useTransition()
  const [query, setQuery] = useState(searchParams.get("q") ?? "")
  const categoryId = searchParams.get("c") ?? ""

  const navigate = (changes: Record<string, string>) => {
    const params = new URLSearchParams(searchParams)
    for (const [key, value] of Object.entries(changes)) {
      if (value) params.set(key, value)
      else params.delete(key)
    }
    params.delete("n") // Al cambiar el filtro se vuelve a la primera página.
    const search = params.toString()
    startTransition(() => router.replace(search ? `${pathname}?${search}` : pathname))
  }

  // Busca mientras escribes, sin lanzar una consulta por cada tecla.
  useEffect(() => {
    if (query === (searchParams.get("q") ?? "")) return
    const timeout = setTimeout(() => navigate({ q: query.trim() }), SEARCH_DELAY_MS)
    return () => clearTimeout(timeout)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- solo reacciona al texto
  }, [query])

  return (
    <div className="flex flex-col gap-3">
      <div className="relative">
        <Search
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 left-4 size-[18px] -translate-y-1/2 text-muted-foreground"
        />
        <Input
          type="search"
          aria-label={labels.searchLabel}
          placeholder={labels.searchPlaceholder}
          enterKeyHint="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          className="rounded-full pl-11"
        />
      </div>
      <div
        role="group"
        aria-label={labels.filtersLabel}
        className="-mx-6 flex [scrollbar-width:none] gap-2 overflow-x-auto px-6 pb-1"
      >
        <Chip pressed={!categoryId} onPressedChange={() => navigate({ c: "" })}>
          {labels.allCategories}
        </Chip>
        {categories.map((category) => (
          <Chip
            key={category.id}
            pressed={category.id === categoryId}
            onPressedChange={(pressed) => navigate({ c: pressed ? category.id : "" })}
          >
            <span aria-hidden="true" className="text-base">
              {category.emoji}
            </span>
            {category.name}
          </Chip>
        ))}
      </div>
    </div>
  )
}
