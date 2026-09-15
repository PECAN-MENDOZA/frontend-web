import { translateBackendMessage } from './errors.js'

export const SCORER_VERSION = 'exact_token_edits_v1'
export const IMPORT_MAX_BYTES = 5 * 1024 * 1024
export const RATER_MAX_LENGTH = 80

// Misma tolerancia que el backend entre los valores informados y los recalculados.
const RATE_TOLERANCE = 1e-6
const MODEL_VERSION_MAX_LENGTH = 160
const CATEGORY_NAME_MAX_LENGTH = 80
const CATEGORIES_MAX = 50
const SHA256_PATTERN = /^[0-9a-f]{64}$/
const SHORT_ID_LENGTH = 8
const SHORT_HASH_LENGTH = 12
const EMPTY = '—'
const MINUS = '−'
const IMPORT_FIELD_ORDER = ['slot', 'rater', 'file']

export const ANNOTATION_SLOT_OPTIONS = [
  { value: 'RATER_1', label: 'Evaluador 1' },
  { value: 'RATER_2', label: 'Evaluador 2' },
  { value: 'ADJUDICATED', label: 'Adjudicación' },
]

const ANNOTATION_KIND_LABELS = {
  ORTHOGRAPHY: 'Ortografía',
  SEMANTIC: 'Semántica',
}

const ANNOTATION_STATUS_LABELS = {
  ADJUDICATED: { label: 'Adjudicado', severity: 'success' },
  NO_BATCH: { label: 'Sin lote', severity: 'secondary' },
  NOT_ADJUDICATED: { label: 'Sin adjudicar', severity: 'warn' },
  INCOMPLETE_COVERAGE: { label: 'Cobertura incompleta', severity: 'warn' },
  NOT_APPLICABLE: { label: 'No aplica', severity: 'secondary' },
  NO_SAMPLE: { label: 'Sin muestra', severity: 'secondary' },
}

// Qué hacer en cada estado (research-api.md §5).
const ANNOTATION_NEXT_STEPS = {
  NO_BATCH: 'Crea el lote.',
  NOT_ADJUDICATED: 'Importa los evaluadores y la adjudicación de este lote; no crees otro.',
  INCOMPLETE_COVERAGE: 'Crea y adjudica un lote nuevo.',
  NOT_APPLICABLE: 'Nada que evaluar.',
  NO_SAMPLE: 'Completa sesiones: ningún participante tiene un par completo.',
  ADJUDICATED: 'Listo: la adjudicación cubre toda la muestra.',
}

// ------------------------------------------------------------------ estado por métrica

// Etiqueta del resultado de cada métrica. El texto enuncia el criterio estadístico
// (research-api.md §5), nunca una conclusión de éxito: sin margen/límite el resultado es
// descriptivo y sin adjudicación la métrica ni siquiera existe.
export function metricStatus(kind, results) {
  switch (kind) {
    case 'PEO':
      return peoStatus(results)
    case 'PPM':
      return ppmStatus(results?.ppm)
    case 'TAS':
      return tasStatus(results?.tas, results?.semanticAnnotation)
    case 'TAS_ACCEPTED':
      return tasStatus(results?.tasAccepted, results?.semanticAnnotation)
    default:
      return status('Sin datos', 'secondary', '', 'none')
  }
}

function peoStatus(results) {
  const gate = annotationGate(results?.orthographyAnnotation)

  if (gate) return gate

  const peo = results?.peo

  if (!peo || (peo.paired?.n ?? 0) < 2) {
    return status(
      'Muestra insuficiente',
      'warn',
      'Se necesitan al menos dos participantes con palabras contables en ambas condiciones.',
      'insufficient',
    )
  }

  if (peo.upperCiBelowZero === true) {
    return status(
      'IC 95 % por debajo de 0',
      'success',
      'El límite superior del IC 95 % de la diferencia de PEO es menor que 0.',
      'criterion_met',
    )
  }

  return status(
    'Sin evidencia concluyente',
    'info',
    'El IC 95 % de la diferencia de PEO incluye el 0 o no se puede calcular.',
    'criterion_not_met',
  )
}

