/**
 * Enlace de iCloud al atajo de iPhone ya hecho ("Apuntar gasto"). Se crea una vez en un
 * iPhone (app Atajos → Compartir → Copiar enlace de iCloud) y se pega aquí: la guía de
 * atajos mostrará "Instalar el atajo ya hecho". Mientras sea `null`, solo se explica cómo
 * crearlo.
 */
export const IOS_SHORTCUT_ICLOUD_URL: string | null = null

/**
 * Enlaces para los atajos. /apuntar enseña las categorías de quien lo abre (con importe,
 * tocar una guarda el gasto); el de categoría fija va directo al formulario.
 */
export function shortcutLinks(origin: string, categoryName?: string) {
  return {
    amount: `${origin}/apuntar?importe=`,
    plain: `${origin}/apuntar`,
    category: categoryName
      ? `${origin}/add?categoria=${encodeURIComponent(categoryName)}&importe=`
      : null,
  }
}
