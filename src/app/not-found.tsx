import { Compass } from "lucide-react"
import Link from "next/link"

import { buttonVariants } from "@/components/ui/button"
import { EmptyState } from "@/components/ui/empty-state"
import { getDictionary } from "@/i18n/get-dictionary"

export default async function NotFound() {
  const dict = await getDictionary()
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-6">
      <EmptyState
        icon={Compass}
        title={dict.errors.notFoundTitle}
        description={dict.errors.notFoundDescription}
        action={
          <Link href="/" className={buttonVariants()}>
            {dict.errors.goHome}
          </Link>
        }
      />
    </main>
  )
}