function ppmStatus(ppm) {
  if (!ppm) return status('Sin muestra', 'secondary', '', 'none')

  if (ppm.descriptive) {
    return status(
      'Resultado descriptivo',
      'info',
      'No hay un margen de no inferioridad configurado: se informan los valores sin evaluar el criterio.',
      'descriptive',
    )
  }

  const margin = formatMetric(ppm.nonInferiorityMargin, { digits: 1 })

  if (ppm.nonInferior === true) {
    return status(
      'No inferior (IC 95 %)',
      'success',
      `El límite inferior del IC 95 % de la diferencia de PPM supera ${MINUS}${margin}.`,
      'criterion_met',
    )
  }

  if (ppm.nonInferior === false) {
    return status(
      'No se demuestra no inferioridad',
      'warn',
      `El límite inferior del IC 95 % de la diferencia de PPM no supera ${MINUS}${margin}.`,
      'criterion_not_met',
    )
  }

  return status(
    'Muestra insuficiente',
    'warn',
    'Con menos de dos participantes no hay intervalo de confianza para evaluar el margen.',
    'insufficient',
  )
}

function tasStatus(tas, annotation) {
  const gate = annotationGate(annotation)

  if (gate) return gate

  if (!tas) return status('Sin sugerencias evaluadas', 'secondary', '', 'none')

  if (tas.descriptive) {
    return status(
      'Resultado descriptivo',
      'info',
      'No hay un límite de TAS configurado: se informan los valores sin evaluar el criterio.',
      'descriptive',
    )
  }

  const limit = formatMetric(tas.limit, { digits: 1, unit: '%' })

  if (tas.upperCiBelowLimit === true) {
    return status(
      'Límite superior del IC bajo el límite',
      'success',
      `El límite superior del intervalo de Wilson es menor que ${limit}.`,
      'criterion_met',
    )
  }

  if (tas.upperCiBelowLimit === false) {
    return status(
      'Límite superior del IC por encima del límite',
      'danger',
      `El límite superior del intervalo de Wilson alcanza o supera ${limit}.`,
      'criterion_not_met',
    )
  }

  return status('Sin sugerencias evaluadas', 'secondary', '', 'none')
}

// Mientras la anotación no esté adjudicada no hay métrica que interpretar; el mensaje del
// backend explica por qué (traducido cuando es uno de los fijos).
function annotationGate(annotation) {
  const state = annotation?.status

  if (state === 'ADJUDICATED') return null

  const message = translateBackendMessage(annotation?.message)

  if (state === 'NO_SAMPLE') return status('Sin muestra', 'secondary', message, 'none')
  if (state === 'NOT_APPLICABLE') return status('Nada que evaluar', 'secondary', message, 'none')

  return status('Pendiente de adjudicación', 'warn', message, 'pending')
}

// `state` es la clave estable con la que los paneles deciden avisos y estilos; la etiqueta es
// solo copy: pending | insufficient | criterion_met | criterion_not_met | descriptive | none.
function status(label, severity, message = '', state = 'none') {
  return { label, severity, message, state }
}

// ------------------------------------------------------------------ anotación

export function annotationNextStep(state) {
  return ANNOTATION_NEXT_STEPS[state] ?? ''
}

export function annotationStatusLabel(state) {
  return ANNOTATION_STATUS_LABELS[state] ?? { label: 'Sin datos', severity: 'secondary' }
}

export function annotationKindLabel(kind) {
  return ANNOTATION_KIND_LABELS[kind] ?? kind
}

export function slotLabel(slot) {
  return ANNOTATION_SLOT_OPTIONS.find((option) => option.value === slot)?.label ?? slot
}

export function latestBatch(batches, kind) {
  const ofKind = (batches ?? []).filter((batch) => batch.kind === kind)

  if (ofKind.length === 0) return null

  return [...ofKind].sort(
    (first, second) => new Date(second.createdAt).getTime() - new Date(first.createdAt).getTime(),
  )[0]
}

// Lote de trabajo de una columna: el que citan los resultados (batchId) si está en la lista y
// es del mismo tipo; si no, el más reciente de ese tipo.
export function annotationBatch(batches, kind, batchId) {
  const cited = batchId
    ? (batches ?? []).find((batch) => batch.id === batchId && batch.kind === kind)
    : null

  return cited ?? latestBatch(batches, kind)
}

// Una fila por ranura, en orden, con la importación vigente (o null).
export function currentImports(batch) {
  const imports = batch?.imports ?? []

  return ANNOTATION_SLOT_OPTIONS.map(({ value: slot, label }) => ({
    slot,
    label,
    current: imports.find((entry) => entry.slot === slot && entry.current) ?? null,
  }))
}

