// Desenlace de una corrección (spec §5, com.mvp.backend.insights.domain.Outcome): describe,
// no evalúa. Sin severidades de "mejora" ni comparación entre periodos.

export const OUTCOME_LABELS = {
  EDITED: 'Resolvió solo',
  ACCEPTED: 'Aceptó',
  REJECTED: 'Rechazó',
  UNDONE: 'Deshizo',
  UNANSWERED: 'Sin respuesta',
}

export const OUTCOME_SEVERITIES = {
  EDITED: 'success',
  ACCEPTED: 'info',
  REJECTED: 'warn',
  UNDONE: 'warn',
  UNANSWERED: 'secondary',
}

// Orden fijo de presentación (mismo orden en toda la UI, no depende de las cifras).
const OUTCOME_ORDER = ['EDITED', 'ACCEPTED', 'REJECTED', 'UNDONE', 'UNANSWERED']

const COUNT_FIELD = {
  EDITED: 'edited',
  ACCEPTED: 'accepted',
  REJECTED: 'rejected',
  UNDONE: 'undone',
  UNANSWERED: 'unanswered',
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

/** null si no fue durante una prueba; si no, marca si la oración era con o sin ayuda. */
export function assistanceBadge(item) {
  if (!item?.inTest) return null
  return item.assistance === 'ASSISTED' ? 'en prueba · con ayuda' : 'en prueba · sin ayuda'
}
