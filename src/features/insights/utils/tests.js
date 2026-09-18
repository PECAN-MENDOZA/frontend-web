// Pruebas de un alumno (StudentTestSummary) y pruebas en curso (LiveAttemptItem) en la ficha del
// docente: solo se describe lo que pasó en cada oración, sin agregados de "mejora".
import {
  BLANK_RESPONSE_TEXT,
  editLabel,
  errorSourceLabel,
  formatDuration,
} from '../../tests/utils/attempts.js'
import { ASSISTANCE_LABELS, KIND_LABELS } from '../../tests/utils/sentences.js'

/** Filas por oración de un intento completado, ordenadas por posición. */
export function testSentenceRows(summary) {
  return [...(summary?.sentences ?? [])]
    .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
    .map((sentence) => {
      const errorCount = sentence.errorCount ?? null

      return {
        position: sentence.position,
        kindLabel: KIND_LABELS[sentence.kind] ?? sentence.kind ?? '—',
        assistanceLabel: ASSISTANCE_LABELS[sentence.assistance] ?? sentence.assistance ?? '—',
        referenceCaption: sentence.kind === 'DICTATED' ? 'Referencia' : 'Consigna',
        referenceText: sentence.referenceText ?? '',
        skipped: Boolean(sentence.skipped),
        finalText: sentence.skipped ? BLANK_RESPONSE_TEXT : (sentence.finalText ?? ''),
        errorCount,
        errorText: errorCount == null ? '—' : String(errorCount),
        sourceLabel: errorSourceLabel(sentence),
        editLabels: (sentence.edits ?? []).map(editLabel).filter(Boolean),
        durationLabel: formatDuration(sentence.durationFromFirstKeyMs),
      }
    })
}

/** 'Dictado 1 · DIC-1' | 'DIC-1' | 'Prueba'. */
export function attemptLabel(summary) {
  const parts = [summary?.testTitle, summary?.testCode].filter(Boolean)
  return parts.length ? parts.join(' · ') : 'Prueba'
}

/** 'Oración 4 de 20' para un intento en curso. */
export function liveProgressLabel(item) {
  return `Oración ${item?.currentPosition ?? 1} de ${item?.sentenceCount ?? 0}`
}

/** Intentos que estaban en la lista anterior y ya no están (terminaron o se cancelaron). */
export function finishedAttempts(previous, current) {
  const currentIds = new Set((current ?? []).map((item) => item.attemptId))
  return (previous ?? []).filter((item) => !currentIds.has(item.attemptId))
}