// Reglas del backend para la importación: ranura, nombre del evaluador (≤ 80) y CSV ≤ 5 MB.
export function importFormErrors({ slot, rater, file } = {}) {
  const errors = {}
  const trimmedRater = typeof rater === 'string' ? rater.trim() : ''

  if (!ANNOTATION_SLOT_OPTIONS.some((option) => option.value === slot)) {
    errors.slot = 'Elige la ranura que vas a importar.'
  }

  if (!trimmedRater) {
    errors.rater = 'El nombre del evaluador es obligatorio.'
  } else if (trimmedRater.length > RATER_MAX_LENGTH) {
    errors.rater = `Máximo ${RATER_MAX_LENGTH} caracteres.`
  }

  if (!file) {
    errors.file = 'Elige el archivo CSV con los puntajes.'
  } else if (!/\.csv$/i.test(file.name ?? '')) {
    errors.file = 'El archivo debe ser un CSV (.csv).'
  } else if (file.size > IMPORT_MAX_BYTES) {
    errors.file = 'El archivo supera los 5 MB.'
  }

  return errors
}

// Primer control inválido en el orden visual del formulario, para devolverle el foco.
export function firstInvalidField(errors) {
  return IMPORT_FIELD_ORDER.find((field) => Boolean(errors?.[field])) ?? null
}

// ------------------------------------------------------------------ formato

export function formatMetric(value, { digits = 2, unit = '' } = {}) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return EMPTY

  const fixed = value.toFixed(digits)
  // "-0.00" no aporta nada: se muestra como 0.
  const normalized = Number(fixed) === 0 ? Math.abs(Number(fixed)).toFixed(digits) : fixed
  const text = normalized.startsWith('-') ? `${MINUS}${normalized.slice(1)}` : normalized

  return unit ? `${text} ${unit}` : text
}

// "media ± de" con la unidad una sola vez al final.
export function formatPair(mean, sd, { digits = 2, unit = '' } = {}) {
  if (!isFiniteNumber(mean)) return EMPTY

  const text = isFiniteNumber(sd)
    ? `${formatMetric(mean, { digits })} ± ${formatMetric(sd, { digits })}`
    : formatMetric(mean, { digits })

  return unit ? `${text} ${unit}` : text
}

export function formatCi(lower, upper, options) {
  if (!isFiniteNumber(lower) || !isFiniteNumber(upper)) return EMPTY

  return `[${formatMetric(lower, options)}; ${formatMetric(upper, options)}]`
}

export function formatP(p) {
  if (!isFiniteNumber(p)) return EMPTY
  if (p < 0.001) return '< 0.001'

  return p.toFixed(3)
}

export function formatCount(value) {
  return isFiniteNumber(value) ? String(value) : EMPTY
}

export function shortId(value) {
  if (!value) return EMPTY

  return String(value).slice(0, SHORT_ID_LENGTH)
}

export function shortHash(value) {
  if (!value) return EMPTY

  const text = String(value)

  return text.length > SHORT_HASH_LENGTH ? `${text.slice(0, SHORT_HASH_LENGTH)}…` : text
}

// ------------------------------------------------------------------ evaluación técnica

// Valida el informe JSON de evaluate.py (misma forma que el payload del backend) antes de
// registrarlo. Repite las reglas del backend, que sigue siendo la autoridad.
export function technicalEvaluationErrors(report) {
  if (!isPlainObject(report)) {
    return ['El archivo debe contener un objeto JSON con el informe de la evaluación.']
  }

  const errors = []

  if (!isText(report.modelVersion, MODEL_VERSION_MAX_LENGTH)) {
    errors.push(
      `modelVersion es obligatorio (texto de hasta ${MODEL_VERSION_MAX_LENGTH} caracteres).`,
    )
  }

  if (typeof report.datasetSha256 !== 'string' || !SHA256_PATTERN.test(report.datasetSha256)) {
    errors.push('datasetSha256 debe ser un SHA-256 en hexadecimal minúsculas (64 caracteres).')
  }

  if (report.scorerVersion !== SCORER_VERSION) {
    errors.push(`scorerVersion debe ser ${SCORER_VERSION}.`)
  }

  errors.push(
    ...vectorErrors('', {
      precision: report.precision,
      recall: report.recall,
      f05: report.fZeroFive,
      tp: report.truePositives,
      fp: report.falsePositives,
      fn: report.falseNegatives,
      names: {
        precision: 'precision',
        recall: 'recall',
        f05: 'fZeroFive',
        tp: 'truePositives',
        fp: 'falsePositives',
        fn: 'falseNegatives',
      },
    }),
  )

  if (report.categories !== undefined && report.categories !== null) {
    errors.push(...categoriesErrors(report.categories))
  }

  return errors
}

