"use client"

import { Archive, Lock, Pencil } from "lucide-react"
import Link from "next/link"
import { useState, useTransition } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { EmojiPicker } from "@/components/ui/emoji-picker"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { Dictionary } from "@/i18n/get-dictionary"
import { interpolate } from "@/i18n/interpolate"
import {
  createAccount,
  setAccountArchived,
  updateAccount,
  type AccountActionResult,
} from "@/lib/actions/accounts"
import type { ManagedAccount } from "@/lib/data/accounts"
import { haptics } from "@/lib/haptics"

type AccountManagerProps = {
  labels: Dictionary["accounts"]
  emojiLabels: Dictionary["emojiPicker"]
  validation: Dictionary["validation"]
  accounts: ManagedAccount[]
  /** ¿Cabe otra cuenta activa? (Gratis 1, Premium más). */
  canAdd: boolean
}

/** Formulario de nombre y emoji (crear o editar una cuenta). */
function AccountFields({
  idPrefix,
  labels,
  emojiLabels,
  initial,
  pending,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  idPrefix: string
  labels: Dictionary["accounts"]
  emojiLabels: Dictionary["emojiPicker"]
  initial: { name: string; emoji: string }
  pending: boolean
  submitLabel: string
  onSubmit: (value: { name: string; emoji: string }, reset: () => void) => void
  onCancel?: () => void
}) {
  const [name, setName] = useState(initial.name)
  const [emoji, setEmoji] = useState(initial.emoji)
  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(event) => {
        event.preventDefault()
        onSubmit({ name, emoji }, () => {
          setName(initial.name)
          setEmoji(initial.emoji)
        })
      }}
    >
      <div>
        <Label htmlFor={`${idPrefix}-name`}>{labels.nameLabel}</Label>
        <Input
          id={`${idPrefix}-name`}
          value={name}
          maxLength={30}
          placeholder={labels.namePlaceholder}
          onChange={(event) => setName(event.target.value)}
        />
      </div>
      <div>
        <p className="mb-2 text-[13px] font-extrabold text-muted-foreground">{labels.emojiLabel}</p>
        <EmojiPicker
          labels={emojiLabels}
          inputLabel={labels.emojiLabel}
          inputId={`${idPrefix}-emoji`}
          value={emoji}
          onChange={setEmoji}
          name={name}
        />
      </div>
      <div className="flex gap-2">
        <Button type="submit" disabled={pending} className="flex-1">
          {submitLabel}
        </Button>
        {onCancel ? (
          <Button type="button" variant="secondary" onClick={onCancel}>
            {labels.cancel}
          </Button>
        ) : null}
      </div>
    </form>
  )
}

/** Crear, renombrar, archivar y restaurar cuentas. */
export function AccountManager({
  labels,
  emojiLabels,
  validation,
  accounts,
  canAdd,
}: AccountManagerProps) {
  const [pending, startTransition] = useTransition()
  const [editingId, setEditingId] = useState<string | null>(null)
  const active = accounts.filter((account) => !account.archived)
  const archived = accounts.filter((account) => account.archived)

  const run = (
    action: () => Promise<AccountActionResult>,
    success: string,
    onSuccess?: () => void,
  ) =>
    startTransition(async () => {
      const result = await action().catch(() => ({ ok: false, error: "failed" }) as const)
      if (result.ok) {
        haptics.success()
        toast.success(success)
        onSuccess?.()
        return
      }
      haptics.error()
      const { error } = result
      toast.error(
        error === "duplicate" ||
          error === "premium" ||
          error === "lastAccount" ||
          error === "failed"
          ? labels.errors[error]
          : validation[error],
      )
    })

  return (
    <div className="flex flex-col gap-7">
      <section aria-labelledby="accounts-active" className="flex flex-col gap-2">
        <h2 id="accounts-active" className="text-[15px] font-extrabold">
          {labels.active}
        </h2>
        <Card className="p-0">
          <ul>
            {active.map((account, index) => (
              <li key={account.id} className="border-b border-border px-4 py-3 last:border-b-0">
                {editingId === account.id ? (
                  <AccountFields
                    idPrefix={`edit-${account.id}`}
                    labels={labels}
                    emojiLabels={emojiLabels}
                    initial={account}
                    pending={pending}
                    submitLabel={labels.save}
                    onCancel={() => setEditingId(null)}
                    onSubmit={(value) =>
                      run(
                        () => updateAccount(account.id, value),
                        labels.saved,
                        () => setEditingId(null),
                      )
                    }
                  />
                ) : (
                  <div className="flex items-center gap-3">
                    <span
                      aria-hidden="true"
                      className="flex size-10 shrink-0 items-center justify-center rounded-full bg-secondary text-lg"
                    >
                      {account.emoji}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-bold">{account.name}</p>
                      {index === 0 ? (
                        <p className="text-[13px] text-muted-foreground">{labels.main}</p>
                      ) : null}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={interpolate(labels.edit, { name: account.name })}
                      onClick={() => setEditingId(account.id)}
                    >
                      <Pencil aria-hidden="true" className="size-5" />
                    </Button>
                    {active.length > 1 ? (
                      <Button
                        variant="ghost"
                        size="icon"
                        disabled={pending}
                        aria-label={interpolate(labels.archive, { name: account.name })}
                        onClick={() =>
                          run(() => setAccountArchived(account.id, true), labels.archived)
                        }
                      >
                        <Archive aria-hidden="true" className="size-5" />
                      </Button>
                    ) : null}
                  </div>
                )}
              </li>
            ))}
          </ul>
        </Card>
      </section>

      <section aria-labelledby="accounts-add" className="flex flex-col gap-2">
        <h2 id="accounts-add" className="text-[15px] font-extrabold">
          {labels.addTitle}
        </h2>
        {canAdd ? (
          <Card>
            <AccountFields
              idPrefix="new-account"
              labels={labels}
              emojiLabels={emojiLabels}
              initial={{ name: "", emoji: "👨‍👩‍👦" }}
              pending={pending}
              submitLabel={labels.add}
              onSubmit={(value, reset) => run(() => createAccount(value), labels.saved, reset)}
            />
          </Card>
        ) : (
          <Link
            href="/planes"
            className="flex min-h-11 items-center gap-2 text-sm font-bold text-primary-text outline-none focus-visible:rounded-md focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <Lock aria-hidden="true" className="size-4" />
            {labels.locked}
          </Link>
        )}
      </section>

      {archived.length > 0 ? (
        <section aria-labelledby="accounts-archived" className="flex flex-col gap-2">
          <h2 id="accounts-archived" className="text-[15px] font-extrabold">
            {labels.archivedTitle}
          </h2>
          <Card className="p-0">
            <ul>
              {archived.map((account) => (
                <li
                  key={account.id}
                  className="flex items-center gap-3 border-b border-border px-4 py-2 last:border-b-0"
                >
                  <span aria-hidden="true" className="text-lg">
                    {account.emoji}
                  </span>
                  <p className="min-w-0 flex-1 truncate font-bold text-muted-foreground">
                    {account.name}
                  </p>
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={pending}
                    onClick={() =>
                      run(() => setAccountArchived(account.id, false), labels.restored)
                    }
                  >
                    {labels.restore}
                  </Button>
                </li>
              ))}
            </ul>
          </Card>
        </section>
      ) : null}
    </div>
  )
}
