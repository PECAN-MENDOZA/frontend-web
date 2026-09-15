// Foco de retorno tras un diálogo abierto durante una mutación: el botón que la originó queda
// deshabilitado (o desaparece tras la recarga), así que se captura antes y se decide al cerrar.

export function captureFocusOrigin(doc = globalThis.document) {
  const active = doc?.activeElement ?? null

  if (!active || active === doc.body || typeof active.focus !== 'function') return null

  return active
}

// El origen solo sirve si sigue en el DOM y volvió a estar habilitado; si no, la vista enfoca
// un destino estable.
export function resolveReturnFocus(origin) {
  if (!origin || !origin.isConnected || origin.disabled) return null

  return origin
}
