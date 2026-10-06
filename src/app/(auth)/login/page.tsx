import { Logo } from "@/components/brand/logo"
import { LoginForm } from "@/components/forms/login-form"
import { getDictionary } from "@/i18n/get-dictionary"
import { getBetaOpen } from "@/lib/data/app-settings"
import { safeNextPath } from "@/lib/safe-next"

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const [dict, params, beta] = await Promise.all([getDictionary(), searchParams, getBetaOpen()])

  return (
    <>
      <Logo size={72} className="text-foreground" label={dict.app.name} />
      {beta ? (
        <p className="mt-6 inline-flex w-fit items-center rounded-full bg-primary px-3 py-1 text-xs font-extrabold text-primary-foreground">
          {dict.auth.betaBadge}
        </p>
      ) : null}
      <h1
        className={
          beta
            ? "mt-3 text-[28px] leading-tight font-extrabold"
            : "mt-8 text-[28px] leading-tight font-extrabold"
        }
      >
        {dict.auth.title}
      </h1>
      <p className="mt-2 mb-8 text-[15px] text-muted-foreground">
        {dict.auth.subtitle}
        {beta ? ` ${dict.auth.betaText}` : null}
      </p>
      <LoginForm
        labels={dict.auth}
        initialError={params.error === "link" ? "linkFailed" : undefined}
        next={safeNextPath(Array.isArray(params.next) ? params.next[0] : params.next) ?? undefined}
      />
    </>
  )
}
