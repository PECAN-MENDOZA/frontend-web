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
    <Column field="totalErrors" header="Señales" />
    <Column header="Señal principal">
      <template #body="{ data }">
        <span class="signal-label">{{ data.primarySignal }}</span>
      </template>
    </Column>
    <Column header="Estado">
      <template #body="{ data }">
        <Tag :value="data.status" :severity="getStatusSeverity(data.status)" rounded />
      </template>
    </Column>
    <Column header="Perfil">
      <template #body="{ data }">
        <Button
          label="Ver"
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
