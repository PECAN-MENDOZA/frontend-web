// Desenlace de una corrección (spec §5, com.mvp.backend.insights.domain.Outcome): describe,
// no evalúa. Sin severidades de "mejora" ni comparación entre periodos.

export const OUTCOME_LABELS = {
  EDITED: 'Aceptó y editó',
  ACCEPTED: 'Aceptó',
  REJECTED: 'Rechazó',
  UNDONE: 'Deshizo',
  UNANSWERED: 'Sin respuesta',
  NO_CHANGES: 'Ya estaba bien',
}

export const OUTCOME_SEVERITIES = {
  EDITED: 'success',
  ACCEPTED: 'info',
  REJECTED: 'warn',
  UNDONE: 'warn',
  UNANSWERED: 'secondary',
  NO_CHANGES: 'secondary',
}

// Orden fijo de presentación (mismo orden en toda la UI, no depende de las cifras). "Ya estaba
// bien" (la IA no propuso ningún cambio) va al final: no es una respuesta del alumno a la ayuda.
const OUTCOME_ORDER = ['EDITED', 'ACCEPTED', 'REJECTED', 'UNDONE', 'UNANSWERED', 'NO_CHANGES']

const COUNT_FIELD = {
  EDITED: 'edited',
  ACCEPTED: 'accepted',
  REJECTED: 'rejected',
  UNDONE: 'undone',
  UNANSWERED: 'unanswered',
  NO_CHANGES: 'noChanges',
}

/** [{key, label, count, pct}] a partir de un StudentHelpResponse; pct con 1 decimal, 0 si total=0. */
export function outcomeSummary(help) {
  const total = help?.total ?? 0

  return OUTCOME_ORDER.map((key) => {
    const count = help?.[COUNT_FIELD[key]] ?? 0
    const pct = total > 0 ? Math.round((count / total) * 1000) / 10 : 0

    return { key, label: OUTCOME_LABELS[key], count, pct }
  })
}

/**
 * Etiquetas para las tarjetas del salón a partir de los conteos de desenlaces
 * (ClassroomActivityResponse.students[].outcomes): solo los que ocurrieron, en el orden fijo.
 */
export function outcomeTags(outcomes) {
  return OUTCOME_ORDER.flatMap((key) => {
    const count = outcomes?.[COUNT_FIELD[key]] ?? 0
    if (count === 0) return []
    return [{ key, label: OUTCOME_LABELS[key], count, severity: OUTCOME_SEVERITIES[key] }]
  })
}

/**
 * 'Sin correcciones pedidas' | '1 corrección pedida' | '7 correcciones pedidas'. Mismo nombre en
 * todo el portal (y en el PDF: "Correcciones pedidas") para la misma cifra.
 */
export function correctionsLabel(count) {
  if (!count) return 'Sin correcciones pedidas'
  return count === 1 ? '1 corrección pedida' : `${count} correcciones pedidas`
}

function words(text) {
  return (text ?? '').trim().split(/\s+/).filter(Boolean)
}

/**
 * 'bolver → volver' cuando original y final difieren en exactamente una palabra (mismo largo);
 * si no, las primeras 6 palabras del original seguidas de '…'.
 */
export function correctionLine(item) {
  const originalWords = words(item?.originalText)
  const finalWords = words(item?.finalText)

  if (originalWords.length > 0 && originalWords.length === finalWords.length) {
    const diffIndexes = originalWords.flatMap((word, index) =>
      word === finalWords[index] ? [] : [index],
    )

    if (diffIndexes.length === 1) {
      const [index] = diffIndexes
      return `${originalWords[index]} → ${finalWords[index]}`
    }
  }

  return `${originalWords.slice(0, 6).join(' ')}…`
}

/**
 * null si no fue durante una prueba o si las pruebas de oraciones están apagadas (el backend puede
 * seguir mandando inTest en datos viejos del piloto); si no, marca si la oración era con o sin ayuda.
 */
export function assistanceBadge(item, testsEnabled = true) {
  if (!testsEnabled || !item?.inTest) return null
  return item.assistance === 'ASSISTED' ? 'en prueba · con ayuda' : 'en prueba · sin ayuda'
}
