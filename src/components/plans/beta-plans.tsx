import { Check, Sparkles } from "lucide-react"

import type { Dictionary } from "@/i18n/get-dictionary"

import { ShareButton } from "./share-button"

function Features({ items }: { items: string[] }) {
  return (
    <ul className="mt-3 flex flex-col gap-2.5">
      {items.map((feature) => (
        <li key={feature} className="flex items-start gap-2.5 text-sm">
          <Check aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-primary-text" />
          {feature}
        </li>
      ))}
    </ul>
  )
}

/**
 * Planes durante la beta: todo gratis y desbloqueado. Se enseñan los planes como
 * "Próximamente" para que se sepa lo que vendrá, sin precios ni pruebas.
 */
export function BetaPlans({ labels }: { labels: Dictionary["plans"] }) {
  const beta = labels.beta
  return (
    <div className="flex flex-col gap-6">
      <section className="rounded-lg bg-linear-155 from-primary to-primary-strong p-5 text-primary-foreground shadow-card">
        <p className="inline-flex items-center gap-1.5 rounded-full bg-white/16 px-3 py-1 text-xs font-bold">
          <Sparkles aria-hidden="true" className="size-3.5" />
          {beta.badge}
        </p>
        <h2 className="mt-3 text-[24px] leading-tight font-extrabold">{beta.title}</h2>
        <p className="mt-2 text-sm font-semibold">{beta.text}</p>
      </section>

      <div className="flex flex-col gap-2">
        <ShareButton
          label={beta.share}
          title={beta.shareTitle}
          text={beta.shareText}
          copiedLabel={beta.copied}
        />
        <p className="text-center text-xs text-muted-foreground">{beta.shareHint}</p>
      </div>

      <section aria-labelledby="beta-free" className="rounded-lg bg-card p-5 shadow-card">
        <div className="flex items-center justify-between gap-3">
          <h2 id="beta-free" className="text-lg font-extrabold">
            {labels.free.name}
          </h2>
          <span className="rounded-full bg-secondary px-3 py-1 text-xs font-bold">
            {beta.forever}
          </span>
        </div>
        <p className="text-sm text-muted-foreground">{labels.free.tagline}</p>
        <p className="mt-3 num text-[28px] font-extrabold">0 €</p>
        <Features items={labels.free.features} />
      </section>

      <section
        aria-labelledby="beta-premium"
        className="rounded-lg bg-card p-5 shadow-card ring-2 ring-primary-text"
      >
        <div className="flex items-center justify-between gap-3">
          <h2 id="beta-premium" className="text-lg font-extrabold">
            {labels.premium.name}
          </h2>
          <span className="rounded-full bg-primary px-3 py-1 text-xs font-extrabold text-primary-foreground">
            {beta.soon}
          </span>
        </div>
        <p className="text-sm text-muted-foreground">{labels.premium.tagline}</p>
        <p className="mt-3 flex items-baseline gap-2">
          <span className="num text-[28px] font-extrabold">0 €</span>
          <span className="text-sm font-bold text-muted-foreground">{beta.duringBeta}</span>
        </p>
        <Features items={labels.premium.features} />
        <ul className="mt-2.5 flex flex-col gap-2.5">
          {labels.premium.upcoming.map((feature) => (
            <li key={feature} className="flex items-start gap-2.5 text-sm text-muted-foreground">
              <Sparkles aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
              <span>
                {feature}{" "}
                <span className="ml-1 rounded-full bg-secondary px-2 py-0.5 text-[11px] font-bold">
                  {labels.soon}
                </span>
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section
        aria-labelledby="beta-friends"
        className="rounded-lg border-2 border-dashed border-border p-5"
      >
        <div className="flex items-center justify-between gap-3">
          <h2 id="beta-friends" className="text-lg font-extrabold">
            {labels.friends.name}
          </h2>
          <span className="rounded-full bg-secondary px-3 py-1 text-xs font-bold">{beta.soon}</span>
        </div>
        <p className="text-sm text-muted-foreground">{labels.friends.tagline}</p>
      </section>

      <section aria-labelledby="beta-faq">
        <h2 id="beta-faq" className="mb-2 text-[15px] font-extrabold">
          {labels.faqTitle}
        </h2>
        <div className="flex flex-col divide-y divide-border rounded-md bg-card px-4 shadow-card">
          {beta.faq.map((item) => (
            <details key={item.q} className="group py-1">
              <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 text-sm font-bold outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
                {item.q}
                <span aria-hidden="true" className="text-muted-foreground group-open:rotate-45">
                  +
                </span>
              </summary>
              <p className="pb-3 text-sm text-muted-foreground">{item.a}</p>
            </details>
          ))}
        </div>
      </section>
    </div>
  )
}
