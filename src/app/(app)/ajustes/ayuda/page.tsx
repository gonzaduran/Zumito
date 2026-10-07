import {
  ChartPie,
  CreditCard,
  PiggyBank,
  Pencil,
  Percent,
  Plus,
  ShieldCheck,
  Smartphone,
  Users,
  Wallet,
  WifiOff,
  Zap,
  type LucideIcon,
} from "lucide-react"

import Link from "next/link"

import { AppHeader } from "@/components/layout/app-header"
import { ShareButton } from "@/components/plans/share-button"
import { buttonVariants } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { getDictionary } from "@/i18n/get-dictionary"

const icons: Record<string, LucideIcon> = {
  add: Plus,
  edit: Pencil,
  offline: WifiOff,
  stats: ChartPie,
  money: Wallet,
  accounts: CreditCard,
  split: Percent,
  friends: Users,
  budgets: PiggyBank,
  install: Smartphone,
  shortcuts: Zap,
  data: ShieldCheck,
}

/** Guía rápida: qué se puede hacer y dónde. */
export default async function HelpPage() {
  const dict = await getDictionary()
  const labels = dict.help
  const share = dict.plans.beta

  return (
    <>
      <AppHeader title={labels.title} back={{ href: "/ajustes", label: labels.back }} />
      <div className="flex flex-col gap-4 px-6 pt-2 pb-8">
        <p className="text-sm text-muted-foreground">{labels.intro}</p>
        {labels.sections.map((section) => {
          const Icon = icons[section.key] ?? Plus
          return (
            <Card key={section.key} className="flex gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary-wash text-primary-text">
                <Icon aria-hidden="true" className="size-5" />
              </span>
              <section aria-labelledby={`help-${section.key}`} className="min-w-0 flex-1">
                <h2 id={`help-${section.key}`} className="font-extrabold">
                  {section.title}
                </h2>
                <ol className="mt-1.5 flex flex-col gap-1.5">
                  {section.steps.map((step) => (
                    <li key={step} className="text-sm text-muted-foreground">
                      {step}
                    </li>
                  ))}
                </ol>
                {section.href ? (
                  <Link
                    href={section.href}
                    className="mt-1 inline-flex min-h-11 items-center text-sm font-bold text-primary-text outline-none focus-visible:rounded-md focus-visible:ring-3 focus-visible:ring-ring/50"
                  >
                    {section.linkLabel}
                  </Link>
                ) : null}
              </section>
            </Card>
          )
        })}
        <section aria-labelledby="help-share" className="mt-2 flex flex-col gap-2 text-center">
          <h2 id="help-share" className="font-extrabold">
            {labels.shareTitle}
          </h2>
          <p className="text-sm text-muted-foreground">{labels.shareText}</p>
          <ShareButton
            label={share.share}
            title={share.shareTitle}
            text={share.shareText}
            copiedLabel={share.copied}
          />
          <Link href="/ajustes/sugerencias" className={buttonVariants({ variant: "outline" })}>
            {dict.community.feedback}
          </Link>
        </section>
      </div>
    </>
  )
}
