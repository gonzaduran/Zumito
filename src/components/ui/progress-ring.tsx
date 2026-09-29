import { cn } from "cn"

type ProgressRingProps = {
  /** Progreso entre 0 y 1 (se recorta a ese rango). */
  value: number
  /** Texto del centro, p. ej. "62 %". */
  label: string
  /** Descripción para lectores de pantalla. */
  ariaLabel: string
  className?: string
}

const SIZE = 68
const STROKE = 7
const RADIUS = (SIZE - STROKE) / 2 - 0.5
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

/** Anillo de progreso. Usa `currentColor`, así que hereda el color del texto. */
export function ProgressRing({ value, label, ariaLabel, className }: ProgressRingProps) {
  const clamped = Math.min(Math.max(value, 0), 1)

  return (
    <svg
      role="img"
      aria-label={ariaLabel}
      width={SIZE}
      height={SIZE}
      viewBox={`0 0 ${SIZE} ${SIZE}`}
      className={cn("shrink-0", className)}
    >
      <circle
        cx={SIZE / 2}
        cy={SIZE / 2}
        r={RADIUS}
        fill="none"
        stroke="currentColor"
        strokeOpacity={0.22}
        strokeWidth={STROKE}
      />
      <circle
        cx={SIZE / 2}
        cy={SIZE / 2}
        r={RADIUS}
        fill="none"
        stroke="currentColor"
        strokeWidth={STROKE}
        strokeLinecap="round"
        strokeDasharray={CIRCUMFERENCE}
        strokeDashoffset={CIRCUMFERENCE * (1 - clamped)}
        transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}
      />
      <text
        x="50%"
        y="50%"
        dominantBaseline="central"
        textAnchor="middle"
        fill="currentColor"
        className="num text-[15px] font-extrabold"
      >
        {label}
      </text>
    </svg>
  )
}
