export const PARTIAL_REFRESH_MESSAGE =
  'No pudimos actualizar los datos. Usa Actualizar para reintentar.'

// Mensaje y severidad de una mutación que terminó bien: `warn` cuando la acción remota se
// completó pero la recarga posterior falló (el aviso se muestra con el texto de reintento).
export function mutationFeedback(successMessage, outcome) {
  if (outcome?.refreshOk === false) {
    return { message: `${successMessage} ${PARTIAL_REFRESH_MESSAGE}`, severity: 'warn' }
  }

  return { message: successMessage, severity: 'success' }
}
