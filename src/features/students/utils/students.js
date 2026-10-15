// Textos de confirmación de las acciones sobre la cuenta de un alumno. Se nombra al alumno por su
// nombre real si lo tiene y, en el cuerpo, por su alias (lo que usa para entrar al teclado).

function label(realName, alias) {
  return (realName ?? '').trim() || alias || 'el estudiante'
}

export function pinResetConfirmation(realName, alias) {
  return {
    header: `Reiniciar el PIN de ${label(realName, alias)}`,
    message: `El PIN actual de «${alias}» dejará de servir y se cerrará la sesión abierta en su teclado. Tendrás que entregarle el PIN nuevo.`,
    acceptLabel: 'Reiniciar PIN',
  }
}

export function deactivateConfirmation(realName, alias) {
  return {
    header: `Dar de baja a ${label(realName, alias)}`,
    message: `«${alias}» ya no podrá entrar al teclado y dejará de aparecer en tus listas. Sus datos no se borran y puedes reactivarlo después.`,
    acceptLabel: 'Dar de baja',
  }
}

export function reactivateConfirmation(realName, alias) {
  return {
    header: `Reactivar a ${label(realName, alias)}`,
    message: `«${alias}» podrá volver a entrar al teclado con el mismo PIN y aparecerá otra vez en tus listas.`,
    acceptLabel: 'Reactivar',
  }
}
