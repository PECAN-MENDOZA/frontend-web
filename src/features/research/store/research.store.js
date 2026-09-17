import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import {
  createTeacher as createTeacherRequest,
  listClassroomDirectory,
  listTeachers,
  resetTeacherPassword as resetTeacherPasswordRequest,
} from '@/features/research/services/teachers.service'
import { requestErrorMessage } from '@/features/research/utils/errors'
import { createGuardedLoader, createPendingCounter } from '@/features/research/utils/mutations'

const GENERIC_ACTION_ERROR = 'No pudimos completar la acción. Inténtalo nuevamente.'
const GENERIC_TEACHERS_ERROR = 'No pudimos cargar los docentes. Inténtalo nuevamente.'
const GENERIC_CLASSROOM_DIRECTORY_ERROR = 'No pudimos cargar los salones. Inténtalo nuevamente.'
const TEACHER_EMAIL_IN_USE_ERROR = 'Ese correo ya está en uso.'

// Cuentas de docentes y directorio de salones del investigador. Las pruebas de oraciones viven
// en el store `tests`; aquí solo queda lo que comparten el alta de docentes y la asignación.
export const useResearchStore = defineStore('research', () => {
  const teachers = ref([])
  const classroomDirectory = ref([])
  // { teacher: { id, username, email, institution }, password } tras crear o reiniciar.
  const temporaryPassword = ref(null)
  const isTeachersLoading = ref(false)
  const isClassroomDirectoryLoading = ref(false)
  const pendingOperations = ref(0)
  const teachersError = ref('')
  const classroomDirectoryError = ref('')

  const teachersLoader = createGuardedLoader({
    setLoading: (value) => {
      isTeachersLoading.value = value
    },
    setError: (message) => {
      teachersError.value = message
    },
  })
  const classroomDirectoryLoader = createGuardedLoader({
    setLoading: (value) => {
      isClassroomDirectoryLoading.value = value
    },
    setError: (message) => {
      classroomDirectoryError.value = message
    },
  })
  // isMutating cubre el POST y la recarga posterior, incluso con operaciones solapadas.
  const pendingCounter = createPendingCounter((pending) => {
    pendingOperations.value = pending
  })

  const isMutating = computed(() => pendingOperations.value > 0)

  // Cuentas de docentes creadas por el investigador (research-api.md §2).
  function loadTeachers() {
    return teachersLoader.load({
      fallback: GENERIC_TEACHERS_ERROR,
      request: listTeachers,
      apply: (data) => {
        teachers.value = data
      },
    })
  }

  // Directorio de salones de todos los docentes, solo lectura: sirve para asignar pruebas y
  // nunca expone nombres reales, solo los usernames que ya seudonimiza el backend.
  function loadClassroomDirectory() {
    return classroomDirectoryLoader.load({
      fallback: GENERIC_CLASSROOM_DIRECTORY_ERROR,
      request: listClassroomDirectory,
      apply: (data) => {
        classroomDirectory.value = data
      },
    })
  }

  // La contraseña temporal se entrega en claro solo en la respuesta del POST: se guarda aquí
  // para el diálogo y se recarga la lista para reflejar mustChangePassword y los conteos.
  function createTeacher(body) {
    return pendingCounter.track(async () => {
      const created = await post(
        () => createTeacherRequest(body),
        (requestError) => (requestError.status === 409 ? TEACHER_EMAIL_IN_USE_ERROR : null),
      )

      temporaryPassword.value = {
        teacher: {
          id: created.id,
          username: created.username,
          email: created.email,
          institution: created.institution,
        },
        password: created.temporaryPassword,
      }
      await loadTeachers()

      return created
    })
  }

  // La respuesta del backend no repite el correo del docente: se toma del que ya está en
  // memoria para que el aviso de contraseña temporal siga mostrando "Usuario: <email>".
  function resetTeacherPassword(id) {
    return pendingCounter.track(async () => {
      const teacher = teachers.value.find((item) => item.id === id) ?? null
      const result = await post(() => resetTeacherPasswordRequest(id))

      temporaryPassword.value = { teacher, password: result.temporaryPassword }
      // El reinicio vuelve a exigir el cambio de contraseña: la lista se recarga para que
      // la columna "Estado" no quede desactualizada.
      await loadTeachers()

      return result
    })
  }

  function clearTemporaryPassword() {
    temporaryPassword.value = null
  }

  async function post(requestFn, mapError = () => null) {
    try {
      return await requestFn()
    } catch (requestError) {
      throw new Error(
        mapError(requestError) || requestErrorMessage(requestError, GENERIC_ACTION_ERROR),
        { cause: requestError },
      )
    }
  }

  // Cierre de sesión o sesión caducada: nada de esta cuenta sobrevive para la siguiente. Las
  // peticiones en curso quedan obsoletas (no publican ni apagan nada); el contador de
  // operaciones pendientes se libera solo cuando terminan.
  function reset() {
    teachers.value = []
    classroomDirectory.value = []
    temporaryPassword.value = null
    teachersError.value = ''
    classroomDirectoryError.value = ''
    teachersLoader.invalidate()
    classroomDirectoryLoader.invalidate()
  }

  return {
    teachers,
    classroomDirectory,
    temporaryPassword,
    isTeachersLoading,
    isClassroomDirectoryLoading,
    isMutating,
    teachersError,
    classroomDirectoryError,
    loadTeachers,
    loadClassroomDirectory,
    createTeacher,
    resetTeacherPassword,
    clearTemporaryPassword,
    reset,
  }
})
