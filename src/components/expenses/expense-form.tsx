"use client"

import { cn } from "cn"
import { ChevronDown } from "lucide-react"
import { useEffect, useId, useState } from "react"

import { AccountPicker } from "@/components/accounts/account-picker"
import { useAccounts } from "@/components/accounts/accounts-provider"
import { useSocial } from "@/components/social/social-provider"
import { Button } from "@/components/ui/button"
import { Chip } from "@/components/ui/chip"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import type { Dictionary } from "@/i18n/get-dictionary"
import { interpolate } from "@/i18n/interpolate"
import {
  applyAmountKey,
  formatAmountInput,
  fromCents,
  keyFromKeyboard,
  toCents,
} from "@/lib/amount-input"
import type { Category } from "@/lib/data/categories"
import type { NamedOption } from "@/lib/suggestions"
import type { ExpenseInput, Mood } from "@/lib/validators/expense"

import { AmountKeypad } from "./amount-keypad"
import { CategoryPicker } from "./category-picker"
import { MoodPicker } from "./mood-picker"
import { PeoplePicker } from "./people-picker"
import { PlaceCombobox } from "./place-combobox"
import {
  computeShares,
  SplitWithFriends,
  type SplitShare,
  type SplitState,
} from "./split-with-friends"

export type ExpenseDraft = ExpenseInput & { id: string }

/** Gasto dividido con amigos: quién pagó y la parte de cada uno (tú incluido). */
export type ExpenseSplit = { payerId: string; shares: SplitShare[]; names: string }

/** Valores iniciales de un gasto nuevo (p. ej. desde /add?importe=…). */
export type ExpensePrefill = {
  categoryId?: string
  amountCents?: number
  description?: string
  place?: string
}

type ExpenseFormProps = {
  labels: Dictionary["addExpense"]
  submitLabel: string
  categories: Category[]
  places: NamedOption[]
  people: NamedOption[]
  /** Gasto a editar. Sin él, el formulario crea uno nuevo. */
  initial?: ExpenseDraft
  prefill?: ExpensePrefill
  defaultCategoryId: string
  onSubmit: (expense: ExpenseDraft, category: Category, split: ExpenseSplit | null) => void
  /** Se puede dividir con amigos (al crear; al editar no). */
  allowSplit?: boolean
  /** Gasto compartido que se edita: el importe no se cambia aquí. */
  shared?: { with: string }
  /** Acciones extra bajo el botón principal (p. ej. eliminar). */
  footer?: React.ReactNode
}

type DateChoice = "today" | "yesterday" | "other"

