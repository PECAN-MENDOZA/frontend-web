// Mensajes conocidos del backend de investigación (backend/docs/research-api.md), en español.
const BACKEND_MESSAGES = {
  // Pruebas de oraciones (§3).
  'Test not found': 'No encontramos la prueba.',
  'Test code already exists': 'Ese código ya existe.',
  'Test is not a draft': 'La prueba ya está activada.',
  'Test is not editable once activated': 'La prueba ya está activada.',
  'Test is not active': 'La prueba no está activa.',
  'Only an active test can be closed': 'Solo se puede cerrar una prueba activa.',
  'Test already completed': 'El alumno ya completó esta prueba.',
  'Another test is in progress': 'El alumno tiene otra prueba en curso.',
  'Sentence not found': 'No encontramos la oración.',
  'Sentence out of order': 'La oración no es la siguiente.',
  'Sentence not started': 'La oración no se ha comenzado.',
  'Sentence already finished': 'La oración ya se terminó.',
  // Intentos, exclusión y anotación (§3.2).
  'Attempt not found': 'No encontramos el intento.',
  'Attempt is not completed': 'El intento no está completado.',
  'Attempt is not in progress': 'El intento no está en curso.',
  'Response not found': 'No encontramos la respuesta.',
  'Sentence response not found': 'No encontramos la respuesta.',
  'Annotation only applies to free sentences': 'Solo se anotan las oraciones libres.',
  'Exclusion reason must have between 10 and 500 characters':
    'El motivo debe tener entre 10 y 500 caracteres.',
  // Docentes y salones (§2).
  'Teacher not found': 'No encontramos al docente.',
  'Email is already in use': 'Ese correo ya está en uso.',
  'Classroom not found': 'No encontramos el salón.',
  'Student not found': 'No encontramos al alumno.',
  // Bean Validation (400 con validationErrors por campo).
  'Request validation failed': 'La solicitud no pasó la validación.',
}

// Mensajes con una parte variable: se traduce el molde y se conserva el detalle del backend.
const BACKEND_PATTERNS = [
  [/^Sentence out of order: expected (\d+)$/, 'La oración no es la siguiente (se esperaba la $1).'],
  [/^Student not found: (.+)$/, 'No encontramos al alumno $1.'],
]

export function translateBackendMessage(message) {
  const text = typeof message === 'string' ? message.trim() : ''

  if (BACKEND_MESSAGES[text]) return BACKEND_MESSAGES[text]

  for (const [pattern, replacement] of BACKEND_PATTERNS) {
    if (pattern.test(text)) return text.replace(pattern, replacement)
  }

  return text
}

// Conserva el mensaje del backend (traducido si es conocido); sin respuesta HTTP
// —por ejemplo, un fallo de red— usa el texto genérico.
export function requestErrorMessage(requestError, fallback) {
  if (!requestError || typeof requestError.status !== 'number') return fallback

  const message = translateBackendMessage(requestError.message) || fallback
  const fields = Object.keys(requestError.validationErrors ?? {})

  // Los 400 de validación traen el detalle por campo: se nombran los campos, no sus reglas.
  if (fields.length === 0) return message

  return `${message.replace(/\.$/, '')}; revisa los campos: ${fields.join(', ')}.`
}
