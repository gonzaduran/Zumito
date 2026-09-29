/**
 * Espera una acción de servidor sin lanzar: un fallo de red (la acción no llega a
 * responder) se trata igual que un error, para poder avisar y ofrecer reintentar.
 */
export async function settle(request: Promise<{ ok: boolean }>): Promise<{ ok: boolean }> {
  try {
    return await request
  } catch {
    return { ok: false }
  }
}
