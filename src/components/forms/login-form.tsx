"use client"

import { Eye, EyeOff } from "lucide-react"
import { useActionState, useState } from "react"

import { authenticate, type AuthState } from "@/app/(auth)/login/actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import type { Dictionary } from "@/i18n/get-dictionary"

type LoginFormProps = {
  labels: Dictionary["auth"]
  /** Error que llega por la URL (p. ej. un enlace caducado). */
  initialError?: keyof Dictionary["auth"]["errors"]
  /** Ruta a la que volver tras entrar (ya validada). */
  next?: string
}

type Mode = "signin" | "signup"

/** Entrar o crear cuenta con email y contraseña. */
export function LoginForm({ labels, initialError, next }: LoginFormProps) {
  const [state, action, pending] = useActionState(authenticate, {
    error: initialError ?? null,
  } satisfies AuthState)
  const [mode, setMode] = useState<Mode>("signin")
  // Controlados para que no se borren si el envío falla.
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)

  const emailError = state.error === "invalidEmail"
  const passwordError =
    state.error === "passwordTooShort" ||
    state.error === "passwordTooLong" ||
    state.error === "invalidCredentials"

  return (
    <div className="flex flex-col gap-6">
      <Tabs value={mode} onValueChange={(value) => setMode(value as Mode)}>
        <TabsList variant="segmented" aria-label={labels.modeLabel}>
          <TabsTrigger value="signin">{labels.signIn}</TabsTrigger>
          <TabsTrigger value="signup">{labels.signUp}</TabsTrigger>
        </TabsList>
      </Tabs>

      <form action={action} className="flex flex-col gap-5">
        <input type="hidden" name="mode" value={mode} />
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
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
            aria-invalid={emailError || undefined}
            aria-describedby={state.error ? "login-error" : undefined}
          />
        </div>
        <div>
          <Label htmlFor="password">{labels.passwordLabel}</Label>
          <div className="relative">
            <Input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              minLength={mode === "signup" ? 8 : undefined}
              maxLength={72}
              className="pr-12"
              aria-invalid={passwordError || undefined}
              aria-describedby={
                [mode === "signup" ? "password-hint" : null, state.error ? "login-error" : null]
                  .filter(Boolean)
                  .join(" ") || undefined
              }
            />
            <button
              type="button"
              onClick={() => setShowPassword((value) => !value)}
              aria-label={showPassword ? labels.hidePassword : labels.showPassword}
              aria-pressed={showPassword}
              className="absolute top-1/2 right-1 flex size-11 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              {showPassword ? (
                <EyeOff aria-hidden="true" className="size-5" />
              ) : (
                <Eye aria-hidden="true" className="size-5" />
              )}
            </button>
          </div>
          {mode === "signup" ? (
            <p id="password-hint" className="mt-2 text-xs text-muted-foreground">
              {labels.passwordHint}
            </p>
          ) : null}
        </div>
        {state.error ? (
          <p id="login-error" role="alert" className="text-sm font-semibold text-destructive">
            {labels.errors[state.error]}
          </p>
        ) : null}
        <Button type="submit" size="lg" disabled={pending}>
          {pending
            ? labels.submitting
            : mode === "signup"
              ? labels.signUpSubmit
              : labels.signInSubmit}
        </Button>
      </form>
    </div>
  )
}
