"use client"

import { TriangleAlert } from "lucide-react"

import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/ui/empty-state"
import es from "@/i18n/dictionaries/es-ES.json"

/**
 * Error al cargar una pantalla. Es un componente cliente y no puede pedir el diccionario
 * al servidor, así que usa el de es-ES directamente (el único idioma por ahora).
 */
export default function AppError({ reset }: { error: Error; reset: () => void }) {
  return (
    <EmptyState
      className="flex-1"
      icon={TriangleAlert}
      title={es.errors.errorTitle}
      description={es.errors.errorDescription}
      action={<Button onClick={reset}>{es.errors.retry}</Button>}
    />
  )
}
