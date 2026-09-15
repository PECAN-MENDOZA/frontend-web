<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import Button from 'primevue/button'
import Column from 'primevue/column'
import DataTable from 'primevue/datatable'
import Skeleton from 'primevue/skeleton'
import Tag from 'primevue/tag'
import {
  accessCodeState,
  canGenerateCode,
  nextSessionLabel,
  sequenceLabel,
} from '@/features/research/utils/study'

const props = defineProps({
  participants: {
    type: Array,
    required: true,
  },
  runs: {
    type: Array,
    required: true,
  },
  study: {
    type: Object,
    default: null,
  },
  isLoading: {
    type: Boolean,
    required: true,
  },
  isBusy: {
    type: Boolean,
    required: true,
  },
})

defineEmits(['add', 'generate', 'revoke', 'regenerate'])

const CLOCK_INTERVAL_MS = 30_000
const now = ref(new Date())
let clock = null

const isStudyActive = computed(() => props.study?.status === 'ACTIVE')
const isStudyClosed = computed(() => props.study?.status === 'CLOSED')
const addHint = computed(() => {
  if (isStudyClosed.value) return 'El estudio está cerrado'
  if (!isStudyActive.value) return 'Activa un protocolo primero'
  return ''
})

const rows = computed(() =>
  props.participants.map((participant) => ({
    id: participant.id,
    pseudonym: participant.pseudonym,
    sequence: sequenceLabel(participant.sequence),
    completed: `${participant.completedRuns ?? 0} / 2`,
    nextSession: nextSessionLabel(participant.nextSession),
    code: accessCodeState(participant, props.runs, now.value),
    canGenerate: canGenerateCode(participant, props.study),
    participant,
  })),
)

onMounted(() => {
  clock = window.setInterval(() => {
    now.value = new Date()
  }, CLOCK_INTERVAL_MS)
})

onUnmounted(() => window.clearInterval(clock))
</script>

<template>
  <section class="panel table-panel research-directory" aria-label="Participantes del estudio">
    <div class="panel__header">
      <div>
        <p class="overline">Directorio seudonimizado</p>
        <h2>Participantes</h2>
      </div>
      <span v-tooltip.bottom="addHint || undefined" class="research-directory__add">
        <Button
          label="Añadir participante"
          icon="pi pi-plus"
          :disabled="!isStudyActive || isBusy"
          :loading="isBusy"
          @click="$emit('add')"
        />
      </span>
    </div>

    <div v-if="isLoading && !participants.length" class="directory-loading">
      <Skeleton v-for="item in 4" :key="item" height="3.6rem" />
    </div>
    <p v-else-if="!participants.length" class="research-table-empty">
      <template v-if="isStudyActive">
        Aún no hay participantes. Añade el primero para emitir su código de acceso.
      </template>
      <template v-else-if="isStudyClosed">Este estudio se cerró sin participantes.</template>
      <template v-else>Activa un protocolo para empezar a añadir participantes.</template>
    </p>
    <DataTable
      v-else
      :value="rows"
      data-key="id"
      class="research-directory-table"
      table-style="min-width: 64rem"
    >
      <Column header="Código">
        <template #body="{ data }">
          <strong class="research-pseudonym">{{ data.pseudonym }}</strong>
        </template>
      </Column>
      <Column field="sequence" header="Secuencia" />
      <Column field="completed" header="Condiciones completadas" />
      <Column field="nextSession" header="Próxima sesión" />
      <Column header="Estado del código">
        <template #body="{ data }">
          <Tag :value="data.code.label" :severity="data.code.severity" rounded />
        </template>
      </Column>
      <Column header="Acciones">
        <template #body="{ data }">
          <div class="research-directory__actions">
            <Button
              label="Generar código"
              icon="pi pi-key"
              size="small"
              severity="secondary"
              outlined
              :disabled="!data.canGenerate || isBusy"
              @click="$emit('generate', data.participant)"
            />
            <template v-if="data.code.pendingRunId">
              <Button
                label="Regenerar"
                icon="pi pi-refresh"
                size="small"
                severity="secondary"
                text
                :disabled="isBusy || isStudyClosed"
                @click="$emit('regenerate', data.participant, data.code.pendingRunId)"
              />
              <Button
                label="Revocar"
                icon="pi pi-ban"
                size="small"
                severity="danger"
                text
                :disabled="isBusy || isStudyClosed"
                @click="$emit('revoke', data.participant, data.code.pendingRunId)"
              />
            </template>
          </div>
        </template>
      </Column>
    </DataTable>
  </section>
</template>
