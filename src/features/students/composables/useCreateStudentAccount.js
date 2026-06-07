import { ref } from 'vue'
import { useStudentsStore } from '@/features/students/store/students.store'

export function useCreateStudentAccount(selectedMonth) {
  const studentsStore = useStudentsStore()
  const isDialogVisible = ref(false)

  function openCreateStudent() {
    studentsStore.clearCreatedStudentAccount()
    isDialogVisible.value = true
  }

  async function createStudent(student) {
    const wasCreated = await studentsStore.createStudentAccount(student, selectedMonth.value)

    if (wasCreated) {
      isDialogVisible.value = false
    }
  }

  return {
    isDialogVisible,
    openCreateStudent,
    createStudent,
  }
}
