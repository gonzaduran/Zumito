import type { Dictionary } from "@/i18n/get-dictionary"

/** Vista previa de lo que desbloquea Premium: una imagen explica más que tres párrafos. */
export function PremiumPreview({ labels }: { labels: Dictionary["plans"]["preview"] }) {
  return (
    <figure className="rounded-lg bg-card p-4 shadow-card">
      <figcaption className="mb-3 flex items-center justify-between text-xs font-bold text-muted-foreground">
        {labels.label}
        <span className="rounded-full bg-secondary px-2 py-0.5">{labels.example}</span>
      </figcaption>
      <ul className="flex flex-col gap-3">
        {labels.rows.map((row) => {
          const over = row.ratio >= 1
          return (
            <li key={row.name} className="flex items-center gap-3">
              <span
                aria-hidden="true"
                className="flex size-10 shrink-0 items-center justify-center rounded-full bg-secondary text-lg"
              >
                {row.emoji}
              </span>
              <div className="min-w-0 flex-1">
                <p className="flex justify-between gap-2 text-sm">
                  <span className="font-bold">{row.name}</span>
                  <span
                    className={
                      over ? "num font-bold text-destructive" : "num text-muted-foreground"
                    }
                  >
                    {row.status}
                  </span>
                </p>
                <div
                  aria-hidden="true"
                  className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-border"
                >
                  <div
                    className={
                      over ? "h-full rounded-full bg-destructive" : "h-full rounded-full bg-primary"
                    }
                    style={{ width: `${Math.min(row.ratio, 1) * 100}%` }}
                  />
                </div>
              </div>
            </li>
          )
        })}
      </ul>
    </figure>
  )
}
