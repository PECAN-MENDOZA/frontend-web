<script setup>
import { computed, onMounted, ref } from 'vue'
import Button from 'primevue/button'
import Message from 'primevue/message'
import Skeleton from 'primevue/skeleton'
import Tag from 'primevue/tag'
import { useConfirm } from 'primevue/useconfirm'
import { useToast } from 'primevue/usetoast'
import PageHeader from '@/shared/components/PageHeader.vue'
import AccessCodeDialog from '@/features/research/components/AccessCodeDialog.vue'
import CreateStudyDialog from '@/features/research/components/CreateStudyDialog.vue'
import ParticipantDirectory from '@/features/research/components/ParticipantDirectory.vue'
import ProtocolEditor from '@/features/research/components/ProtocolEditor.vue'
import StudySelector from '@/features/research/components/StudySelector.vue'
import { useResearchStore } from '@/features/research/store/research.store'
import { StudyChangedError } from '@/features/research/utils/mutations'
import { studyStatusLabel } from '@/features/research/utils/study'

const STUDY_STATUS_SEVERITIES = { DRAFT: 'info', ACTIVE: 'success', CLOSED: 'secondary' }
const TOAST_LIFE_MS = 4000

const researchStore = useResearchStore()
const confirm = useConfirm()
const toast = useToast()
const isCreateDialogVisible = ref(false)
const createErrorMessage = ref('')
// El código en claro vive solo aquí, mientras el diálogo está abierto.
const issuedCredential = ref(null)
// Qué acción (y de qué fila) está en curso: solo ese botón muestra el spinner.
const pendingAction = ref(null)

const study = computed(() => researchStore.selectedStudy)
const isClosed = computed(() => study.value?.status === 'CLOSED')

onMounted(() => {
  if (!researchStore.studies.length) {
    researchStore.loadStudies()
  }
})

function openCreateStudy() {
  createErrorMessage.value = ''
  isCreateDialogVisible.value = true
}

async function createStudy(payload) {
  createErrorMessage.value = ''

  try {
    const created = await researchStore.addStudy(payload)

    isCreateDialogVisible.value = false
    notify('success', 'Estudio creado', `${created.code} está listo para definir su protocolo.`)
  } catch (error) {
    createErrorMessage.value = error.message
  }
}

function saveDraft(form) {
  return runPending({ kind: 'save' }, async () => {
    try {
      const protocol = await researchStore.saveProtocolDraft(form)

      notify('success', 'Borrador guardado', `Protocolo v${protocol.version} listo para activar.`)
    } catch (error) {
      notifyFailure(error, 'No pudimos guardar el borrador')
    }
  })
}

function activateProtocol(protocolId) {
  return runPending({ kind: 'activate' }, async () => {
    try {
      const protocol = await researchStore.activateStudyProtocol(protocolId)

      notify(
        'success',
        `Protocolo v${protocol.version} activado`,
        'El estudio ya acepta participantes.',
      )
    } catch (error) {
      notifyFailure(error, 'No pudimos activar el protocolo')
    }
  })
}

function addParticipant() {
  return runPending({ kind: 'add' }, async () => {
    try {
      const participant = await researchStore.addParticipant()

      notify(
        'success',
        'Participante añadido',
        `${participant.pseudonym} ya puede recibir un código.`,
      )
    } catch (error) {
      notifyFailure(error, 'No pudimos añadir el participante')
    }
  })
}

function generateCode(participant) {
  return runPending({ kind: 'generate', participantId: participant.id }, async () => {
    try {
      // El diálogo se abre en cuanto el POST resuelve; la recarga sigue en segundo plano.
      await researchStore.issueAccessCode(participant.id, revealCredential)
    } catch (error) {
      notifyFailure(error, `No pudimos generar el código de ${participant.pseudonym}`)
    }
  })
}

function revokeCode(participant, runId) {
  confirm.require({
    header: `Revocar código de ${participant.pseudonym}`,
    message: 'El código pendiente dejará de funcionar. Podrás generar otro después.',
    icon: 'pi pi-ban',
    acceptLabel: 'Revocar',
    rejectLabel: 'Cancelar',
    acceptProps: { severity: 'danger' },
    rejectProps: { severity: 'secondary', text: true },
    accept: () =>
      runPending({ kind: 'revoke', participantId: participant.id }, async () => {
        try {
          await researchStore.revokeParticipantCode(runId)
          notify(
            'success',
            'Código revocado',
            `${participant.pseudonym} ya no tiene código vigente.`,
          )
        } catch (error) {
          notifyFailure(error, 'No pudimos revocar el código')
        }
      }),
  })
}

function regenerateCode(participant, runId) {
  confirm.require({
    header: `Regenerar código de ${participant.pseudonym}`,
    message: 'Se revocará el código pendiente y se emitirá uno nuevo.',
    icon: 'pi pi-refresh',
    acceptLabel: 'Regenerar',
    rejectLabel: 'Cancelar',
    rejectProps: { severity: 'secondary', text: true },
    accept: () =>
      runPending({ kind: 'regenerate', participantId: participant.id }, async () => {
        try {
          await researchStore.reissueAccessCode(participant.id, runId, revealCredential)
        } catch (error) {
          notifyFailure(error, 'No pudimos regenerar el código')
        }
      }),
  })
}

