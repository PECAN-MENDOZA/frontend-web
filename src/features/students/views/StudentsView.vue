<script setup>
import { useRouter } from 'vue-router'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import Message from 'primevue/message'
import Select from 'primevue/select'
import Skeleton from 'primevue/skeleton'
import StudentsTable from '@/features/students/components/StudentsTable.vue'
import { useStudents } from '@/features/students/composables/useStudents'
import PageHeader from '@/shared/components/PageHeader.vue'
import MetricCard from '@/shared/components/insights/MetricCard.vue'

const router = useRouter()
const {
  studentsStore,
  selectedMonth,
  searchQuery,
  filteredStudents,
  reviewCount,
  averageAcceptance,
  monthOptions,
} = useStudents()

function openStudent(studentId) {
  router.push({ name: 'student-detail', params: { studentId } })
}
</script>

<template>
  <div class="students-page">
    <PageHeader
      eyebrow="Directorio del aula"
      title="Tus estudiantes."
      description="Pasa de las señales del aula al contexto individual sin perder la visión general del aprendizaje."
    >
      <template #actions>
        <Select
          v-model="selectedMonth"
          :options="monthOptions"
          option-label="label"
          option-value="value"
          aria-label="Seleccionar mes del reporte"
        />
        <Button
          label="Actualizar"
          icon="pi pi-refresh"
          severity="secondary"
          outlined
          :loading="studentsStore.isLoading"
          @click="studentsStore.loadStudents(selectedMonth)"
        />
      </template>
    </PageHeader>

    <Message v-if="studentsStore.errorMessage" severity="error">
      {{ studentsStore.errorMessage }}
    </Message>

    <section class="metrics-grid" aria-label="Métricas del directorio de estudiantes">
      <MetricCard
        label="Estudiantes vinculados"
        :value="studentsStore.students.length"
        change="Perfiles activos del aula"
        icon="pi pi-users"
        tone="ocean"
      />
      <MetricCard
        label="Aceptación promedio"
        :value="averageAcceptance"
        change="Entre estudiantes vinculados"
        icon="pi pi-check-circle"
        tone="coral"
      />
      <MetricCard
        label="Requieren revisión"
        :value="reviewCount"
        change="Perfiles con 15+ señales"
        icon="pi pi-flag"
        tone="amber"
      />
    </section>

    <section class="panel directory-panel">
      <div class="directory-panel__toolbar">
        <div>
          <p class="overline">Directorio de estudiantes</p>
          <h2>Perfiles del aula</h2>
        </div>
        <label class="directory-search">
          <i class="pi pi-search"></i>
          <InputText v-model="searchQuery" placeholder="Buscar por nombre o alias" />
        </label>
      </div>

      <div v-if="studentsStore.isLoading && !studentsStore.students.length" class="directory-loading">
        <Skeleton v-for="item in 6" :key="item" height="3.6rem" />
      </div>
      <StudentsTable v-else :students="filteredStudents" @select="openStudent" />
    </section>
  </div>
</template>
