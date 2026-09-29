/**
 * Vibración breve donde el navegador lo permite (Android). En iOS no hay API web
 * de vibración, así que simplemente no hace nada.
 */
function vibrate(pattern: number | number[]) {
  if (typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate(pattern)
}

export const haptics = {
  tap: () => vibrate(8),
  success: () => vibrate([12, 40, 12]),
  error: () => vibrate([30, 60, 30]),
}
