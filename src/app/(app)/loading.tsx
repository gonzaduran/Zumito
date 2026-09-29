import { Skeleton } from "@/components/ui/skeleton"

/** Esqueleto mientras carga una pantalla: la estructura aparece al instante. */
export default function Loading() {
  return (
    <div
      role="status"
      aria-busy="true"
      className="flex flex-col gap-7 px-6 pt-[calc(env(safe-area-inset-top)+24px)]"
    >
      <div className="flex flex-col gap-2">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-6 w-36" />
      </div>
      <Skeleton className="h-40 rounded-lg" />
      <div className="flex flex-col gap-4">
        {Array.from({ length: 5 }, (_, index) => (
          <div key={index} className="flex items-center gap-3">
            <Skeleton className="size-[34px] shrink-0 rounded-full" />
            <div className="flex flex-1 flex-col gap-1.5">
              <Skeleton className="h-3 w-2/3" />
              <Skeleton className="h-2.5 w-1/3" />
            </div>
            <Skeleton className="h-3 w-14" />
          </div>
        ))}
      </div>
    </div>
  )
}
