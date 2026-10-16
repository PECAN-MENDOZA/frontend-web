<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import Message from 'primevue/message'
import Skeleton from 'primevue/skeleton'
import StudentsTable from '@/features/students/components/StudentsTable.vue'
import { useStudentsStore } from '@/features/students/store/students.store'
import { filterStudents, normalizeSearch, studentCountLabel } from '@/features/students/utils/students'
import PageHeader from '@/shared/components/PageHeader.vue'

const route = useRoute()
const router = useRouter()
const studentsStore = useStudentsStore()
// La búsqueda vive en la URL (?q=): al volver de una ficha el directorio sigue filtrado igual.
const searchQuery = ref(typeof route.query.q === 'string' ? route.query.q : '')

const isFiltered = computed(() => Boolean(normalizeSearch(searchQuery.value)))
const filteredStudents = computed(() => filterStudents(studentsStore.students, searchQuery.value))

const countLabel = computed(() =>
  studentCountLabel(
    filteredStudents.value.length,
    studentsStore.students.length,
    isFiltered.value,
  ),
)
const emptyMessage = computed(() =>
  isFiltered.value ? `Ningún estudiante coincide con «${searchQuery.value.trim()}».` : '',
)

watch(searchQuery, (value) => {
  const query = { ...route.query }
  if (value.trim()) query.q = value
  else delete query.q
  router.replace({ query })
})

function openStudent(studentId) {
  router.push({ name: 'student-detail', params: { studentId } })
}

onMounted(() => studentsStore.loadStudents())
</script>

<template>
  <div class="students-page">
    <PageHeader eyebrow="Directorio" title="Tus estudiantes">
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
          <i class="pi pi-search" aria-hidden="true"></i>
          <InputText
            v-model="searchQuery"
            type="search"
            placeholder="Buscar por nombre o alias"
            aria-label="Buscar por nombre o alias"
          />
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
      <StudentsTable
        v-else
        :students="filteredStudents"
        :empty-message="emptyMessage"
        @select="openStudent"
      />
    </section>
  </div>
</template>
