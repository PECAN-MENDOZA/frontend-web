import { statusMessage } from '../../../shared/utils/http.js'

// Mensajes conocidos del backend (backend/docs/research-api.md y API del docente), en español.
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
  // Panel docente.
  'Teacher does not have access to this student': 'Este estudiante no está entre tus estudiantes.',
  'Teacher does not have access to this classroom': 'No encontramos este salón.',
  'Teacher does not own this classroom': 'No encontramos este salón.',
  'Classroom name is already in use': 'Ya tienes un salón con ese nombre.',
  'Cannot move a student to an archived classroom':
    'No puedes mover estudiantes a un salón archivado.',
  'Cannot add students to an archived classroom': 'No puedes crear cuentas en un salón archivado.',
  "'to' must not be before 'from'": 'La fecha final no puede ser anterior a la inicial.',
  'Dates must use the YYYY-MM-DD format': 'Las fechas no tienen un formato válido.',
  'Failed to generate PDF report': 'No pudimos generar el reporte. Inténtalo nuevamente.',
  'Too many login attempts':
    'Demasiados intentos. Espera 15 minutos o pide al administrador que reinicie tu contraseña.',
  // Bean Validation (400 con validationErrors por campo).
  'Request validation failed': 'La solicitud no pasó la validación.',
}

// Mensajes con una parte variable: se traduce el molde y se conserva el detalle del backend.
const BACKEND_PATTERNS = [
  [/^Sentence out of order: expected (\d+)$/, 'La oración no es la siguiente (se esperaba la $1).'],
  [/^Student not found: (.+)$/, 'No encontramos al alumno $1.'],
  [/^Period must not exceed (\d+) days$/, 'El periodo no puede pasar de $1 días.'],
]

// Traducción de un mensaje conocido del backend; null si no se conoce.
function knownBackendMessage(message) {
  const text = typeof message === 'string' ? message.trim() : ''

  if (BACKEND_MESSAGES[text]) return BACKEND_MESSAGES[text]

  for (const [pattern, replacement] of BACKEND_PATTERNS) {
    if (pattern.test(text)) return text.replace(pattern, replacement)
  }

  return null
}

export function translateBackendMessage(message) {
  return knownBackendMessage(message) ?? (typeof message === 'string' ? message.trim() : '')
}

// El backend responde en inglés: solo se muestra su mensaje si tiene traducción conocida; si no,
// el texto según el estado HTTP o el genérico de la pantalla. Sin respuesta HTTP —por ejemplo,
// un fallo de red— también se usa el genérico.
export function requestErrorMessage(requestError, fallback) {
  if (!requestError || typeof requestError.status !== 'number') return fallback

  const message =
    knownBackendMessage(requestError.message) ?? statusMessage(requestError.status, fallback)
  const fields = Object.keys(requestError.validationErrors ?? {})

  // Los 400 de validación traen el detalle por campo: se nombran los campos, no sus reglas.
  if (fields.length === 0) return message

  return `${message.replace(/\.$/, '')}; revisa los campos: ${fields.join(', ')}.`
}
