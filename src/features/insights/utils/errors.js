// Ejemplos y palabras para practicar del alumno: solo conteos y listas, sin comparación temporal.

/** 'bolver → volver (4 veces)' | 'bolver → volver (1 vez)'. */
export function exampleLabel(e) {
  const count = e?.count ?? 0
  const times = count === 1 ? '1 vez' : `${count} veces`

  return `${e?.original ?? ''} → ${e?.corrected ?? ''} (${times})`
}

/** Texto para copiar/imprimir. Sin el nombre del alumno en el título si studentName está vacío. */
export function practiceSheet(words, studentName) {
  const name = studentName?.trim()
  const title = name ? `Palabras para practicar — ${name}` : 'Palabras para practicar'

  const lines = (words ?? []).map((word) => {
    const count = word.count ?? 0
    const times = count === 1 ? '1 vez' : `${count} veces`
    return `${word.corrected} (escribió ${word.original}, ${times})`
  })

  return [title, ...lines].join('\n')
}

/** Copia ordenada de types por count descendente; a igual count conserva el orden original. */
export function sortTypes(types) {
  return (types ?? [])
    .map((type, index) => ({ type, index }))
    .sort((a, b) => b.type.count - a.type.count || a.index - b.index)
    .map(({ type }) => type)
}
