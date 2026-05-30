<script setup>
import Column from 'primevue/column'
import DataTable from 'primevue/datatable'
import ProgressBar from 'primevue/progressbar'
import Tag from 'primevue/tag'

defineProps({
  words: {
    type: Array,
    required: true,
  },
})

function getTypeSeverity(type) {
  return {
    Ortográfico: 'danger',
    Fonológico: 'info',
    Semántico: 'warn',
  }[type]
}
</script>

<template>
  <section class="panel words-panel">
    <div class="panel__header">
      <div>
        <p class="overline">Palabras recurrentes</p>
        <h2>Patrones para reforzar</h2>
      </div>
      <span class="panel__meta">Top 10</span>
    </div>

    <DataTable :value="words" class="words-table">
      <Column header="Original">
        <template #body="{ data }">
          <strong>{{ data.word }}</strong>
        </template>
      </Column>
      <Column header="Tipo">
        <template #body="{ data }">
          <Tag :value="data.type" :severity="getTypeSeverity(data.type)" />
        </template>
      </Column>
      <Column field="frequency" header="Repeticiones" />
      <Column header="Confianza">
        <template #body="{ data }">
          <div class="confidence-cell">
            <ProgressBar :value="data.confidencePercent" :show-value="false" />
            <span>{{ data.confidencePercent }}%</span>
          </div>
        </template>
      </Column>
    </DataTable>
  </section>
</template>
