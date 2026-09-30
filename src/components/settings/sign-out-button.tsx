"use client"

import { LogOut } from "lucide-react"

import { signOut } from "@/app/(app)/ajustes/actions"
import { Button } from "@/components/ui/button"
import { clearLocalData } from "@/lib/local-data"

/** Cierra la sesión y borra del dispositivo los datos de la cuenta. */
export function SignOutButton({ label }: { label: string }) {
  return (
    <form action={signOut} onSubmit={() => void clearLocalData()}>
      <Button type="submit" variant="secondary" className="w-full">
        <LogOut />
        {label}
      </Button>
    </form>
  )
}
