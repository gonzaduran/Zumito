/** Pantallas sin barra de navegación: acceso y onboarding. */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md animate-in flex-col px-6 pt-[calc(env(safe-area-inset-top)+40px)] pb-[calc(env(safe-area-inset-bottom)+24px)] duration-200 ease-out fade-in motion-reduce:animate-none">
      {children}
    </main>
  )
}
