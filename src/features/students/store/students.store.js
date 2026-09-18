import { ref } from 'vue'
import { defineStore } from 'pinia'
import {
  getStudents,
  resetStudentPin as resetStudentPinRequest,
} from '@/features/students/services/students.service'

export const useStudentsStore = defineStore('students', () => {
  const students = ref([])
  const isLoading = ref(false)
  const isResettingPin = ref(false)
  const errorMessage = ref('')
  const resetPinErrorMessage = ref('')
  const resetPinCredentials = ref(null)

  async function loadStudents() {
    isLoading.value = true
    errorMessage.value = ''

    try {
      students.value = await getStudents()
      return true
    } catch {
      errorMessage.value = 'No pudimos cargar tus estudiantes. Inténtalo nuevamente.'
      return false
    } finally {
      isLoading.value = false
    }
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

  function reset() {
    students.value = []
    isLoading.value = false
    errorMessage.value = ''
    clearResetPinCredentials()
  }

  window.addEventListener('auth:signed-out', reset)

  return {
    students,
    isLoading,
    isResettingPin,
    errorMessage,
    resetPinErrorMessage,
    resetPinCredentials,
    loadStudents,
    resetStudentPin,
    clearResetPinCredentials,
    reset,
  }
})
