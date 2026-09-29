import { cn } from "cn"

type LogoProps = {
  size?: number
  className?: string
  /** Texto para lectores de pantalla. Sin él, el logo es decorativo. */
  label?: string
}

/**
 * Logo de Zumito: un brick con pajita.
 * PROVISIONAL hasta que Claude Design entregue el definitivo; sustituir solo este archivo.
 * Solo se usa en el icono de la app, la pantalla de carga, el onboarding y los ajustes.
 */
export function Logo({ size = 64, className, label }: LogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      className={cn("shrink-0", className)}
    >
      <path
        d="M36 22 L42 5 H51"
        fill="none"
        stroke="currentColor"
        strokeWidth={4}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M16 20 L22 13 H42 L48 20 Z" fill="var(--primary-strong)" />
      <rect x={16} y={18} width={32} height={42} rx={7} fill="var(--primary)" />
      <rect x={22} y={32} width={20} height={16} rx={4} fill="#ffffff" fillOpacity={0.92} />
    </svg>
  )
}