function revealCredential(credential) {
  issuedCredential.value = credential
}

function closeCredential() {
  issuedCredential.value = null
}

async function runPending(action, operation) {
  pendingAction.value = action

  try {
    await operation()
  } finally {
    pendingAction.value = null
  }
}

// Cambiar de estudio durante una operación no es un fallo: el backend ya la aplicó.
function notifyFailure(error, summary) {
  if (error instanceof StudyChangedError) {
    notify('info', 'Estudio cambiado', error.message)
    return
  }

  notify('error', summary, error.message)
}

function notify(severity, summary, detail) {
  toast.add({ severity, summary, detail, life: TOAST_LIFE_MS })
}
</script>

<template>
  <div class="research-page">
    <PageHeader
      eyebrow="Panel de investigación"
      title="Estudio"
      description="Define el protocolo, añade participantes seudónimos y emite sus códigos de acceso."
    >
      <template #actions>
        <StudySelector
          v-if="researchStore.studies.length"
          :studies="researchStore.studies"
          :model-value="researchStore.selectedStudyId"
          :disabled="researchStore.isMutating"
          @update:model-value="researchStore.selectStudy"
        />
        <Button
          label="Nuevo estudio"
          icon="pi pi-plus"
          :disabled="researchStore.isMutating"
          @click="openCreateStudy"
        />
        <Button
          label="Actualizar"
          icon="pi pi-refresh"
          severity="secondary"
          outlined
          :loading="researchStore.isLoading"
          :disabled="!researchStore.selectedStudyId || researchStore.isMutating"
          @click="researchStore.refreshAll"
        />
      </template>
    </PageHeader>

    <template v-if="researchStore.isLoading && !researchStore.studies.length">
      <Skeleton height="14rem" border-radius="1.25rem" />
      <Skeleton height="18rem" border-radius="1.25rem" />
    </template>

    <div
      v-else-if="researchStore.error && !researchStore.studies.length"
      class="panel research-empty-state"
    >
      <i class="pi pi-exclamation-triangle research-empty-state__icon"></i>
      <h2>No pudimos cargar tus estudios</h2>
      <p>{{ researchStore.error }}</p>
      <Button label="Reintentar" icon="pi pi-refresh" @click="researchStore.loadStudies" />
    </div>

    <div v-else-if="!researchStore.studies.length" class="panel research-empty-state">
      <i class="pi pi-book research-empty-state__icon"></i>
      <h2>Aún no hay un estudio</h2>
      <p>Crea el primero para definir sus consignas y empezar a reunir participantes seudónimos.</p>
      <Button label="Nuevo estudio" icon="pi pi-plus" @click="openCreateStudy" />
    </div>

    <div v-else-if="!study" class="panel research-empty-state">
      <i class="pi pi-compass research-empty-state__icon"></i>
      <h2>Elige un estudio</h2>
      <p>Selecciona un estudio arriba para gestionar su protocolo y sus participantes.</p>
    </div>

    <template v-else>
      <Message v-if="researchStore.error" severity="error">
        {{ researchStore.error }}
      </Message>

      <section class="research-study-card" aria-label="Estudio seleccionado">
        <div>
          <span class="overline">{{ study.code }}</span>
          <h2>{{ study.title }}</h2>
        </div>
        <Tag
          :value="studyStatusLabel(study.status)"
          :severity="STUDY_STATUS_SEVERITIES[study.status] ?? 'secondary'"
          rounded
        />
      </section>

      <Message v-if="isClosed" severity="warn" :closable="false">
        Este estudio está cerrado: ya no admite participantes, códigos ni nuevas versiones del
        protocolo. Sus datos siguen disponibles para consulta.
      </Message>

      <ProtocolEditor
        :protocols="researchStore.protocols"
        :study="study"
        :is-loading="researchStore.isLoading"
        :is-busy="researchStore.isMutating"
        :pending-action="pendingAction"
        @save="saveDraft"
        @activate="activateProtocol"
      />

      <ParticipantDirectory
        :participants="researchStore.participants"
        :runs="researchStore.runs"
        :study="study"
        :is-loading="researchStore.isLoading"
        :is-busy="researchStore.isMutating"
        :pending-action="pendingAction"
        @add="addParticipant"
        @generate="generateCode"
        @revoke="revokeCode"
        @regenerate="regenerateCode"
      />
    </template>

    <CreateStudyDialog
      v-model:visible="isCreateDialogVisible"
      :is-saving="researchStore.isMutating"
      :error-message="createErrorMessage"
      @submit="createStudy"
    />

    <AccessCodeDialog :credential="issuedCredential" @close="closeCredential" />
  </div>
</template>
