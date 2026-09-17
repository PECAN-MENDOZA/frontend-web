import { ref } from 'vue'
import { defineStore } from 'pinia'
import {
  createClassroom as createClassroomRequest,
  createClassroomStudents,
  deactivateStudent as deactivateStudentRequest,
  listClassroomStudents,
  listClassrooms,
  moveStudent as moveStudentRequest,
  resetStudentPin as resetStudentPinRequest,
  updateClassroom,
  updateStudent as updateStudentRequest,
} from '@/features/classrooms/services/classrooms.service'
import { sortClassrooms } from '@/features/classrooms/utils/classrooms'

const DUPLICATE_NAME_MESSAGE = 'Ya tienes un salón con ese nombre.'

export const useClassroomsStore = defineStore('classrooms', () => {
  const classrooms = ref([])
  const selectedClassroom = ref(null)
  const students = ref([])
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
  async function loadClassroom(id) {
    isLoading.value = true
    errorMessage.value = ''
    mutationErrorMessage.value = ''

    try {
      const [list, links] = await Promise.all([listClassrooms(), listClassroomStudents(id)])

      classrooms.value = sortClassrooms(list)
      selectedClassroom.value = classrooms.value.find((classroom) => classroom.id === id) ?? null
      students.value = links

      if (!selectedClassroom.value) {
        errorMessage.value = 'No encontramos ese salón.'
      }
    } catch {
      selectedClassroom.value = null
      students.value = []
      errorMessage.value = 'No pudimos cargar el salón. Inténtalo nuevamente.'
    } finally {
      isLoading.value = false
    }
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
      await deactivateStudentRequest(studentId)
      removeStudent(studentId)
    }, 'No pudimos dar de baja al estudiante. Inténtalo nuevamente.')
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
    mutationErrorMessage.value = ''
    clearCreatedCredentials()
    clearResetPinCredentials()
  }

  // Al cerrar sesión se descartan los datos del docente anterior para que no asomen al reingresar.
  window.addEventListener('auth:signed-out', () => {
    classrooms.value = []
    selectedClassroom.value = null
    students.value = []
    createdCredentials.value = []
    resetPinCredentials.value = null
    errorMessage.value = ''
    mutationErrorMessage.value = ''
  })

  return {
    classrooms,
    selectedClassroom,
    students,
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
    resetStudentPin,
    clearCreatedCredentials,
    clearResetPinCredentials,
    clearSelectedClassroom,
  }
})
