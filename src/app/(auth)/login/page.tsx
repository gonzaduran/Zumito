import { Logo } from "@/components/brand/logo"
import { LoginForm } from "@/components/forms/login-form"
import { getDictionary } from "@/i18n/get-dictionary"
import { safeNextPath } from "@/lib/safe-next"

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const [dict, params] = await Promise.all([getDictionary(), searchParams])

  return (
    <>
      <Logo size={72} className="text-foreground" label={dict.app.name} />
      <h1 className="mt-8 text-[28px] leading-tight font-extrabold">{dict.auth.title}</h1>
      <p className="mt-2 mb-8 text-[15px] text-muted-foreground">{dict.auth.subtitle}</p>
      <LoginForm
        labels={dict.auth}
        initialError={params.error === "link" ? "linkFailed" : undefined}
        next={safeNextPath(Array.isArray(params.next) ? params.next[0] : params.next) ?? undefined}
      />
    </>
  )
}
