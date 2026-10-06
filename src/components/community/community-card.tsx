import { MessageSquareHeart, Sparkles } from "lucide-react"
import Link from "next/link"

import { ShareButton } from "@/components/plans/share-button"
import { buttonVariants } from "@/components/ui/button"
import type { Dictionary } from "@/i18n/get-dictionary"

type CommunityCardProps = {
  labels: Dictionary["community"]
  share: Dictionary["plans"]["beta"]
  /** Beta abierta: se dice que es gratis. */
  beta: boolean
}

/** "Comparte Zumito" y "Cuéntanos fallos o ideas", con aviso de beta gratis. */
export function CommunityCard({ labels, share, beta }: CommunityCardProps) {
  return (
    <section
      aria-labelledby="community-title"
      className="flex flex-col gap-3 rounded-lg bg-primary-wash p-5"
    >
      <div className="flex items-start gap-3">
        <Sparkles aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-primary-text" />
        <div>
          <h2 id="community-title" className="font-extrabold">
            {beta ? labels.betaTitle : labels.title}
          </h2>
          <p className="mt-1 text-sm">{labels.text}</p>
        </div>
      </div>
      <ShareButton
        label={share.share}
        title={share.shareTitle}
        text={share.shareText}
        copiedLabel={share.copied}
        size="md"
        variant="primary"
      />
      <Link
        href="/ajustes/sugerencias"
        className={buttonVariants({ variant: "outline", className: "w-full" })}
      >
        <MessageSquareHeart aria-hidden="true" />
        {labels.feedback}
      </Link>
    </section>
  )
}
