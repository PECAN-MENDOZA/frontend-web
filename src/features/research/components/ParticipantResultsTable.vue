<script setup>
import { computed } from 'vue'
import Column from 'primevue/column'
import ColumnGroup from 'primevue/columngroup'
import DataTable from 'primevue/datatable'
import Row from 'primevue/row'
import { formatMetric } from '@/features/research/utils/results'

const PERCENT = { digits: 2, unit: '%' }
const RATE = { digits: 1 }

const props = defineProps({
  participants: {
    type: Array,
    required: true,
  },
})

// Valores null (anotación no adjudicada, sin denominador) se muestran como "—".
const rows = computed(() =>
  props.participants.map((participant) => ({
    pseudonym: participant.pseudonym,
    peoAssisted: formatMetric(participant.peoAssisted, PERCENT),
    peoUnassisted: formatMetric(participant.peoUnassisted, PERCENT),
    peoDelta: formatMetric(participant.peoDelta, PERCENT),
    ppmAssisted: formatMetric(participant.ppmAssisted, RATE),
    ppmUnassisted: formatMetric(participant.ppmUnassisted, RATE),
    ppmDelta: formatMetric(participant.ppmDelta, RATE),
    tas: formatMetric(participant.tas, PERCENT),
    tasAccepted: formatMetric(participant.tasAccepted, PERCENT),
  })),
)
</script>

<template>
  <section
    class="panel table-panel research-participant-results"
    aria-label="Resultados por participante"
  >
    <div class="panel__header">
      <div>
        <p class="overline">Par de condiciones</p>
        <h2>Por participante</h2>
      </div>
      <span class="panel__meta">{{ rows.length }} incluidos</span>
    </div>

    <p v-if="!rows.length" class="research-table-empty">
      Ningún participante tiene todavía un par completo de sesiones incluidas.
    </p>
    <DataTable
      v-else
      :value="rows"
      data-key="pseudonym"
      size="small"
      scrollable
      scroll-height="min(60vh, 36rem)"
      class="research-results-table"
      table-style="min-width: 62rem"
    >
      <ColumnGroup type="header">
        <Row>
          <Column header="Participante" :rowspan="2" frozen />
          <Column header="PEO (%)" :colspan="3" class="research-results-table__group" />
          <Column header="PPM" :colspan="3" class="research-results-table__group" />
          <Column header="TAS (%)" :rowspan="2" />
          <Column header="TAS aceptada (%)" :rowspan="2" />
        </Row>
        <Row>
          <Column header="Con asistencia" />
          <Column header="Sin asistencia" />
          <Column header="Δ" />
          <Column header="Con asistencia" />
          <Column header="Sin asistencia" />
          <Column header="Δ" />
        </Row>
      </ColumnGroup>
      <Column frozen>
        <template #body="{ data }">
          <strong class="research-pseudonym">{{ data.pseudonym }}</strong>
        </template>
      </Column>
      <Column field="peoAssisted" />
      <Column field="peoUnassisted" />
      <Column field="peoDelta" class="research-results-table__delta" />
      <Column field="ppmAssisted" />
      <Column field="ppmUnassisted" />
      <Column field="ppmDelta" class="research-results-table__delta" />
      <Column field="tas" />
      <Column field="tasAccepted" />
    </DataTable>
  </section>
</template>
