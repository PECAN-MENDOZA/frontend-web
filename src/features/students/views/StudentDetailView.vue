<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import Avatar from 'primevue/avatar'
import Button from 'primevue/button'
import Message from 'primevue/message'
import Select from 'primevue/select'
import Skeleton from 'primevue/skeleton'
import { useStudentDetail } from '@/features/students/composables/useStudentDetail'
import { formatPercentage } from '@/features/dashboard/utils/formatters'
import ErrorDistribution from '@/shared/components/insights/ErrorDistribution.vue'
import MetricCard from '@/shared/components/insights/MetricCard.vue'
import TopWordsTable from '@/shared/components/insights/TopWordsTable.vue'

const router = useRouter()
const { studentsStore, selectedMonth, monthOptions, refreshStudent } = useStudentDetail()
const student = computed(() => studentsStore.selectedStudent)
</script>

<template>
  <div class="student-detail-page">
    <Button
      label="Back to students"
      icon="pi pi-arrow-left"
      severity="secondary"
      text
      @click="router.push({ name: 'students' })"
    />

    <Message v-if="studentsStore.errorMessage" severity="error">
      {{ studentsStore.errorMessage }}
    </Message>

    <template v-if="studentsStore.isDetailLoading && !student">
      <Skeleton height="12rem" border-radius="1.25rem" />
      <div class="metrics-grid">
        <Skeleton v-for="item in 3" :key="item" height="9rem" border-radius="1.25rem" />
      </div>
    </template>

    <template v-else-if="student">
      <section class="student-profile panel">
        <div class="student-profile__identity">
          <Avatar :label="student.initials" size="xlarge" shape="circle" />
          <div>
            <p class="overline">Student profile</p>
            <h1>{{ student.name }}</h1>
            <span>{{ student.alias }}</span>
          </div>
        </div>
        <div class="student-profile__actions">
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
            :loading="studentsStore.isDetailLoading"
            @click="refreshStudent"
          />
        </div>
      </section>

      <section class="metrics-grid" aria-label="Student learning metrics">
        <MetricCard
          label="Suggestion acceptance"
          :value="formatPercentage(student.acceptanceRate)"
          :change="`${student.acceptedSuggestions} of ${student.totalSubmissions} accepted`"
          icon="pi pi-check-circle"
          tone="ocean"
        />
        <MetricCard
          label="Detected signals"
          :value="student.totalErrors"
          change="Across the selected month"
          icon="pi pi-compass"
          tone="coral"
        />
        <MetricCard
          label="Primary signal"
          :value="student.primarySignal"
          change="Most frequent support area"
          icon="pi pi-chart-bar"
          tone="amber"
        />
      </section>

      <div class="student-detail-grid">
        <ErrorDistribution :items="student.errorDistribution" />

        <section class="panel student-context">
          <p class="overline">Educator context</p>
          <h2>Notes for the next conversation</h2>
          <p>{{ student.notes || 'No educator notes have been added yet.' }}</p>
          <dl>
            <div>
              <dt>Accepted</dt>
              <dd>{{ student.acceptedSuggestions }}</dd>
            </div>
            <div>
              <dt>Rejected</dt>
              <dd>{{ student.rejectedSuggestions }}</dd>
            </div>
            <div>
              <dt>Unanswered</dt>
              <dd>{{ student.unansweredSuggestions }}</dd>
            </div>
          </dl>
        </section>
      </div>

      <TopWordsTable :words="student.topWords" />
    </template>
  </div>
</template>