// Solo los campos del contrato, con nombres recortados; categorías ausentes → lista vacía.
export function technicalEvaluationPayload(report) {
  return {
    modelVersion: String(report.modelVersion ?? '').trim(),
    datasetSha256: report.datasetSha256,
    scorerVersion: report.scorerVersion,
    precision: report.precision,
    recall: report.recall,
    fZeroFive: report.fZeroFive,
    truePositives: report.truePositives,
    falsePositives: report.falsePositives,
    falseNegatives: report.falseNegatives,
    categories: Array.isArray(report.categories)
      ? report.categories.map((category) => ({
          category: String(category.category ?? '').trim(),
          tp: category.tp,
          fp: category.fp,
          fn: category.fn,
          precision: category.precision,
          recall: category.recall,
          f05: category.f05,
        }))
      : [],
  }
}

function categoriesErrors(categories) {
  if (!Array.isArray(categories) || categories.length > CATEGORIES_MAX) {
    return [`categories debe ser una lista de hasta ${CATEGORIES_MAX} categorías.`]
  }

  const errors = []
  const seen = new Set()

  categories.forEach((category, index) => {
    if (!isPlainObject(category)) {
      errors.push(`Categoría #${index + 1}: debe ser un objeto.`)
      return
    }

    const name = typeof category.category === 'string' ? category.category.trim() : ''
    const prefix = name ? `Categoría '${name}': ` : `Categoría #${index + 1}: `

    if (!isText(category.category, CATEGORY_NAME_MAX_LENGTH)) {
      errors.push(
        `${prefix}category es obligatorio (texto de hasta ${CATEGORY_NAME_MAX_LENGTH} caracteres).`,
      )
    } else if (seen.has(name)) {
      errors.push(`Categoría '${name}' repetida.`)
    } else {
      seen.add(name)
    }

    errors.push(
      ...vectorErrors(prefix, {
        precision: category.precision,
        recall: category.recall,
        f05: category.f05,
        tp: category.tp,
        fp: category.fp,
        fn: category.fn,
        names: {
          precision: 'precision',
          recall: 'recall',
          f05: 'f05',
          tp: 'tp',
          fp: 'fp',
          fn: 'fn',
        },
      }),
    )
  })

  return errors
}

// Reglas comunes al vector global y a cada categoría: rangos, enteros y coherencia
// P = TP/(TP+FP), R = TP/(TP+FN), F0.5 = 1.25·P·R/(0.25·P+R) con tolerancia 1e-6.
function vectorErrors(prefix, { precision, recall, f05, tp, fp, fn, names }) {
  const errors = []
  const rates = { precision, recall, f05 }
  const counts = { tp, fp, fn }

  for (const [key, value] of Object.entries(rates)) {
    if (!isRate(value)) errors.push(`${prefix}${names[key]} debe ser un número entre 0 y 1.`)
  }

  for (const [key, value] of Object.entries(counts)) {
    if (!isCount(value)) {
      errors.push(`${prefix}${names[key]} debe ser un entero mayor o igual a 0.`)
    }
  }

  if (errors.length > 0) return errors

  if (!matchesRatio(precision, tp, tp + fp)) {
    errors.push(`${prefix}${names.precision} no coincide con TP / (TP + FP).`)
  }

  if (!matchesRatio(recall, tp, tp + fn)) {
    errors.push(`${prefix}${names.recall} no coincide con TP / (TP + FN).`)
  }

  const expected = fZeroFive(precision, recall)

  if (Math.abs(expected - f05) > RATE_TOLERANCE) {
    errors.push(
      `${prefix}${names.f05} no coincide con ${names.precision} y ${names.recall} (esperado ${expected.toFixed(6)}).`,
    )
  }

  return errors
}

function matchesRatio(reported, numerator, denominator) {
  if (denominator === 0) return reported === 0

  return Math.abs(numerator / denominator - reported) <= RATE_TOLERANCE
}

function fZeroFive(precision, recall) {
  const denominator = 0.25 * precision + recall

  return denominator === 0 ? 0 : (1.25 * precision * recall) / denominator
}

function isPlainObject(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isText(value, maxLength) {
  return typeof value === 'string' && value.trim().length > 0 && value.trim().length <= maxLength
}

function isFiniteNumber(value) {
  return typeof value === 'number' && Number.isFinite(value)
}

function isRate(value) {
  return isFiniteNumber(value) && value >= 0 && value <= 1
}

function isCount(value) {
  return Number.isInteger(value) && value >= 0
}
