"use client"

import { useState, useTransition } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { Dictionary } from "@/i18n/get-dictionary"
import { updateDisplayName } from "@/lib/actions/profile"
import { settle } from "@/lib/settle"

type ProfileNameFormProps = { labels: Dictionary["settings"]; initialName: string }

export function ProfileNameForm({ labels, initialName }: ProfileNameFormProps) {
  const [name, setName] = useState(initialName)
  const [pending, startTransition] = useTransition()
  const changed = name.trim() !== initialName

  return (
    <form
      className="flex flex-col gap-2"
      onSubmit={(event) => {
        event.preventDefault()
        startTransition(async () => {
          const { ok } = await settle(updateDisplayName(name))
          if (ok) toast.success(labels.nameSaved)
          else toast.error(labels.nameFailed)
        })
      }}
    >
      <Label htmlFor="display-name" className="mb-0">
        {labels.nameLabel}
      </Label>
      <div className="flex gap-2">
        <Input
          id="display-name"
          autoComplete="given-name"
          maxLength={40}
          placeholder={labels.namePlaceholder}
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
        <Button type="submit" variant="secondary" disabled={!changed || pending}>
          {labels.saveName}
        </Button>
      </div>
    </form>
  )
}
