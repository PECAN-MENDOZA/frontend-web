// Mensajes conocidos del backend de investigación, mostrados en español.
const BACKEND_MESSAGES = {
  'Study not found': 'No encontramos el estudio.',
  'Study is not active': 'El estudio no está activo.',
  'Study is closed': 'El estudio está cerrado.',
  'Study is already closed': 'El estudio ya está cerrado.',
  'Study code already exists': 'Ya existe un estudio con ese código',
  'Study has no active protocol': 'El estudio no tiene un protocolo activo.',
  'Only an active study can be closed': 'Solo se puede cerrar un estudio activo.',
  'Only a draft protocol can be activated': 'Solo se puede activar un protocolo en borrador.',
  'Protocol not found': 'No encontramos el protocolo.',
  'Participant not found': 'No encontramos el participante.',
  'Participant already has an open run': 'El participante ya tiene una sesión abierta.',
  'Participant already completed both conditions': 'El participante ya completó ambas condiciones.',
  'Participant has already completed every condition':
    'El participante ya completó ambas condiciones.',
  'Only pending or active runs can be cancelled':
    'Solo se pueden cancelar sesiones pendientes o en curso.',
  'Only pending or active runs can fail technically':
    'Solo se puede declarar fallo técnico en sesiones pendientes o en curso.',
  'Only completed or failed runs can be excluded':
    'Solo se pueden excluir sesiones completadas o con fallo técnico.',
  'Run is already excluded': 'La sesión ya fue excluida.',
  'Run not found': 'No encontramos la sesión.',
  'Reason must have between 10 and 500 characters':
    'El motivo debe tener entre 10 y 500 caracteres.',
  'Only a pending access code can be revoked': 'Solo se puede revocar un código pendiente.',
  'Access code expired before start': 'El código de acceso venció antes de iniciar la sesión.',
  // Motivos de cancelación que registra el teclado del alumno.
  'Cancelled by the student: abandoned the task': 'Cancelada por el alumno: ya no quiso seguir',
  'Cancelled by the student: technical problem': 'Cancelada por el alumno: problema técnico',
  'Cancelled by the student: interrupted': 'Cancelada por el alumno: interrupción',
  // Anotación ciega (research-api.md §3.4 y §4).
  'Annotation batch not found': 'No encontramos el lote de anotación.',
  'Study has no completed runs to annotate':
    'El estudio no tiene sesiones completadas para anotar.',
  'Study has no suggestions to annotate': 'El estudio no tiene sugerencias para anotar.',
  'Batch is already frozen': 'El lote ya está congelado.',
  'Batch content no longer matches its export hash':
    'El contenido del lote ya no coincide con el hash de su export.',
  'Rater name is required (at most 80 characters)':
    'El nombre del evaluador es obligatorio (máximo 80 caracteres).',
  'RATER_1 and RATER_2 must be distinct raters':
    'Los evaluadores 1 y 2 deben ser personas distintas.',
  'Adjudication requires two complete rater imports':
    'La adjudicación requiere las importaciones completas de ambos evaluadores.',
  'Adjudication must reference the current RATER_1 and RATER_2 imports':
    'La adjudicación debe corresponder a las importaciones vigentes de ambos evaluadores.',
  'Both raters must score the same non-empty set of items':
    'Ambos evaluadores deben puntuar el mismo conjunto de muestras.',
  'File must be a UTF-8 CSV of at most 5 MB': 'El archivo debe ser un CSV UTF-8 de hasta 5 MB.',
  'File is empty': 'El archivo está vacío.',
  'File is not valid UTF-8': 'El archivo no está codificado en UTF-8.',
  'File has a header but no rows': 'El archivo tiene cabecera pero ninguna fila.',
  'File contains an embedded NUL character': 'El archivo contiene caracteres no válidos.',
  'Could not read the uploaded file': 'No pudimos leer el archivo.',
  'Invalid batch content': 'El contenido del lote no es válido.',
  'Score must be non-negative': 'El puntaje no puede ser negativo.',
  // Resultados (research-api.md §5).
  'No orthography annotation batch exists for this study':
    'No existe ningún lote de anotación ortográfica para este estudio.',
  'No semantic annotation batch exists for this study':
    'No existe ningún lote de anotación semántica para este estudio.',
  'No participant has a complete pair of included runs':
    'Ningún participante tiene un par completo de sesiones incluidas.',
  'No included participant has countable words in both conditions':
    'Ningún participante incluido tiene palabras contables en ambas condiciones.',
  'The included ASSISTED runs received no suggestions to evaluate':
    'Las sesiones con asistencia incluidas no recibieron sugerencias para evaluar.',
  // Evaluación técnica (research-api.md §3.5).
  'Precision/recall do not match TP/FP/FN': 'Precisión y recall no coinciden con TP/FP/FN.',
  'F0.5 does not match precision and recall': 'F0.5 no coincide con precisión y recall.',
  'TP, FP and FN must be non-negative': 'TP, FP y FN no pueden ser negativos.',
  'Dataset hash must be a lowercase hex SHA-256':
    'El hash del conjunto debe ser un SHA-256 en hexadecimal minúsculas.',
  'Model version is required (at most 160 characters)':
    'La versión del modelo es obligatoria (máximo 160 caracteres).',
  'Technical evaluation not found': 'No encontramos la evaluación técnica.',
}

