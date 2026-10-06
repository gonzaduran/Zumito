"use client"

import { useState, useTransition } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Chip } from "@/components/ui/chip"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import type { Dictionary } from "@/i18n/get-dictionary"
import { sendFeedback } from "@/lib/actions/feedback"
import { haptics } from "@/lib/haptics"
import { feedbackKinds, type FeedbackKind } from "@/lib/validators/feedback"

type FeedbackFormProps = {
  labels: Dictionary["feedback"]
  validation: Dictionary["validation"]
  /** Tipo con el que se abre (p. ej. desde un enlace a "fallo"). */
  initialKind?: FeedbackKind
}

/** Enviar un fallo, una idea u otra cosa. */
export function FeedbackForm({ labels, validation, initialKind = "idea" }: FeedbackFormProps) {
  const [kind, setKind] = useState<FeedbackKind>(initialKind)
  const [message, setMessage] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault()
        startTransition(async () => {
          const result = await sendFeedback({ kind, message }).catch(
            () => ({ ok: false, error: "failed" }) as const,
          )
          if (result.ok) {
            haptics.success()
            toast.success(labels.sent)
            setMessage("")
            setError(null)
            return
          }
          haptics.error()
          setError(
            result.error === "failed"
              ? labels.failed
              : result.error === "tooMany"
                ? labels.tooMany
                : validation[result.error],
          )
        })
      }}
    >
      <div>
        <p id="feedback-kind" className="mb-2 text-[13px] font-extrabold text-muted-foreground">
          {labels.kindLabel}
        </p>
        <div role="group" aria-labelledby="feedback-kind" className="flex flex-wrap gap-2">
          {feedbackKinds.map((option) => (
            <Chip key={option} pressed={kind === option} onPressedChange={() => setKind(option)}>
              <span aria-hidden="true" className="text-base">
                {labels.kinds[option].emoji}
              </span>
              {labels.kinds[option].label}
            </Chip>
          ))}
        </div>
      </div>
      <div>
        <Label htmlFor="feedback-message">{labels.messageLabel}</Label>
        <Textarea
          id="feedback-message"
          rows={6}
          maxLength={2000}
          placeholder={labels.placeholders[kind]}
          value={message}
          onChange={(event) => {
            setMessage(event.target.value)
            setError(null)
          }}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? "feedback-error" : undefined}
        />
      </div>
      {error ? (
        <p id="feedback-error" role="alert" className="text-sm font-semibold text-destructive">
          {error}
        </p>
      ) : null}
      <Button type="submit" size="lg" disabled={pending}>
        {pending ? labels.sending : labels.send}
      </Button>
    </form>
  )
}
