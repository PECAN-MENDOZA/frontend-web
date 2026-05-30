import { computed, onMounted, ref, watch } from 'vue'
import { useStudentsStore } from '@/features/students/store/students.store'

export const STUDENT_MONTH_OPTIONS = [
  { label: 'May 2026', value: '2026-05' },
  { label: 'April 2026', value: '2026-04' },
  { label: 'March 2026', value: '2026-03' },
]

export function useStudents() {
  const studentsStore = useStudentsStore()
  const selectedMonth = ref('2026-05')
  const searchQuery = ref('')

  const filteredStudents = computed(() => {
    const query = searchQuery.value.trim().toLowerCase()

    if (!query) {
      return studentsStore.students
    }

    return studentsStore.students.filter(
      (student) =>
        student.name.toLowerCase().includes(query) || student.alias.toLowerCase().includes(query),
    )
  })

  const reviewCount = computed(
    () => studentsStore.students.filter((student) => student.status === 'Review').length,
  )
  const averageAcceptance = computed(() => {
    const rates = studentsStore.students
      .map((student) => student.acceptanceRate)
      .filter((rate) => rate != null)

    if (!rates.length) return '--'
    return `${(rates.reduce((total, rate) => total + rate, 0) / rates.length).toFixed(1)}%`
  })

  onMounted(() => studentsStore.loadStudents(selectedMonth.value))
  watch(selectedMonth, (month) => studentsStore.loadStudents(month))

  return {
    studentsStore,
    selectedMonth,
    searchQuery,
    filteredStudents,
    reviewCount,
    averageAcceptance,
    monthOptions: STUDENT_MONTH_OPTIONS,
  }
}
