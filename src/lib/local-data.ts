import { clearQueue } from "@/lib/offline-queue"

/**
 * Borra del dispositivo lo que pertenece a la cuenta: la cola de gastos sin conexión y
 * las pantallas y datos guardados por el service worker. La precaché (recursos estáticos y
 * página sin conexión) no tiene datos personales y se conserva para que la app siga
 * funcionando sin red. Se llama al cerrar sesión o borrar la cuenta.
 */
export async function clearLocalData() {
  clearQueue()
  if (typeof caches === "undefined") return
  try {
    const keys = await caches.keys()
    await Promise.all(
      keys.filter((key) => !key.includes("precache")).map((key) => caches.delete(key)),
    )
  } catch {
    // Si no se puede acceder a la caché, no hay nada más que hacer.
  }
}
