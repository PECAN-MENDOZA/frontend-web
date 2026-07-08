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
        <p class="overline">Pulso del aula</p>
        <h2>Resumen por estudiante</h2>
      </div>
    </div>

    <DataTable :value="students" class="student-table" table-style="min-width: 54rem">
      <Column header="Estudiante">
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
      <Column header="Aceptación">
        <template #body="{ data }">
          <Tag :value="formatPercentage(data.acceptanceRate)" :severity="getRateSeverity(data.acceptanceRate)" />
        </template>
      </Column>
      <Column field="totalSubmissions" header="Envíos" />
      <Column field="recurringWords" header="Palabras" />
      <Column header="Palabra recurrente">
        <template #body="{ data }">
          <span class="signal-label">{{ data.primarySignal }}</span>
        </template>
      </Column>
      <Column header="Estado">
        <template #body="{ data }">
          <Tag :value="data.status" :severity="getStatusSeverity(data.status)" rounded />
        </template>
      </Column>
    </DataTable>
  </section>
</template>
