"use client"

import { useState, useTransition } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { Dictionary } from "@/i18n/get-dictionary"
import { updateUsername } from "@/lib/actions/social"

type UsernameFormProps = {
  labels: Pick<
    Dictionary["settings"],
    | "usernameLabel"
    | "usernameHint"
    | "usernamePlaceholder"
    | "usernameSave"
    | "usernameSaved"
    | "usernameTaken"
    | "usernameFailed"
  >
  invalidLabel: string
  initial: string | null
}

/** Elegir el @usuario con el que te encuentran tus amigos. */
export function UsernameForm({ labels, invalidLabel, initial }: UsernameFormProps) {
  const [value, setValue] = useState(initial ?? "")
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const changed = value.trim().replace(/^@/, "").toLowerCase() !== (initial ?? "")

  return (
    <form
      className="flex flex-col gap-2"
      onSubmit={(event) => {
        event.preventDefault()
        startTransition(async () => {
          const result = await updateUsername(value).catch(
            () => ({ ok: false, error: "failed" }) as const,
          )
          if (result.ok) {
            setError(null)
            toast.success(labels.usernameSaved)
            return
          }
          setError(
            result.error === "taken"
              ? labels.usernameTaken
              : result.error === "usernameInvalid"
                ? invalidLabel
                : labels.usernameFailed,
          )
        })
      }}
    >
      <Label htmlFor="username" className="mb-0">
        {labels.usernameLabel}
      </Label>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <span
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 font-bold text-muted-foreground"
          >
            @
          </span>
          <Input
            id="username"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            autoComplete="username"
            maxLength={21}
            placeholder={labels.usernamePlaceholder}
            value={value}
            onChange={(event) => {
              setValue(event.target.value.toLowerCase())
              setError(null)
            }}
            className="pl-9"
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? "username-error" : "username-hint"}
          />
        </div>
        <Button type="submit" variant="secondary" disabled={!changed || pending}>
          {labels.usernameSave}
        </Button>
      </div>
      {error ? (
        <p id="username-error" role="alert" className="text-sm font-semibold text-destructive">
          {error}
        </p>
      ) : (
        <p id="username-hint" className="text-xs text-muted-foreground">
          {labels.usernameHint}
        </p>
      )}
    </form>
  )
}
