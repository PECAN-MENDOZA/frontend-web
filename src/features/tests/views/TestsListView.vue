<script setup>
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import Button from 'primevue/button'
import Column from 'primevue/column'
import DataTable from 'primevue/datatable'
import Message from 'primevue/message'
import Skeleton from 'primevue/skeleton'
import Tag from 'primevue/tag'
import CreateTestDialog from '@/features/tests/components/CreateTestDialog.vue'
import { useTestsStore } from '@/features/tests/store/tests.store'
import { STATUS_LABELS } from '@/features/tests/utils/sentences'
import { formatDate } from '@/features/research/utils/dates'
import PageHeader from '@/shared/components/PageHeader.vue'

const STATUS_SEVERITIES = { DRAFT: 'secondary', ACTIVE: 'success', CLOSED: 'contrast' }

const router = useRouter()
const testsStore = useTestsStore()
const isCreateDialogVisible = ref(false)
const createErrorMessage = ref('')
const noticeMessage = ref('')

onMounted(() => testsStore.loadTests())

function openCreateDialog() {
  createErrorMessage.value = ''
  noticeMessage.value = ''
  isCreateDialogVisible.value = true
}

async function createTest(payload) {
  createErrorMessage.value = ''

  if (await testsStore.createTest(payload)) {
    noticeMessage.value = testsStore.mutationMessage
    isCreateDialogVisible.value = false
  } else {
    createErrorMessage.value = testsStore.mutationMessage
  }
}

function openTest(testId) {
  router.push({ name: 'research-test', params: { testId } })
}
</script>

<template>
  <div class="research-page tests-page">
    <PageHeader
      eyebrow="Instrumentos"
      title="Pruebas de oraciones"
      description="Redacta las oraciones, actívalas y asígnalas a un salón."
    >
      <template #actions>
        <Button label="Nueva prueba" icon="pi pi-plus" @click="openCreateDialog" />
        <Button
          label="Actualizar"
          icon="pi pi-refresh"
          severity="secondary"
          outlined
          :loading="testsStore.isLoading"
          @click="testsStore.loadTests"
        />
      </template>
    </PageHeader>

    <Message v-if="testsStore.errorMessage" severity="error" :closable="false">
      <div class="research-refresh-warning">
        <span>{{ testsStore.errorMessage }}</span>
        <Button
          label="Reintentar"
          icon="pi pi-refresh"
          severity="danger"
          text
          size="small"
          @click="testsStore.loadTests"
        />
      </div>
    </Message>
    <Message v-if="noticeMessage" severity="success" :closable="false">
      {{ noticeMessage }}
    </Message>

    <section class="panel directory-panel">
      <div class="directory-panel__toolbar">
        <div>
          <p class="overline">Banco de pruebas</p>
          <h2>Borradores, pruebas activas y cerradas</h2>
        </div>
        <span class="tests-table__count">{{ testsStore.tests.length }} registradas</span>
      </div>

      <div v-if="testsStore.isLoading && !testsStore.tests.length" class="directory-loading">
        <Skeleton v-for="item in 5" :key="item" height="3.6rem" />
      </div>
      <DataTable
        v-else
        :value="testsStore.tests"
        data-key="id"
        class="tests-table" scrollable
        table-style="min-width: 60rem"
      >
        <template #empty>
          <div class="research-empty-state">
            <span class="research-empty-state__icon">
              <i class="pi pi-list-check" aria-hidden="true"></i>
            </span>
            <h2>Aún no hay pruebas.</h2>
            <p>Crea un borrador para empezar a redactar la secuencia de oraciones.</p>
            <Button label="Nueva prueba" icon="pi pi-plus" @click="openCreateDialog" />
          </div>
        </template>
        <Column header="Código">
          <template #body="{ data }">
            <code class="test-code">{{ data.code || '—' }}</code>
          </template>
        </Column>
        <Column header="Título">
          <template #body="{ data }">
            <strong>{{ data.title || 'Sin título' }}</strong>
          </template>
        </Column>
        <Column header="Estado">
          <template #body="{ data }">
            <Tag
              :value="STATUS_LABELS[data.status] ?? data.status ?? 'Sin estado'"
              :severity="STATUS_SEVERITIES[data.status] ?? 'secondary'"
              rounded
            />
          </template>
        </Column>
        <Column header="Oraciones">
          <template #body="{ data }">
            <span class="test-number">{{ data.sentenceCount ?? '—' }}</span>
          </template>
        </Column>
        <Column header="Avance">
          <template #body="{ data }">
            <span class="test-progress">
              <strong>{{ data.completedCount ?? 0 }}</strong> / {{ data.assignedCount ?? 0 }}
              <small>completadas</small>
            </span>
          </template>
        </Column>
        <Column header="Creada">
          <template #body="{ data }">
            <span class="test-number">{{ formatDate(data.createdAt) }}</span>
          </template>
        </Column>
        <Column header="Acciones" frozen align-frozen="right">
          <template #body="{ data }">
            <Button
              label="Abrir"
              icon="pi pi-arrow-right"
              icon-pos="right"
              text
              size="small"
              @click="openTest(data.id)"
            />
          </template>
        </Column>
      </DataTable>
    </section>

    <CreateTestDialog
      v-model:visible="isCreateDialogVisible"
      :is-saving="testsStore.isMutating"
      :error-message="createErrorMessage"
      @submit="createTest"
    />
  </div>
</template>