// Mensajes con una parte variable (código de muestra, fila, ranura…): se traduce el molde y
// se conserva el detalle tal cual lo envió el backend.
const BACKEND_PATTERNS = [
  [/^Missing scores for (\d+) sample\(s\): (.+)$/s, 'Faltan puntajes en $1 muestra(s): $2'],
  [/^Missing score for sample (.+)$/, 'Falta el puntaje de la muestra $1'],
  [
    /^Score exceeds the word count of sample (.+)$/,
    'El puntaje supera el número de palabras de la muestra $1',
  ],
  [
    /^Score for sample (\S+) must be (.+), got '(.*)'$/,
    'El puntaje de la muestra $1 debe ser $2; se recibió «$3»',
  ],
  [/^Unknown sample code in row (\d+): (.+)$/, 'Código de muestra desconocido en la fila $1: $2'],
  [/^Duplicate sample code in row (\d+): (.+)$/, 'Código de muestra repetido en la fila $1: $2'],
  [
    /^Row (\d+) has (\d+) columns, expected (\d+)$/,
    'La fila $1 tiene $2 columnas; se esperaban $3',
  ],
  [/^Unexpected header: expected (.+)$/s, 'Cabecera inesperada: se esperaba $1'],
  [/^(?:Malformed|Unterminated) quoted field at row (\d+)$/, 'Comillas mal formadas en la fila $1'],
  [/^Unexpected quote in row (\d+)$/, 'Comilla inesperada en la fila $1'],
  [
    /^This file is already the current import for slot (\S+)$/,
    'Este archivo ya es la importación vigente de la ranura $1',
  ],
  [
    /^Another import for slot (\S+) was recorded at the same time, retry$/,
    'Otra importación de la ranura $1 se registró al mismo tiempo; inténtalo de nuevo',
  ],
  [
    /^F0\.5 does not match precision and recall \(expected (.+)\)$/,
    'F0.5 no coincide con precisión y recall (esperado $1)',
  ],
  [/^Category '(.+)' is repeated$/, 'La categoría «$1» está repetida'],
  // Estados de anotación de los resultados (research-api.md §5).
  [
    /^Batch (\S+) is the most recent (orthography|semantic) batch but has no current adjudication over the current rater imports; import its rater and adjudication files(.*)$/s,
    (text, batchId, kind, detail) =>
      `El lote ${batchId} es el más reciente de ${ANNOTATION_KINDS[kind]} pero no tiene una adjudicación vigente sobre las importaciones actuales de los evaluadores; importa sus archivos de evaluadores y adjudicación${translateBackendMessage(detail)}`,
  ],
  [
    /^; the older adjudicated batch (\S+) is not used because only (\d+) of (\d+) included (runs|suggestions) have an adjudicated (?:orthography|semantic) score$/,
    (text, batchId, covered, total, unit) =>
      `; el lote adjudicado anterior ${batchId} no se usa porque solo ${covered} de ${total} ${ANNOTATION_UNITS[unit]} incluidas tienen puntaje adjudicado`,
  ],
  [
    /^(\d+) of (\d+) included (runs|suggestions) have an adjudicated (orthography|semantic) score in the current batch; create and adjudicate a new (?:orthography|semantic) batch$/,
    (text, covered, total, unit, kind) =>
      `Solo ${covered} de ${total} ${ANNOTATION_UNITS[unit]} incluidas tienen puntaje adjudicado de ${ANNOTATION_KINDS[kind]} en el lote vigente; crea y adjudica un lote nuevo`,
  ],
]

const ANNOTATION_KINDS = { orthography: 'ortografía', semantic: 'semántica' }
const ANNOTATION_UNITS = { runs: 'sesiones', suggestions: 'sugerencias' }

export function translateBackendMessage(message) {
  const text = typeof message === 'string' ? message.trim() : ''

  if (BACKEND_MESSAGES[text]) return BACKEND_MESSAGES[text]

  // "Category 'x': <regla>" reutiliza la traducción de la regla.
  const category = text.match(/^Category '(.+?)': (.+)$/s)

  if (category) {
    return `Categoría «${category[1]}»: ${translateBackendMessage(category[2])}`
  }

  for (const [pattern, replacement] of BACKEND_PATTERNS) {
    if (pattern.test(text)) return text.replace(pattern, replacement)
  }

  return text
}

// Conserva el mensaje del backend (traducido si es conocido); sin respuesta HTTP
// —por ejemplo, un fallo de red— usa el texto genérico.
export function requestErrorMessage(requestError, fallback) {
  if (!requestError || typeof requestError.status !== 'number') return fallback

  return translateBackendMessage(requestError.message) || fallback
}
