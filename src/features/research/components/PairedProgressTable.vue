<script setup>
import Column from 'primevue/column'
import DataTable from 'primevue/datatable'
import Tag from 'primevue/tag'
import { conditionLabel, statusLabel, statusSeverity } from '@/features/research/utils/overview'

defineProps({
  rows: {
    type: Array,
    required: true,
  },
})
</script>

<template>
  <DataTable :value="rows" class="paired-progress-table" table-style="min-width: 46rem">
    <Column field="pseudonym" header="Participante" />
    <Column header="Tarea A">
      <template #body="{ data }">
        <div class="paired-progress-table__cell">
          <span>{{ conditionLabel(data.taskA.condition) }}</span>
          <Tag
            :value="statusLabel(data.taskA.status)"
            :severity="statusSeverity(data.taskA.status)"
            rounded
          />
        </div>
      </template>
    </Column>
    <Column header="Tarea B">
      <template #body="{ data }">
        <div class="paired-progress-table__cell">
          <span>{{ conditionLabel(data.taskB.condition) }}</span>
          <Tag
            :value="statusLabel(data.taskB.status)"
            :severity="statusSeverity(data.taskB.status)"
            rounded
          />
        </div>
      </template>
    </Column>
    <Column header="Disposición">
      <template #body="{ data }">
        <Tag :value="data.readiness.label" :severity="data.readiness.severity" rounded />
      </template>
    </Column>
  </DataTable>
</template>
