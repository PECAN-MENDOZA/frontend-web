export const SENTENCE_MAX = 60
export const REFERENCE_MAX_LENGTH = 500
export const TEST_CODE_PATTERN = /^[A-Z0-9-]{3,40}$/

export const KIND_LABELS = { DICTATED: 'Dictada', FREE: 'Libre' }
export const ASSISTANCE_LABELS = { ASSISTED: 'Con ayuda', UNASSISTED: 'Sin ayuda' }
export const STATUS_LABELS = { DRAFT: 'Borrador', ACTIVE: 'Activa', CLOSED: 'Cerrada' }

export function testFormErrors({ code, title }) {
  const errors = {}

  if (!TEST_CODE_PATTERN.test(code ?? '')) {
    errors.code = 'Usa mayúsculas, números y guiones (3–40).'
  }
  if (!title?.trim()) {
    errors.title = 'El título es obligatorio.'
  }

  return errors
}

export function newSentence(kind = 'DICTATED', assistance = 'ASSISTED') {
  return { kind, referenceText: '', assistance }
}

export function sentenceErrors(sentences) {
  if (!sentences?.length) {
    return [{ index: -1, message: 'Añade al menos una oración.' }]
  }

  const errors = sentences.flatMap((sentence, index) => {
    const text = sentence.referenceText ?? ''

    if (!text.trim()) return [{ index, message: `La oración ${index + 1} está vacía.` }]
    if (text.length > REFERENCE_MAX_LENGTH) {
      return [{ index, message: `La oración ${index + 1} supera 500 caracteres.` }]
    }
    return []
  })

  if (sentences.length > SENTENCE_MAX) {
    errors.unshift({ index: -1, message: 'Máximo 60 oraciones.' })
  }

  return errors
}

export function sentenceCounts(sentences) {
  return (sentences ?? []).reduce(
    (counts, sentence) => {
      counts.total += 1
      if (sentence.kind === 'DICTATED') counts.dictated += 1
      if (sentence.kind === 'FREE') counts.free += 1
      if (sentence.assistance === 'ASSISTED') counts.assisted += 1
      if (sentence.assistance === 'UNASSISTED') counts.unassisted += 1
      return counts
    },
    { total: 0, dictated: 0, free: 0, assisted: 0, unassisted: 0 },
  )
}

export function countsSummary({ total, dictated, free, assisted, unassisted }) {
  return `${total} oraciones · ${dictated} dictadas / ${free} libres · ${assisted} con ayuda / ${unassisted} sin`
}

export function moveSentence(sentences, from, to) {
  const moved = [...sentences]

  if (from < 0 || from >= moved.length || to < 0 || to >= moved.length || from === to) return moved

  moved.splice(to, 0, moved.splice(from, 1)[0])
  return moved
}

export function canActivate(test, sentences) {
  return test?.status === 'DRAFT' && sentenceErrors(sentences).length === 0
}
