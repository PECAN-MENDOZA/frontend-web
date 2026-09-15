// Entrega un blob al navegador como descarga (mismo patrón que los reportes docentes).
export function saveBlob({ blob, filename }, fallbackName, doc = globalThis.document) {
  const url = URL.createObjectURL(blob)
  const link = doc.createElement('a')

  link.href = url
  link.download = filename || fallbackName
  doc.body.appendChild(link)

  try {
    link.click()
  } finally {
    link.remove()
    URL.revokeObjectURL(url)
  }
}
