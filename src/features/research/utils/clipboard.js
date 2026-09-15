// Copia con un <textarea> temporal. Pase lo que pase, el nodo se vacía y se retira del DOM:
// el código de acceso nunca queda accesible en la página después de copiar.
export function copyWithFallback(value, doc = globalThis.document) {
  if (!doc) return false

  const field = doc.createElement('textarea')
  // select() mueve el foco al campo temporal: se devuelve a donde estaba al terminar.
  const previouslyFocused = doc.activeElement ?? null
  let isAppended = false

  try {
    field.value = value
    field.setAttribute('readonly', '')
    field.setAttribute('aria-hidden', 'true')
    field.style.position = 'fixed'
    field.style.opacity = '0'
    doc.body.appendChild(field)
    isAppended = true
    field.select()

    return doc.execCommand('copy') === true
  } catch {
    return false
  } finally {
    field.value = ''

    if (isAppended) {
      field.remove()
    }

    if (previouslyFocused?.isConnected && typeof previouslyFocused.focus === 'function') {
      previouslyFocused.focus()
    }
  }
}

export async function copyText(
  value,
  { clipboard = globalThis.navigator?.clipboard, doc = globalThis.document } = {},
) {
  try {
    await clipboard.writeText(value)

    return true
  } catch {
    return copyWithFallback(value, doc)
  }
}
