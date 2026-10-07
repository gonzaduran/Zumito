/**
 * Enlace de iCloud al atajo de iPhone ya hecho ("Apuntar gasto"). Se crea una vez en un
 * iPhone (app Atajos → Compartir → Copiar enlace de iCloud) y se pega aquí: la guía de
 * atajos mostrará "Instalar el atajo ya hecho". Mientras sea `null`, solo se explica cómo
 * crearlo.
 */
export const IOS_SHORTCUT_ICLOUD_URL: string | null = null

/** Enlaces de /add para los atajos: con importe, solo el formulario y con una categoría. */
export function shortcutLinks(origin: string, categoryName?: string) {
  return {
    amount: `${origin}/add?importe=`,
    plain: `${origin}/add`,
    category: categoryName
      ? `${origin}/add?categoria=${encodeURIComponent(categoryName)}&importe=`
      : null,
  }
}
