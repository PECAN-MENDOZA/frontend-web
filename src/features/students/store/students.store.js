import { ref } from 'vue'
import { defineStore } from 'pinia'
import { getStudentDetail, getStudents } from '@/features/students/services/students.service'

export const useStudentsStore = defineStore('students', () => {
  const students = ref([])
  const selectedStudent = ref(null)
  const isLoading = ref(false)
  const isDetailLoading = ref(false)
  const errorMessage = ref('')

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

    try {
      selectedStudent.value = await getStudentDetail(studentId, month)
    } catch {
      selectedStudent.value = null
      errorMessage.value = 'No pudimos cargar el perfil del estudiante. Inténtalo nuevamente.'
    } finally {
      isDetailLoading.value = false
    }
  }

  function clearSelectedStudent() {
    selectedStudent.value = null
  }

  return {
    students,
    selectedStudent,
    isLoading,
    isDetailLoading,
    errorMessage,
    loadStudents,
    loadStudent,
    clearSelectedStudent,
  }
})
