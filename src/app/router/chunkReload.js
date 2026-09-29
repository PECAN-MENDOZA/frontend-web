// Tras un despliegue, una pestaña abierta con el bundle anterior pide trozos
// (`TestsListView-<hash>.js`) que ya no existen en Firebase: la navegación
// falla en silencio y el login se queda girando. Se recarga la página una sola
// vez para bajar el bundle nuevo; la guarda evita un bucle si el fallo persiste.

const RELOAD_KEY = 'florisboard_chunk_reload_at'
const RELOAD_GUARD_MS = 10_000

const CHUNK_ERROR =
  /Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module|Unable to preload CSS/i

export function isChunkLoadError(error) {
  return CHUNK_ERROR.test(String(error?.message ?? error ?? ''))
}

export function reloadOnceForChunkError(error, { storage, reload, now = Date.now(), targetPath } = {}) {
  if (!isChunkLoadError(error)) return false
  let last = 0
  try {
    last = Number(storage?.getItem(RELOAD_KEY)) || 0
  } catch {
    // storage bloqueado: se recarga igual (sin guarda, como mucho una vez por fallo)
  }
  if (last && now - last < RELOAD_GUARD_MS) return false
  try {
    storage?.setItem(RELOAD_KEY, String(now))
  } catch {
    // ídem
  }
  reload(targetPath)
  return true
}
