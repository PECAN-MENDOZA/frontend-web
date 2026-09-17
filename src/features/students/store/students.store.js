import { ref } from 'vue'
import { defineStore } from 'pinia'
import {
  getAcceptanceTrend,
  getErrorTypes,
  getStudentDetail,
  getStudents,
  resetStudentPin as resetStudentPinRequest,
} from '@/features/students/services/students.service'
import { getMonthRange } from '@/shared/utils/month'

export const useStudentsStore = defineStore('students', () => {
  const students = ref([])
  const selectedStudent = ref(null)
  const acceptanceTrend = ref(null)
  const errorTypes = ref(null)
  const isLoading = ref(false)
  const isDetailLoading = ref(false)
  const isInsightsLoading = ref(false)
  const isResettingPin = ref(false)
  const errorMessage = ref('')
  const resetPinErrorMessage = ref('')
  const resetPinCredentials = ref(null)

  async function loadStudents(month) {
    isLoading.value = true
    errorMessage.value = ''

    try {
      students.value = await getStudents(month)
    } catch {
      errorMessage.value = 'No pudimos cargar tus estudiantes. Inténtalo nuevamente.'
    } finally {
      isLoading.value = false
    }
  }

  async function loadStudent(studentId, month) {
    isDetailLoading.value = true
    errorMessage.value = ''

    loadStudentInsights(studentId, month)

    try {
      selectedStudent.value = await getStudentDetail(studentId, month)
    } catch {
      selectedStudent.value = null
      errorMessage.value = 'No pudimos cargar el perfil del estudiante. Inténtalo nuevamente.'
    } finally {
      isDetailLoading.value = false
    }
  }

  // La tendencia y los tipos de error son complementarios: si fallan no deben
  // tumbar el perfil, así que se cargan aparte y cada uno cae a un valor vacío.
  async function loadStudentInsights(studentId, month) {
    isInsightsLoading.value = true
    const { from, to } = getMonthRange(month)

    const [trend, types] = await Promise.all([
      getAcceptanceTrend(studentId, from, to).catch(() => null),
      getErrorTypes(studentId, month).catch(() => null),
    ])

    acceptanceTrend.value = trend
    errorTypes.value = types
    isInsightsLoading.value = false
  }

  async function resetStudentPin(studentId) {
    isResettingPin.value = true
    resetPinErrorMessage.value = ''

    try {
      resetPinCredentials.value = await resetStudentPinRequest(studentId)
      return true
    } catch {
      resetPinErrorMessage.value = 'No pudimos regenerar el PIN. Inténtalo nuevamente.'
      return false
    } finally {
      isResettingPin.value = false
    }
  }

  function clearResetPinCredentials() {
    resetPinCredentials.value = null
    resetPinErrorMessage.value = ''
  }

  function clearSelectedStudent() {
    selectedStudent.value = null
    acceptanceTrend.value = null
    errorTypes.value = null
    clearResetPinCredentials()
  }

  return {
    students,
    selectedStudent,
    acceptanceTrend,
    errorTypes,
    isLoading,
    isDetailLoading,
    isInsightsLoading,
    isResettingPin,
    errorMessage,
    resetPinErrorMessage,
    resetPinCredentials,
    loadStudents,
    loadStudent,
    resetStudentPin,
    clearResetPinCredentials,
    clearSelectedStudent,
  }
})
