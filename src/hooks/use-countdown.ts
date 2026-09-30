"use client"

import { useEffect, useState } from "react"

/**
 * Cuenta atrás en el navegador a partir de los milisegundos que dijo el servidor.
 * Solo es visual: quien decide si la oferta sigue viva al pagar es el servidor.
 */
export function useCountdown(initialMs: number) {
  const [end] = useState(() => Date.now() + initialMs)
  const [left, setLeft] = useState(initialMs)
  useEffect(() => {
    if (initialMs <= 0) return
    const timer = setInterval(() => {
      const next = Math.max(0, end - Date.now())
      setLeft(next)
      if (next === 0) clearInterval(timer)
    }, 250)
    return () => clearInterval(timer)
  }, [end, initialMs])
  return left
}

const pad = (value: number) => String(value).padStart(2, "0")

/** 272 000 ms → "04:32". */
export function formatCountdown(ms: number): string {
  const seconds = Math.ceil(ms / 1000)
  return `${pad(Math.floor(seconds / 60))}:${pad(seconds % 60)}`
}
