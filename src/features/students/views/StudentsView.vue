<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import Message from 'primevue/message'
import Skeleton from 'primevue/skeleton'
import StudentsTable from '@/features/students/components/StudentsTable.vue'
import { useStudentsStore } from '@/features/students/store/students.store'
import PageHeader from '@/shared/components/PageHeader.vue'

const router = useRouter()
const studentsStore = useStudentsStore()
const searchQuery = ref('')

const filteredStudents = computed(() => {
  const query = searchQuery.value.trim().toLowerCase()
  if (!query) return studentsStore.students

  return studentsStore.students.filter(
    (student) =>
      student.realName.toLowerCase().includes(query) ||
      student.username.toLowerCase().includes(query),
  )
})

const countLabel = computed(() => {
  const count = studentsStore.students.length
  return count === 1 ? '1 estudiante vinculado' : `${count} estudiantes vinculados`
})

function openStudent(studentId) {
  router.push({ name: 'student-detail', params: { studentId } })
}

onMounted(() => studentsStore.loadStudents())
</script>

<template>
  <div class="students-page">
    <PageHeader eyebrow="Directorio del aula" title="Tus estudiantes.">
      <template #description>
        Abre la ficha de cada estudiante para ver qué escribió y en qué se equivocó. Las cuentas se
        crean desde cada salón: <RouterLink to="/classrooms">ir a tus salones</RouterLink>.
      </template>
      <template #actions>
        <Button
          label="Actualizar"
          icon="pi pi-refresh"
          severity="secondary"
          outlined
          :loading="studentsStore.isLoading"
          @click="studentsStore.loadStudents()"
        />
      </template>
    </PageHeader>

    <Message v-if="studentsStore.errorMessage" severity="error">
      {{ studentsStore.errorMessage }}
    </Message>

    <section class="panel directory-panel">
      <div class="directory-panel__toolbar">
        <div>
          <p class="overline">Directorio de estudiantes</p>
          <h2>{{ countLabel }}</h2>
        </div>
        <label class="directory-search">
          <i class="pi pi-search"></i>
          <InputText v-model="searchQuery" placeholder="Buscar por nombre o usuario" />
        </label>
      </div>

      <div
        v-if="studentsStore.isLoading && !studentsStore.students.length"
        class="directory-loading"
      >
        <Skeleton v-for="item in 6" :key="item" height="3.6rem" />
      </div>
      <p v-else-if="!studentsStore.isLoading && !studentsStore.students.length" class="table-empty">
        Aún no tienes estudiantes vinculados.
      </p>
      <StudentsTable v-else :students="filteredStudents" @select="openStudent" />
    </section>
  </div>
</template>
