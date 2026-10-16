// Textos de confirmación de las acciones sobre la cuenta de un estudiante. Se lo nombra por su
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

// Búsqueda del directorio: sin distinguir mayúsculas ni tildes, en ambos sentidos ("nina" encuentra
// "Niña" y "niña" encuentra "Nina").
export function normalizeSearch(text) {
  return String(text ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
}

export function filterStudents(students, query) {
  const needle = normalizeSearch(query)
  if (!needle) return students ?? []

  return (students ?? []).filter(
    (student) =>
      normalizeSearch(student.realName).includes(needle) ||
      normalizeSearch(student.username).includes(needle),
  )
}

/** '12 estudiantes vinculados' | '3 de 12 estudiantes vinculados' (con búsqueda). */
export function studentCountLabel(shown, total, isFiltered = false) {
  const noun = total === 1 ? 'estudiante vinculado' : 'estudiantes vinculados'
  return isFiltered ? `${shown} de ${total} ${noun}` : `${total} ${noun}`
}

/** Nombre del salón de un estudiante, marcado si está archivado; 'Sin salón' si no tiene. */
export function classroomLabel(name, archived = false) {
  if (!name) return 'Sin salón'
  return archived ? `${name} (archivado)` : name
}

// Páginas del panel docente a las que la ficha puede volver con router.back(). Otras entradas del
// historial (el login, el cambio de contraseña, otro sitio) no cuentan: se va al directorio.
export function canGoBackTo(backPath) {
  return (
    typeof backPath === 'string' &&
    /^\/(students|classrooms|dashboard|tests\/live)(?=$|[/?#])/.test(backPath)
  )
}

/** Rótulo del botón para volver de la ficha según la página interna de la que se vino. */
export function backLabel(backPath) {
  const path = canGoBackTo(backPath) ? backPath : ''
  if (path.startsWith('/classrooms/')) return 'Volver al salón'
  if (path.startsWith('/dashboard')) return 'Volver a Salón hoy'
  if (path.startsWith('/tests/live')) return 'Volver a la prueba en curso'
  return 'Volver a estudiantes'
}
