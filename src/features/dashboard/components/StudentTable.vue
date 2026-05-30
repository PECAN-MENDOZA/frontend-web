<script setup>
import Avatar from 'primevue/avatar'
import Column from 'primevue/column'
import DataTable from 'primevue/datatable'
import Tag from 'primevue/tag'
import { formatPercentage, getRateSeverity, getStatusSeverity } from '@/features/dashboard/utils/formatters'

defineProps({
  students: {
    type: Array,
    required: true,
  },
})
</script>

<template>
  <section class="panel table-panel">
    <div class="panel__header">
      <div>
        <p class="overline">Student pulse</p>
        <h2>Classroom overview</h2>
      </div>
      <button class="text-action" type="button">View all students <i class="pi pi-arrow-right"></i></button>
    </div>

    <DataTable :value="students" class="student-table" table-style="min-width: 48rem">
      <Column header="Student">
        <template #body="{ data }">
          <div class="student-cell">
            <Avatar :label="data.initials" shape="circle" />
            <div>
              <strong>{{ data.name }}</strong>
              <span>{{ data.alias }}</span>
            </div>
          </div>
        </template>
      </Column>
      <Column header="Acceptance">
        <template #body="{ data }">
          <Tag :value="formatPercentage(data.acceptanceRate)" :severity="getRateSeverity(data.acceptanceRate)" />
        </template>
      </Column>
      <Column field="totalCorrections" header="Corrections" />
      <Column header="Primary signal">
        <template #body="{ data }">
          <span class="signal-label">{{ data.primarySignal }}</span>
        </template>
      </Column>
      <Column header="Status">
        <template #body="{ data }">
          <Tag :value="data.status" :severity="getStatusSeverity(data.status)" rounded />
        </template>
      </Column>
    </DataTable>
  </section>
</template>
