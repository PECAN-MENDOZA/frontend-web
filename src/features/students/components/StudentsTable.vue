<script setup>
import Avatar from 'primevue/avatar'
import Button from 'primevue/button'
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

defineEmits(['select'])
</script>

<template>
  <DataTable
    :value="students"
    class="student-directory-table"
    paginator
    :rows="8"
    :rows-per-page-options="[8, 15]"
    table-style="min-width: 58rem"
  >
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
    <Column field="totalSubmissions" header="Submissions" />
    <Column field="totalErrors" header="Signals" />
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
    <Column header="Profile">
      <template #body="{ data }">
        <Button
          label="Open"
          icon="pi pi-arrow-right"
          icon-pos="right"
          text
          size="small"
          @click="$emit('select', data.id)"
        />
      </template>
    </Column>
  </DataTable>
</template>
