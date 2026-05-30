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
      eyebrow="Classroom directory"
      title="Your students."
      description="Move from classroom signals to individual context, without losing the larger learning picture."
    >
      <template #actions>
        <Select
          v-model="selectedMonth"
          :options="monthOptions"
          option-label="label"
          option-value="value"
          aria-label="Select report month"
        />
        <Button
          label="Refresh"
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

    <section class="metrics-grid" aria-label="Student directory metrics">
      <MetricCard
        label="Linked students"
        :value="studentsStore.students.length"
        change="Active classroom profiles"
        icon="pi pi-users"
        tone="ocean"
      />
      <MetricCard
        label="Average acceptance"
        :value="averageAcceptance"
        change="Across linked students"
        icon="pi pi-check-circle"
        tone="coral"
      />
      <MetricCard
        label="Needs review"
        :value="reviewCount"
        change="Profiles with 15+ signals"
        icon="pi pi-flag"
        tone="amber"
      />
    </section>

    <section class="panel directory-panel">
      <div class="directory-panel__toolbar">
        <div>
          <p class="overline">Student directory</p>
          <h2>Classroom profiles</h2>
        </div>
        <label class="directory-search">
          <i class="pi pi-search"></i>
          <InputText v-model="searchQuery" placeholder="Search name or alias" />
        </label>
      </div>

      <div v-if="studentsStore.isLoading && !studentsStore.students.length" class="directory-loading">
        <Skeleton v-for="item in 6" :key="item" height="3.6rem" />
      </div>
      <StudentsTable v-else :students="filteredStudents" @select="openStudent" />
    </section>
  </div>
</template>
