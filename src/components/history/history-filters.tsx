"use client"

import { ChevronDown, Euro, MapPin, Search, Users } from "lucide-react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useEffect, useState, useTransition } from "react"

import { AccountFilter } from "@/components/accounts/account-filter"
import { Button } from "@/components/ui/button"
import { Chip } from "@/components/ui/chip"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import type { Dictionary } from "@/i18n/get-dictionary"
import type { Category } from "@/lib/data/categories"
import type { NamedOption } from "@/lib/suggestions"

type HistoryFiltersProps = {
  labels: Dictionary["history"]
  closeLabel: string
  categories: Category[]
  places: NamedOption[]
  people: NamedOption[]
  /** Texto del filtro de importe activo, ya formateado ("de 5,00 € a 10,00 €"). */
  amountLabel: string | null
}

type Panel = "place" | "person" | "amount" | null

const SEARCH_DELAY_MS = 300

/**
 * Buscador, categoría y filtros por lugar, persona e importe.
 * El estado vive en la URL: ?q= &a= (cuenta) &c= &l= (lugar) &p= (persona) &min= &max=.
 */
export function HistoryFilters({
  labels,
  closeLabel,
  categories,
  places,
  people,
  amountLabel,
}: HistoryFiltersProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [, startTransition] = useTransition()
  const [query, setQuery] = useState(searchParams.get("q") ?? "")
  const [panel, setPanel] = useState<Panel>(null)
  const [min, setMin] = useState(searchParams.get("min") ?? "")
  const [max, setMax] = useState(searchParams.get("max") ?? "")
  const categoryId = searchParams.get("c") ?? ""
  const placeId = searchParams.get("l") ?? ""
  const personId = searchParams.get("p") ?? ""
  const place = places.find((option) => option.id === placeId)
  const person = people.find((option) => option.id === personId)

  const navigate = (changes: Record<string, string>) => {
    const params = new URLSearchParams(searchParams)
    for (const [key, value] of Object.entries(changes)) {
      if (value) params.set(key, value)
      else params.delete(key)
    }
    params.delete("n") // Al cambiar el filtro se vuelve a la primera página.
    const search = params.toString()
    setPanel(null)
    startTransition(() => router.replace(search ? `${pathname}?${search}` : pathname))
  }

  // Busca mientras escribes, sin lanzar una consulta por cada tecla.
  useEffect(() => {
    if (query === (searchParams.get("q") ?? "")) return
    const timeout = setTimeout(() => navigate({ q: query.trim() }), SEARCH_DELAY_MS)
    return () => clearTimeout(timeout)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- solo reacciona al texto
  }, [query])

  const options = panel === "place" ? places : people
  const selectedId = panel === "place" ? placeId : personId
  const paramKey = panel === "place" ? "l" : "p"

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

      <AccountFilter label={labels.accountFilter} allLabel={labels.allAccounts} />

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

      <div
        role="group"
        aria-label={labels.moreFiltersLabel}
        className="-mx-6 flex [scrollbar-width:none] gap-2 overflow-x-auto px-6 pb-1"
      >
        <Chip pressed={Boolean(place)} onPressedChange={() => setPanel("place")}>
          <MapPin aria-hidden="true" className="size-4" />
          {place?.name ?? labels.placeFilter}
          <ChevronDown aria-hidden="true" className="size-4" />
        </Chip>
        <Chip pressed={Boolean(person)} onPressedChange={() => setPanel("person")}>
          <Users aria-hidden="true" className="size-4" />
          {person?.name ?? labels.personFilter}
          <ChevronDown aria-hidden="true" className="size-4" />
        </Chip>
        <Chip pressed={Boolean(amountLabel)} onPressedChange={() => setPanel("amount")}>
          <Euro aria-hidden="true" className="size-4" />
          {amountLabel ?? labels.amountFilter}
          <ChevronDown aria-hidden="true" className="size-4" />
        </Chip>
      </div>

      <Sheet open={panel !== null} onOpenChange={(open) => !open && setPanel(null)}>
        <SheetContent closeLabel={closeLabel}>
          <SheetHeader>
            <SheetTitle>
              {panel === "place"
                ? labels.placeFilter
                : panel === "person"
                  ? labels.personFilter
                  : labels.amountFilter}
            </SheetTitle>
          </SheetHeader>
          {panel === "place" || panel === "person" ? (
            <div className="flex flex-col gap-4 px-5">
              {options.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  {panel === "place" ? labels.noPlaces : labels.noPeople}
                </p>
              ) : (
                <div
                  role="group"
                  aria-label={panel === "place" ? labels.placeFilter : labels.personFilter}
                  className="flex flex-wrap gap-2"
                >
                  {options.map((option) => (
                    <Chip
                      key={option.id}
                      pressed={option.id === selectedId}
                      onPressedChange={(pressed) =>
                        navigate({ [paramKey]: pressed ? option.id : "" })
                      }
                    >
                      {option.name}
                    </Chip>
                  ))}
                </div>
              )}
              {selectedId ? (
                <Button variant="secondary" onClick={() => navigate({ [paramKey]: "" })}>
                  {labels.clearFilter}
                </Button>
              ) : null}
            </div>
          ) : panel === "amount" ? (
            <form
              className="flex flex-col gap-4 px-5"
              onSubmit={(event) => {
                event.preventDefault()
                navigate({ min: min.trim(), max: max.trim() })
              }}
            >
              <div className="flex gap-3">
                {(
                  [
                    ["min", labels.amountFrom, min, setMin],
                    ["max", labels.amountTo, max, setMax],
                  ] as const
                ).map(([key, label, value, setValue]) => (
                  <div key={key} className="flex-1">
                    <Label htmlFor={`amount-${key}`}>{label}</Label>
                    <div className="relative">
                      <Input
                        id={`amount-${key}`}
                        inputMode="decimal"
                        autoComplete="off"
                        value={value}
                        onChange={(event) => setValue(event.target.value)}
                        className="pr-8 text-right num font-bold"
                      />
                      <span
                        aria-hidden="true"
                        className="pointer-events-none absolute top-1/2 right-3.5 -translate-y-1/2 text-sm font-bold text-muted-foreground"
                      >
                        €
                      </span>
                    </div>
                  </div>
                ))}
              </div>
              <Button type="submit">{labels.applyFilter}</Button>
              {amountLabel ? (
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    setMin("")
                    setMax("")
                    navigate({ min: "", max: "" })
                  }}
                >
                  {labels.clearFilter}
                </Button>
              ) : null}
            </form>
          ) : null}
        </SheetContent>
      </Sheet>
    </div>
  )
}
