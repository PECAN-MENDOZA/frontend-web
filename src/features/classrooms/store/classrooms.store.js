import { ref } from 'vue'
import { defineStore } from 'pinia'
import {
  createClassroom as createClassroomRequest,
  createClassroomStudents,
  deactivateStudent as deactivateStudentRequest,
  listClassroomStudents,
  listClassrooms,
  listInactiveStudents,
  moveStudent as moveStudentRequest,
  reactivateStudent as reactivateStudentRequest,
  resetStudentPin as resetStudentPinRequest,
  updateClassroom,
  updateStudent as updateStudentRequest,
} from '@/features/classrooms/services/classrooms.service'
import { inactiveInClassroom, sortClassrooms } from '@/features/classrooms/utils/classrooms'
import { isMissingResource } from '@/shared/utils/http'

const DUPLICATE_NAME_MESSAGE = 'Ya tienes un salón con ese nombre.'
const RESTORE_CONFLICT_MESSAGE =
  'Ya tienes un salón activo con ese nombre. Renombra uno de los dos.'
export const CLASSROOM_NOT_FOUND_MESSAGE = 'No encontramos este salón.'

export const useClassroomsStore = defineStore('classrooms', () => {
  const classrooms = ref([])
  const selectedClassroom = ref(null)
  const students = ref([])
  // Dados de baja del salón abierto: se pueden reactivar desde su detalle.
  const inactiveStudents = ref([])
  // Salón ajeno o inexistente: la vista muestra solo el aviso y el botón para volver.
  const isNotFound = ref(false)
  const createdCredentials = ref([])
  const resetPinCredentials = ref(null)
  const isLoading = ref(false)
  const isMutating = ref(false)
  const errorMessage = ref('')
  const mutationErrorMessage = ref('')

  async function loadClassrooms() {
    isLoading.value = true
    errorMessage.value = ''

    try {
      classrooms.value = sortClassrooms(await listClassrooms())
    } catch {
      errorMessage.value = 'No pudimos cargar tus salones. Inténtalo nuevamente.'
    } finally {
      isLoading.value = false
    }
  }

  // No hay GET de un salón suelto: se toma de la lista, que además alimenta el diálogo de mover.
  // Los dados de baja son un extra: si su carga falla, el salón se muestra igual sin esa sección.
  async function loadClassroom(id) {
    isLoading.value = true
    isNotFound.value = false
    errorMessage.value = ''
    mutationErrorMessage.value = ''

    try {
      const [list, links, inactive] = await Promise.all([
        listClassrooms(),
        listClassroomStudents(id),
        listInactiveStudents().catch(() => []),
      ])

      classrooms.value = sortClassrooms(list)
      selectedClassroom.value = classrooms.value.find((classroom) => classroom.id === id) ?? null
      students.value = links
      inactiveStudents.value = inactiveInClassroom(inactive, id)

      if (!selectedClassroom.value) {
        markNotFound()
      }
    } catch (error) {
      selectedClassroom.value = null
      students.value = []
      inactiveStudents.value = []

      // Aquí el único dato de la petición es el id: un 400 es un id mal formado, o sea, no existe.
      if (isMissingResource(error) || error?.status === 400) markNotFound()
      else errorMessage.value = 'No pudimos cargar el salón. Inténtalo nuevamente.'
    } finally {
      isLoading.value = false
    }
  }

  function markNotFound() {
    isNotFound.value = true
    errorMessage.value = CLASSROOM_NOT_FOUND_MESSAGE
  }

  // Cada mutación devuelve true|false y deja el motivo en español en mutationErrorMessage.
  async function runMutation(action, failureMessage, conflictMessage = failureMessage) {
    isMutating.value = true
    mutationErrorMessage.value = ''

    try {
      await action()
      return true
    } catch (error) {
      mutationErrorMessage.value = error?.status === 409 ? conflictMessage : failureMessage
      return false
    } finally {
      isMutating.value = false
    }
  }

  function replaceClassroom(classroom) {
    classrooms.value = sortClassrooms(
      classrooms.value.map((item) => (item.id === classroom.id ? classroom : item)),
    )

    if (selectedClassroom.value?.id === classroom.id) {
      selectedClassroom.value = classroom
    }
  }

  function createClassroom(name) {
    return runMutation(
      async () => {
        const classroom = await createClassroomRequest(name)

        classrooms.value = sortClassrooms([...classrooms.value, classroom])
      },
      'No pudimos crear el salón. Inténtalo nuevamente.',
      DUPLICATE_NAME_MESSAGE,
    )
  }

  function archiveClassroom(id, archived) {
    return runMutation(
      async () => replaceClassroom(await updateClassroom(id, { archived })),
      archived
        ? 'No pudimos archivar el salón. Inténtalo nuevamente.'
        : 'No pudimos restaurar el salón. Inténtalo nuevamente.',
      // Restaurar choca (409) si ya hay un salón activo con el mismo nombre.
      archived ? 'No pudimos archivar el salón. Inténtalo nuevamente.' : RESTORE_CONFLICT_MESSAGE,
    )
  }

  function renameClassroom(id, name) {
    return runMutation(
      async () => replaceClassroom(await updateClassroom(id, { name })),
      'No pudimos renombrar el salón. Inténtalo nuevamente.',
      DUPLICATE_NAME_MESSAGE,
    )
  }

  function createStudents(id, body) {
    return runMutation(async () => {
      createdCredentials.value = await createClassroomStudents(id, body)
      students.value = await listClassroomStudents(id)
      syncStudentCount()
    }, 'No pudimos crear las cuentas. Inténtalo nuevamente.')
  }

  function updateStudent(studentId, body) {
    return runMutation(async () => {
      const link = await updateStudentRequest(studentId, body)

      students.value = students.value.map((item) =>
        item.studentId === studentId ? { ...item, ...link } : item,
      )
    }, 'No pudimos guardar los cambios del estudiante. Inténtalo nuevamente.')
  }

  function moveStudent(studentId, classroomId) {
    return runMutation(async () => {
      await moveStudentRequest(studentId, classroomId)
      removeStudent(studentId)
      classrooms.value = classrooms.value.map((classroom) =>
        classroom.id === classroomId
          ? { ...classroom, studentCount: classroom.studentCount + 1 }
          : classroom,
      )
    }, 'No pudimos mover al estudiante. Inténtalo nuevamente.')
  }

  function deactivateStudent(studentId) {
    return runMutation(async () => {
      const student = students.value.find((item) => item.studentId === studentId)

      await deactivateStudentRequest(studentId)
      removeStudent(studentId)
      if (student) {
        inactiveStudents.value = [
          { ...student, deactivatedAt: new Date().toISOString() },
          ...inactiveStudents.value.filter((item) => item.studentId !== studentId),
        ]
      }
    }, 'No pudimos dar de baja al estudiante. Inténtalo nuevamente.')
  }

  // 409: ya estaba activo (p. ej. reactivado desde otra pestaña). Se da por hecho y se recarga la
  // lista de activos para que aparezca donde corresponde.
  function reactivateStudent(studentId) {
    return runMutation(async () => {
      let link = null

      try {
        link = await reactivateStudentRequest(studentId)
      } catch (error) {
        if (error?.status !== 409) throw error
      }

      inactiveStudents.value = inactiveStudents.value.filter((item) => item.studentId !== studentId)

      const classroomId = selectedClassroom.value?.id
      if (!classroomId) return

      if (!link) {
        students.value = await listClassroomStudents(classroomId)
      } else if (link.classroomId === classroomId) {
        students.value = [
          ...students.value.filter((item) => item.studentId !== studentId),
          { ...link, deactivatedAt: null },
        ]
      }
      syncStudentCount()
    }, 'No pudimos reactivar al estudiante. Inténtalo nuevamente.')
  }

  function resetStudentPin(studentId) {
    return runMutation(async () => {
      const credential = await resetStudentPinRequest(studentId)
      const student = students.value.find((item) => item.studentId === studentId)

      resetPinCredentials.value = {
        ...credential,
        studentRealName: student?.studentRealName || student?.studentUsername,
      }
    }, 'No pudimos regenerar el PIN. Inténtalo nuevamente.')
  }

  function removeStudent(studentId) {
    students.value = students.value.filter((item) => item.studentId !== studentId)
    syncStudentCount()
  }

  // El contador del salón abierto sigue a su lista de alumnos activos.
  function syncStudentCount() {
    if (selectedClassroom.value) {
      replaceClassroom({ ...selectedClassroom.value, studentCount: students.value.length })
    }
  }

  function clearCreatedCredentials() {
    createdCredentials.value = []
  }

  function clearResetPinCredentials() {
    resetPinCredentials.value = null
  }

  function clearSelectedClassroom() {
    selectedClassroom.value = null
    students.value = []
    inactiveStudents.value = []
    isNotFound.value = false
    mutationErrorMessage.value = ''
    clearCreatedCredentials()
    clearResetPinCredentials()
  }

  // Al cerrar sesión se descartan los datos del docente anterior para que no asomen al reingresar.
  window.addEventListener('auth:signed-out', () => {
    classrooms.value = []
    selectedClassroom.value = null
    students.value = []
    inactiveStudents.value = []
    isNotFound.value = false
    createdCredentials.value = []
    resetPinCredentials.value = null
    errorMessage.value = ''
    mutationErrorMessage.value = ''
  })

  return {
    classrooms,
    selectedClassroom,
    students,
    inactiveStudents,
    isNotFound,
    createdCredentials,
    resetPinCredentials,
    isLoading,
    isMutating,
    errorMessage,
    mutationErrorMessage,
    loadClassrooms,
    loadClassroom,
    createClassroom,
    archiveClassroom,
    renameClassroom,
    createStudents,
    updateStudent,
    moveStudent,
    deactivateStudent,
    reactivateStudent,
    resetStudentPin,
    clearCreatedCredentials,
    clearResetPinCredentials,
    clearSelectedClassroom,
  }
})