/** Fecha local "aaaa-mm-dd" (la del navegador, que es la del usuario). */
const toDateInputValue = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`

/** Hora local "hh:mm". */
const toTimeInputValue = (date: Date) =>
  `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`

const daysAgo = (days: number) => {
  const date = new Date()
  date.setDate(date.getDate() - days)
  return date
}

function initialDate(spentAt: Date | undefined): { choice: DateChoice; other: string } {
  const day = toDateInputValue(spentAt ?? new Date())
  if (day === toDateInputValue(new Date())) return { choice: "today", other: day }
  if (day === toDateInputValue(daysAgo(1))) return { choice: "yesterday", other: day }
  return { choice: "other", other: day }
}

/** Día elegido y, si se ha indicado, la hora; si no, la hora actual (u 12:00 en otro día). */
function resolveSpentAt(choice: DateChoice, otherDate: string, time: string): Date {
  const date =
    choice === "today"
      ? new Date()
      : choice === "yesterday"
        ? daysAgo(1)
        : // Mediodía, para que la zona horaria no lo mueva de día.
          new Date(`${otherDate}T12:00:00`)
  const [hours, minutes] = time.split(":").map(Number)
  if (time && hours !== undefined && minutes !== undefined) date.setHours(hours, minutes, 0, 0)
  return date
}

export function ExpenseForm({
  labels,
  submitLabel,
  categories,
  places,
  people,
  initial,
  prefill,
  defaultCategoryId,
  onSubmit,
  allowSplit = false,
  shared,
  footer,
}: ExpenseFormProps) {
  const detailsId = useId()
  const [startDate] = useState(() => initialDate(initial?.spentAt))
  const [startTime] = useState(() => (initial ? toTimeInputValue(initial.spentAt) : ""))
  const [amount, setAmount] = useState(() => {
    const cents = initial?.amountCents ?? prefill?.amountCents
    return cents ? fromCents(cents) : ""
  })
  const [categoryId, setCategoryId] = useState(
    initial?.categoryId ?? prefill?.categoryId ?? defaultCategoryId,
  )
  const { accounts, lastUsedAccountId, setLastUsedAccountId } = useAccounts()
  const [accountId, setAccountId] = useState(
    initial?.accountId ?? accounts.find((a) => a.id === lastUsedAccountId)?.id ?? accounts[0]?.id,
  )
  const [description, setDescription] = useState(initial?.description ?? prefill?.description ?? "")
  const [dateChoice, setDateChoice] = useState<DateChoice>(startDate.choice)
  const [otherDate, setOtherDate] = useState(startDate.other)
  const [time, setTime] = useState(startTime)
  const [place, setPlace] = useState(initial?.place ?? prefill?.place ?? "")
  const [personIds, setPersonIds] = useState<string[]>(initial?.personIds ?? [])
  const [newPeople, setNewPeople] = useState<string[]>([])
  const [note, setNote] = useState(initial?.note ?? "")
  const [mood, setMood] = useState<Mood | undefined>(initial?.mood)
  const { me, friends } = useSocial()
  const [splitOpen, setSplitOpen] = useState(false)
  const [split, setSplit] = useState<SplitState>({
    friendIds: [],
    mode: "equal",
    payerId: me?.id ?? "",
    custom: {},
  })

  const detailsFilled = [
    place.trim(),
    personIds.length + newPeople.length > 0,
    note.trim(),
    mood,
    time !== startTime,
  ].filter(Boolean).length
  const [detailsOpen, setDetailsOpen] = useState(detailsFilled > 0)

  const amountCents = toCents(amount)
  const splitting = allowSplit && splitOpen && me !== null && split.friendIds.length > 0
  const shares = splitting && me ? computeShares(split, me.id, amountCents) : []
  const sharesValid =
    !splitting ||
    (shares.every((share) => share.shareCents > 0) &&
      shares.reduce((sum, share) => sum + share.shareCents, 0) === amountCents)
  const canSave = amountCents > 0 && (dateChoice !== "other" || Boolean(otherDate)) && sharesValid

  const submit = () => {
    const category = categories.find((c) => c.id === categoryId)
    if (!canSave || !category) return
    // Al editar sin tocar día ni hora, se conserva el momento original.
    const momentUnchanged =
      initial &&
      dateChoice === startDate.choice &&
      otherDate === startDate.other &&
      time === startTime
    onSubmit(
      {
        id: initial?.id ?? crypto.randomUUID(),
        categoryId,
        accountId,
        amountCents,
        description: description.trim() || undefined,
        note: note.trim() || undefined,
        spentAt: momentUnchanged ? initial.spentAt : resolveSpentAt(dateChoice, otherDate, time),
        place: place.trim() || undefined,
        mood,
        personIds,
        newPeople,
      },
      category,
      splitting
        ? {
            payerId: split.payerId,
            shares,
            names: friends
              .filter((friend) => split.friendIds.includes(friend.id))
              .map((friend) => friend.name)
              .join(", "),
          }
        : null,
    )
    if (!initial && accountId) setLastUsedAccountId(accountId)
  }

  // Teclado físico: números, coma o punto, borrar y Enter para guardar.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const { target } = event
      if (target instanceof Element && target.closest("input, textarea, select, [aria-expanded]")) {
        return
      }
      if (event.key === "Enter") {
        event.preventDefault()
        document.getElementById("submit-expense")?.click()
        return
      }
      const key = keyFromKeyboard(event.key)
      if (key && !shared && !event.metaKey && !event.ctrlKey && !event.altKey) {
        event.preventDefault()
        setAmount((current) => applyAmountKey(current, key))
      }
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [shared])

  return (
    <form
      className="flex flex-col gap-4 px-5"
      onSubmit={(event) => {
        event.preventDefault()
        submit()
      }}
    >
      <output
        aria-live="polite"
        aria-label={labels.amountLabel}
        className="flex items-baseline justify-center gap-1.5 py-1"
      >
        <span
          className={cn(
            "num text-[52px] leading-none font-extrabold tracking-[-0.02em]",
            !amount && "text-muted-foreground",
          )}
        >
          {formatAmountInput(amount)}
        </span>
        <span className="num text-2xl font-bold text-muted-foreground">€</span>
      </output>

      <CategoryPicker
        label={labels.categoryLabel}
        categories={categories}
        value={categoryId}
        onChange={setCategoryId}
      />

      <AccountPicker
        label={labels.accountLabel}
        accounts={accounts}
        value={accountId}
        onChange={setAccountId}
      />

      <Input
        aria-label={labels.descriptionLabel}
        placeholder={labels.descriptionPlaceholder}
        maxLength={80}
        enterKeyHint="done"
        value={description}
        onChange={(event) => setDescription(event.target.value)}
      />

      <div role="group" aria-label={labels.dateLabel} className="flex items-center gap-2">
        <Chip pressed={dateChoice === "today"} onPressedChange={() => setDateChoice("today")}>
          {labels.today}
        </Chip>
        <Chip
          pressed={dateChoice === "yesterday"}
          onPressedChange={() => setDateChoice("yesterday")}
        >
          {labels.yesterday}
        </Chip>
        {dateChoice === "other" ? (
          <Input
            type="date"
            aria-label={labels.otherDate}
            value={otherDate}
            max={toDateInputValue(new Date())}
            onChange={(event) => setOtherDate(event.target.value)}
            className="h-11 min-w-0 flex-1 rounded-full border-2 border-primary-text px-4 text-[13px] font-bold"
          />
        ) : (
          <Chip pressed={false} onPressedChange={() => setDateChoice("other")}>
            {labels.otherDate}
          </Chip>
        )}
      </div>

      {shared ? (
        <p className="rounded-md bg-secondary px-4 py-3 text-[13px] font-semibold">{shared.with}</p>
      ) : (
        <AmountKeypad
          labels={labels.keypad}
          onKey={(key) => setAmount((current) => applyAmountKey(current, key))}
        />
      )}

      {allowSplit && me ? (
        <div>
          <button
            type="button"
            aria-expanded={splitOpen}
            aria-controls={`${detailsId}-split`}
            onClick={() => setSplitOpen((open) => !open)}
            className="flex h-11 w-full items-center justify-between rounded-sm px-1 text-sm font-bold outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <span>
              {labels.splitToggle}
              {split.friendIds.length > 0 ? (
                <span className="ml-2 font-semibold text-muted-foreground">
                  {friends
                    .filter((friend) => split.friendIds.includes(friend.id))
                    .map((friend) => friend.name)
                    .join(", ")}
                </span>
              ) : null}
            </span>
            <ChevronDown
              aria-hidden="true"
              className={cn(
                "size-5 text-muted-foreground transition-transform motion-reduce:transition-none",
                splitOpen && "rotate-180",
              )}
            />
          </button>
          {splitOpen ? (
            <div id={`${detailsId}-split`} className="pt-2">
              <SplitWithFriends
                labels={labels}
                me={me}
                friends={friends}
                totalCents={amountCents}
                value={split}
                onChange={setSplit}
              />
            </div>
          ) : null}
        </div>
      ) : null}

      <div>
        <button
          type="button"
          aria-expanded={detailsOpen}
          aria-controls={detailsId}
          onClick={() => setDetailsOpen((open) => !open)}
          className="flex h-11 w-full items-center justify-between rounded-sm px-1 text-sm font-bold outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <span>
            {labels.moreDetails}
            {detailsFilled > 0 ? (
              <span className="ml-2 font-semibold text-muted-foreground">
                {detailsFilled === 1
                  ? labels.detailsCountOne
                  : interpolate(labels.detailsCount, { count: detailsFilled })}
              </span>
            ) : null}
          </span>
          <ChevronDown
            aria-hidden="true"
            className={cn(
              "size-5 text-muted-foreground transition-transform motion-reduce:transition-none",
              detailsOpen && "rotate-180",
            )}
          />
        </button>
        {detailsOpen ? (
          <div id={detailsId} className="flex flex-col gap-4 pt-2">
            <PlaceCombobox
              label={labels.placeLabel}
              placeholder={labels.placePlaceholder}
              suggestionsLabel={labels.placeSuggestions}
              value={place}
              onChange={setPlace}
              options={places}
            />
            <PeoplePicker
              labels={labels}
              people={people}
              selectedIds={personIds}
              newNames={newPeople}
              onChange={(ids, names) => {
                setPersonIds(ids)
                setNewPeople(names)
              }}
            />
            <div>
              <Label htmlFor={`${detailsId}-time`}>{labels.timeLabel}</Label>
              <Input
                id={`${detailsId}-time`}
                type="time"
                value={time}
                onChange={(event) => setTime(event.target.value)}
                className="h-11 w-36"
              />
            </div>
            <div>
              <Label htmlFor={`${detailsId}-note`}>{labels.noteLabel}</Label>
              <Textarea
                id={`${detailsId}-note`}
                maxLength={500}
                rows={2}
                placeholder={labels.notePlaceholder}
                value={note}
                onChange={(event) => setNote(event.target.value)}
              />
            </div>
            <MoodPicker
              label={labels.moodLabel}
              names={labels.moods}
              value={mood}
              onChange={setMood}
            />
          </div>
        ) : null}
      </div>

      <Button id="submit-expense" type="submit" size="lg" disabled={!canSave}>
        {submitLabel}
      </Button>
      {footer}
    </form>
  )
}
