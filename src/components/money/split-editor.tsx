"use client"

import { cn } from "cn"
import { Plus, Trash2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Chip } from "@/components/ui/chip"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { Dictionary } from "@/i18n/get-dictionary"
import { formatCents } from "@/i18n/format"
import { interpolate } from "@/i18n/interpolate"
import { saveSplit } from "@/lib/actions/split"
import type { Category } from "@/lib/data/categories"
import { haptics } from "@/lib/haptics"
import { MAX_SPLIT_BUCKETS } from "@/lib/validators/split"

export type SplitDraft = {
  key: string
  name: string
  emoji: string
  percent: string
  categoryIds: string[]
}

type SplitEditorProps = {
  labels: Dictionary["split"]
  validation: Dictionary["validation"]
  recurringId: string
  /** Importe del ingreso programado, en céntimos. */
  amountCents: number
  categories: Category[]
  initial: SplitDraft[]
}

const newKey = () => crypto.randomUUID()
const percentOf = (draft: SplitDraft) => Number.parseInt(draft.percent, 10) || 0

/** Partes de la nómina con su porcentaje y las categorías que cuentan en cada una. */
export function SplitEditor({
  labels,
  validation,
  recurringId,
  amountCents,
  categories,
  initial,
}: SplitEditorProps) {
  const router = useRouter()
  const [buckets, setBuckets] = useState<SplitDraft[]>(initial)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const total = buckets.reduce((sum, bucket) => sum + percentOf(bucket), 0)
  const over = total > 100
  const amountFor = (percent: number) => formatCents(Math.round((amountCents * percent) / 100))

  const update = (key: string, changes: Partial<SplitDraft>) => {
    setError(null)
    setBuckets((current) =>
      current.map((bucket) => (bucket.key === key ? { ...bucket, ...changes } : bucket)),
    )
  }
  // Tocar una categoría la pone en esta parte (y la quita de la que la tuviera).
  const toggleCategory = (key: string, categoryId: string) => {
    setError(null)
    setBuckets((current) =>
      current.map((bucket) => {
        const has = bucket.categoryIds.includes(categoryId)
        if (bucket.key === key) {
          return {
            ...bucket,
            categoryIds: has
              ? bucket.categoryIds.filter((id) => id !== categoryId)
              : [...bucket.categoryIds, categoryId],
          }
        }
        return has
          ? { ...bucket, categoryIds: bucket.categoryIds.filter((id) => id !== categoryId) }
          : bucket
      }),
    )
  }

  const save = (next: SplitDraft[], success: string) =>
    startTransition(async () => {
      const result = await saveSplit(
        recurringId,
        next.map((bucket) => ({
          name: bucket.name,
          emoji: bucket.emoji,
          percent: percentOf(bucket),
          categoryIds: bucket.categoryIds,
        })),
      ).catch(() => ({ ok: false, error: "failed" }) as const)
      if (result.ok) {
        haptics.success()
        toast.success(success)
        router.push("/ajustes/dinero")
        return
      }
      haptics.error()
      setError(
        result.error === "failed"
          ? labels.failed
          : result.error === "premium"
            ? labels.premium
            : validation[result.error],
      )
    })

  return (
    <div className="flex flex-col gap-5">
      <div>
        <p className="mb-2 text-[13px] font-extrabold text-muted-foreground">
          {labels.templatesLabel}
        </p>
        <div role="group" aria-label={labels.templatesLabel} className="flex flex-wrap gap-2">
          {labels.templates.map((template) => (
            <Chip
              key={template.label}
              pressed={false}
              onPressedChange={() => {
                setError(null)
                setBuckets(
                  template.buckets.map((bucket) => ({
                    key: newKey(),
                    name: bucket.name,
                    emoji: bucket.emoji,
                    percent: String(bucket.percent),
                    categoryIds: [],
                  })),
                )
              }}
            >
              {template.label}
            </Chip>
          ))}
        </div>
      </div>

      {buckets.map((bucket, index) => {
        const id = `bucket-${bucket.key}`
        return (
          <Card key={bucket.key} className="flex flex-col gap-3">
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-extrabold">
                {interpolate(labels.bucketLabel, { number: String(index + 1) })}
              </h2>
              <Button
                variant="ghost"
                size="icon"
                aria-label={interpolate(labels.removeBucket, { name: bucket.name || "" })}
                onClick={() => setBuckets((current) => current.filter((b) => b.key !== bucket.key))}
              >
                <Trash2 aria-hidden="true" className="size-5" />
              </Button>
            </div>
            <div className="flex gap-3">
              <div className="w-16">
                <Label htmlFor={`${id}-emoji`}>{labels.emojiLabel}</Label>
                <Input
                  id={`${id}-emoji`}
                  value={bucket.emoji}
                  maxLength={16}
                  onChange={(event) => update(bucket.key, { emoji: event.target.value })}
                  className="px-0 text-center text-xl"
                />
              </div>
              <div className="min-w-0 flex-1">
                <Label htmlFor={`${id}-name`}>{labels.nameLabel}</Label>
                <Input
                  id={`${id}-name`}
                  value={bucket.name}
                  maxLength={30}
                  onChange={(event) => update(bucket.key, { name: event.target.value })}
                />
              </div>
              <div className="w-24">
                <Label htmlFor={`${id}-percent`}>{labels.percentLabel}</Label>
                <div className="relative">
                  <Input
                    id={`${id}-percent`}
                    inputMode="numeric"
                    value={bucket.percent}
                    maxLength={3}
                    onChange={(event) =>
                      update(bucket.key, { percent: event.target.value.replace(/\D/g, "") })
                    }
                    aria-describedby={`${id}-amount`}
                    className="pr-8 text-right num font-bold"
                  />
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-sm font-bold text-muted-foreground"
                  >
                    %
                  </span>
                </div>
              </div>
            </div>
            <p id={`${id}-amount`} className="num text-sm font-bold text-primary-text">
              {interpolate(labels.amountPerMonth, { amount: amountFor(percentOf(bucket)) })}
            </p>
            <div>
              <p
                id={`${id}-categories`}
                className="mb-1 text-[13px] font-extrabold text-muted-foreground"
              >
                {labels.categoriesLabel}
              </p>
              <div
                role="group"
                aria-labelledby={`${id}-categories`}
                className="flex flex-wrap gap-2"
              >
                {categories.map((category) => (
                  <Chip
                    key={category.id}
                    pressed={bucket.categoryIds.includes(category.id)}
                    onPressedChange={() => toggleCategory(bucket.key, category.id)}
                  >
                    <span aria-hidden="true" className="text-base">
                      {category.emoji}
                    </span>
                    {category.name}
                  </Chip>
                ))}
              </div>
            </div>
          </Card>
        )
      })}

      {buckets.length < MAX_SPLIT_BUCKETS ? (
        <Button
          variant="secondary"
          onClick={() =>
            setBuckets((current) => [
              ...current,
              {
                key: newKey(),
                name: labels.newBucketName,
                emoji: "✨",
                percent: String(Math.max(0, 100 - total)),
                categoryIds: [],
              },
            ])
          }
        >
          <Plus aria-hidden="true" />
          {labels.addBucket}
        </Button>
      ) : null}

      <p className="text-xs text-muted-foreground">{labels.categoriesHint}</p>

      <div
        aria-live="polite"
        className={cn(
          "flex items-center justify-between rounded-md bg-secondary px-4 py-3 text-sm font-bold",
          over && "text-destructive-text",
        )}
      >
        <span className="num">{interpolate(labels.total, { percent: String(total) })}</span>
        <span className="num">
          {over
            ? validation.splitOver
            : interpolate(labels.unassigned, { amount: amountFor(100 - total) })}
        </span>
      </div>

      {error ? (
        <p role="alert" className="text-sm font-semibold text-destructive">
          {error}
        </p>
      ) : null}

      <Button size="lg" disabled={pending || over} onClick={() => save(buckets, labels.saved)}>
        {pending ? labels.saving : labels.save}
      </Button>
      {initial.length > 0 ? (
        <Button variant="destructive" disabled={pending} onClick={() => save([], labels.cleared)}>
          {labels.clear}
        </Button>
      ) : null}
    </div>
  )
}
