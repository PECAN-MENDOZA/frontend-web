import { ref } from 'vue'
import { defineStore } from 'pinia'
import {
  createStudentAccount as createStudentAccountRequest,
  getStudentDetail,
  getStudents,
  resetStudentPin as resetStudentPinRequest,
} from '@/features/students/services/students.service'

export const useStudentsStore = defineStore('students', () => {
  const students = ref([])
  const selectedStudent = ref(null)
  const isLoading = ref(false)
  const isDetailLoading = ref(false)
  const isCreating = ref(false)
  const isResettingPin = ref(false)
  const errorMessage = ref('')
  const creationErrorMessage = ref('')
  const resetPinErrorMessage = ref('')
  const createdStudentAccount = ref(null)
  const resetPinCredentials = ref(null)

  async function loadStudents(month) {
    isLoading.value = true
    errorMessage.value = ''

    try {
      students.value = await getStudents(month)
    } catch {
      errorMessage.value = 'No pudimos cargar tus estudiantes. Intentalo nuevamente.'
    } finally {
      isLoading.value = false
    }
  }

  async function loadStudent(studentId, month) {
    isDetailLoading.value = true
    errorMessage.value = ''

    try {
      selectedStudent.value = await getStudentDetail(studentId, month)
    } catch {
      selectedStudent.value = null
      errorMessage.value = 'No pudimos cargar el perfil del estudiante. Intentalo nuevamente.'
    } finally {
      isDetailLoading.value = false
    }
  }

  async function createStudentAccount(student, month) {
    isCreating.value = true
    creationErrorMessage.value = ''

    try {
      createdStudentAccount.value = await createStudentAccountRequest(student)
      await loadStudents(month)
      return true
    } catch {
      creationErrorMessage.value = 'No pudimos crear la cuenta del estudiante. Intentalo nuevamente.'
      return false
    } finally {
      isCreating.value = false
    }
  }

  async function resetStudentPin(studentId) {
    isResettingPin.value = true
    resetPinErrorMessage.value = ''

    try {
      resetPinCredentials.value = await resetStudentPinRequest(studentId)
      return true
    } catch {
      resetPinErrorMessage.value = 'No pudimos regenerar el PIN. Intentalo nuevamente.'
      return false
    } finally {
      isResettingPin.value = false
    }
  }

  function clearCreatedStudentAccount() {
    createdStudentAccount.value = null
    creationErrorMessage.value = ''
  }

  function clearResetPinCredentials() {
    resetPinCredentials.value = null
    resetPinErrorMessage.value = ''
  }

  function clearSelectedStudent() {
    selectedStudent.value = null
    clearResetPinCredentials()
  }

  return {
    students,
    selectedStudent,
    isLoading,
    isDetailLoading,
    isCreating,
    isResettingPin,
    errorMessage,
    creationErrorMessage,
    resetPinErrorMessage,
    createdStudentAccount,
    resetPinCredentials,
    loadStudents,
    loadStudent,
    createStudentAccount,
    resetStudentPin,
    clearCreatedStudentAccount,
    clearResetPinCredentials,
    clearSelectedStudent,
  }
})
