/**
 * Se vuelve a montar en cada navegación, así que la animación de entrada se repite
 * en cada pantalla. Es CSS puro: se ve desde el primer render, sin esperar a hidratar.
 */
export default function AppTemplate({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex flex-1 animate-in flex-col duration-200 ease-out fade-in slide-in-from-bottom-2 motion-reduce:animate-none">
      {children}
    </main>
  )
}
