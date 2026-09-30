"use client"

import { useActionState, useState } from "react"

import { sendCode, verifyCode, type SendCodeState } from "@/app/(auth)/login/actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { Dictionary } from "@/i18n/get-dictionary"
import { interpolate } from "@/i18n/interpolate"

type LoginFormProps = {
  labels: Dictionary["auth"]
  /** Error que llega por la URL (p. ej. un enlace caducado). */
  initialError?: keyof Dictionary["auth"]["errors"]
  /** Ruta a la que volver tras entrar (ya validada). */
  next?: string
}

const initialSendState: SendCodeState = { email: null, error: null, resent: false }

/** Acceso sin contraseña en dos pasos: email y código de un solo uso. */
export function LoginForm({ labels, initialError, next }: LoginFormProps) {
  const [sendState, sendAction, sending] = useActionState(sendCode, {
    ...initialSendState,
    error: initialError ?? null,
  })
  const [verifyState, verifyAction, verifying] = useActionState(verifyCode, { error: null })
  const [changingEmail, setChangingEmail] = useState(false)
  // Controlado para que el email no se borre si el envío falla.
  const [emailInput, setEmailInput] = useState("")

  // Tras "Usar otro email", se vuelve al paso del código solo cuando el nuevo envío sale bien.
  const [lastSendState, setLastSendState] = useState(sendState)
  if (lastSendState !== sendState) {
    setLastSendState(sendState)
    if (sendState.email && !sendState.error) setChangingEmail(false)
  }

  const email = changingEmail ? null : sendState.email

  if (!email) {
    return (
      <form action={sendAction} className="flex flex-col gap-5">
        {next ? <input type="hidden" name="next" value={next} /> : null}
        <div>
          <Label htmlFor="email">{labels.emailLabel}</Label>
          <Input
            id="email"
            name="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder={labels.emailPlaceholder}
            value={emailInput}
            onChange={(event) => setEmailInput(event.target.value)}
            required
            autoFocus
            aria-invalid={sendState.error === "invalidEmail" || undefined}
            aria-describedby={sendState.error ? "login-error" : undefined}
          />
        </div>
        {sendState.error ? (
          <p id="login-error" role="alert" className="text-sm font-semibold text-destructive">
            {labels.errors[sendState.error]}
          </p>
        ) : null}
        <Button type="submit" size="lg" disabled={sending}>
          {sending ? labels.sending : labels.sendCode}
        </Button>
      </form>
    )
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="text-lg font-extrabold">{labels.codeTitle}</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {interpolate(labels.codeSubtitle, { email })}
        </p>
      </div>
      <form action={verifyAction} className="flex flex-col gap-5">
        <input type="hidden" name="email" value={email} />
        <div>
          <Label htmlFor="code">{labels.codeLabel}</Label>
          <Input
            id="code"
            name="code"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9]*"
            maxLength={8}
            required
            autoFocus
            className="h-14 text-center num text-2xl font-bold tracking-[0.4em]"
            aria-invalid={verifyState.error ? true : undefined}
            aria-describedby={verifyState.error ? "code-error" : undefined}
          />
        </div>
        {verifyState.error ? (
          <p id="code-error" role="alert" className="text-sm font-semibold text-destructive">
            {labels.errors[verifyState.error]}
          </p>
        ) : null}
        <Button type="submit" size="lg" disabled={verifying}>
          {verifying ? labels.verifying : labels.verify}
        </Button>
      </form>
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={() => setChangingEmail(true)}>
          {labels.changeEmail}
        </Button>
        <form action={sendAction}>
          <input type="hidden" name="email" value={email} />
          {next ? <input type="hidden" name="next" value={next} /> : null}
          <Button type="submit" variant="ghost" size="sm" disabled={sending}>
            {labels.resend}
          </Button>
        </form>
      </div>
      <p aria-live="polite" className="text-center text-sm text-muted-foreground">
        {sendState.resent ? labels.resent : sendState.error ? labels.errors[sendState.error] : ""}
      </p>
    </div>
  )
}
