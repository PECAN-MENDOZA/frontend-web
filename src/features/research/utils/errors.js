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
}

export function translateBackendMessage(message) {
  const text = typeof message === 'string' ? message.trim() : ''

  return BACKEND_MESSAGES[text] ?? text
}

// Conserva el mensaje del backend (traducido si es conocido); sin respuesta HTTP
// —por ejemplo, un fallo de red— usa el texto genérico.
export function requestErrorMessage(requestError, fallback) {
  if (!requestError || typeof requestError.status !== 'number') return fallback

  return translateBackendMessage(requestError.message) || fallback
}
