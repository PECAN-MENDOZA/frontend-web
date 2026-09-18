<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import Message from 'primevue/message'
import Skeleton from 'primevue/skeleton'
import Tag from 'primevue/tag'
import { useConfirm } from 'primevue/useconfirm'
import AssignTestDialog from '@/features/tests/components/AssignTestDialog.vue'
import AttemptsTable from '@/features/tests/components/AttemptsTable.vue'
import ReasonDialog from '@/features/tests/components/ReasonDialog.vue'
import SentenceEditorTable from '@/features/tests/components/SentenceEditorTable.vue'
import { useResearchStore } from '@/features/research/store/research.store'
import { useTestsStore } from '@/features/tests/store/tests.store'
import { hasAttemptsInProgress } from '@/features/tests/utils/attempts'
import {
  STATUS_LABELS,
  canActivate,
  sentenceErrors,
  testFormErrors,
} from '@/features/tests/utils/sentences'

const STATUS_SEVERITIES = { DRAFT: 'secondary', ACTIVE: 'success', CLOSED: 'contrast' }

const route = useRoute()
const router = useRouter()
const confirm = useConfirm()
const testsStore = useTestsStore()
const researchStore = useResearchStore()
const isAssignDialogVisible = ref(false)
const assignErrorMessage = ref('')
const isReasonDialogVisible = ref(false)
const exclusionTarget = ref(null)
const exclusionErrorMessage = ref('')
const pendingAction = ref(null)
const actionMessage = ref('')
const actionSeverity = ref('success')
const draftTitle = ref('')

const testId = computed(() => String(route.params.testId ?? ''))
const test = computed(() => testsStore.selectedTest)
const isDraft = computed(() => test.value?.status === 'DRAFT')
const isActive = computed(() => test.value?.status === 'ACTIVE')
const isClosed = computed(() => test.value?.status === 'CLOSED')
const hasInProgress = computed(() => hasAttemptsInProgress(testsStore.assignments))
const titleError = computed(
  () => testFormErrors({ code: test.value?.code, title: draftTitle.value }).title ?? '',
)
const hasSentenceErrors = computed(() => sentenceErrors(testsStore.draftSentences).length > 0)
const canSave = computed(() => isDraft.value && !titleError.value && !hasSentenceErrors.value)
const canActivateCurrent = computed(
  () => canSave.value && canActivate(test.value, testsStore.draftSentences),
)

onMounted(loadPage)
onUnmounted(() => testsStore.stopAssignmentsPolling())

watch(testId, loadPage)
watch(
  () => test.value?.title,
  (title) => {
    draftTitle.value = title ?? ''
  },
  { immediate: true },
)
watch(hasInProgress, (isInProgress) => {
  if (isInProgress) testsStore.startAssignmentsPolling(testId.value)
  else testsStore.stopAssignmentsPolling()
})

async function loadPage() {
  testsStore.stopAssignmentsPolling()
  actionMessage.value = ''
  const loaded = await testsStore.loadTest(testId.value)

  if (loaded && test.value?.status !== 'DRAFT') await loadAssignmentData()
}

async function loadAssignmentData() {
  await Promise.all([
    testsStore.loadAssignments(testId.value),
    researchStore.loadClassroomDirectory(),
  ])

  if (hasInProgress.value) testsStore.startAssignmentsPolling(testId.value)
}

function showMutationResult(wasSuccessful) {
  actionMessage.value = testsStore.mutationMessage
  actionSeverity.value = wasSuccessful
    ? testsStore.mutationMessage.includes('No pudimos actualizar')
      ? 'warn'
      : 'success'
    : 'error'
}

async function runAction(kind, action) {
  pendingAction.value = kind
  actionMessage.value = ''

  try {
    const wasSuccessful = await action()
    showMutationResult(wasSuccessful)
    return wasSuccessful
  } finally {
    pendingAction.value = null
  }
}

function saveTest() {
  if (!canSave.value) return Promise.resolve(false)
  return runAction('save', () => testsStore.saveTest(testId.value, draftTitle.value))
}

function confirmActivation() {
  if (!canActivateCurrent.value) return

  confirm.require({
    header: 'Activar prueba',
    message: 'Las oraciones quedan congeladas. ¿Activar?',
    icon: 'pi pi-lock',
    acceptLabel: 'Activar',
    rejectLabel: 'Cancelar',
    rejectProps: { severity: 'secondary', text: true },
    accept: activateTest,
  })
}

async function activateTest() {
  if (!(await saveTest())) return
  if (await runAction('activate', () => testsStore.activateTest(testId.value))) {
    await loadAssignmentData()
  }
}

function confirmClose() {
  confirm.require({
    header: 'Cerrar prueba',
    message: 'Los alumnos ya no podrán iniciar nuevos intentos. ¿Cerrar la prueba?',
    icon: 'pi pi-lock',
    acceptLabel: 'Cerrar prueba',
    rejectLabel: 'Cancelar',
    acceptProps: { severity: 'danger' },
    rejectProps: { severity: 'secondary', text: true },
    accept: () => runAction('close', () => testsStore.closeTest(testId.value)),
  })
}

function openAssignment() {
  assignErrorMessage.value = ''
  isAssignDialogVisible.value = true
  researchStore.loadClassroomDirectory()
}

async function assignTest(payload) {
  pendingAction.value = 'assign'
  assignErrorMessage.value = ''

  try {
    const wasSuccessful = payload.classroomId
      ? await testsStore.assignByClassroom(testId.value, payload.classroomId)
      : await testsStore.assignStudents(testId.value, payload.studentIds)

    if (wasSuccessful) {
      showMutationResult(true)
      isAssignDialogVisible.value = false
    } else {
      assignErrorMessage.value = testsStore.mutationMessage
    }
  } finally {
    pendingAction.value = null
  }
}

function viewAttempt(row) {
  router.push({
    name: 'research-attempt',
    params: { testId: testId.value, attemptId: row.attemptId },
  })
}

function openExclusion(row) {
  exclusionTarget.value = row
  exclusionErrorMessage.value = ''
  isReasonDialogVisible.value = true
}

async function excludeAttempt(reason) {
  const target = exclusionTarget.value
  if (!target?.attemptId) return

  pendingAction.value = target.attemptId
  exclusionErrorMessage.value = ''

  try {
    const wasSuccessful = await testsStore.excludeAttempt(testId.value, target.attemptId, reason)
    if (wasSuccessful) {
      showMutationResult(true)
      isReasonDialogVisible.value = false
      exclusionTarget.value = null
    } else {
      exclusionErrorMessage.value = testsStore.mutationMessage
    }
  } finally {
    pendingAction.value = null
  }
}

function openResults() {
  router.push({ name: 'research-results', params: { testId: testId.value } })
}
</script>

<template>
  <div class="research-page test-editor-page">
    <div v-if="testsStore.isLoading && !test" class="test-editor-loading">
      <Skeleton height="6.5rem" />
      <Skeleton height="22rem" />
    </div>

    <template v-else-if="test">
      <div class="page-header test-editor-header">
        <div>
          <div class="test-editor-header__context">
            <code class="test-code">{{ test.code || 'Sin código' }}</code>
            <Tag
              :value="STATUS_LABELS[test.status] ?? test.status ?? 'Sin estado'"
              :severity="STATUS_SEVERITIES[test.status] ?? 'secondary'"
              rounded
            />
          </div>
          <h1>
            <InputText
              v-if="isDraft"
              v-model="draftTitle"
              class="test-title-input"
              maxlength="120"
              aria-label="Título de la prueba"
              :invalid="Boolean(titleError)"
            />
            <span v-else>{{ test.title || 'Prueba sin título' }}</span>
          </h1>
          <small v-if="isDraft && titleError" class="research-form__error">{{ titleError }}</small>
          <p>{{ test.notes || 'Organiza las oraciones y revisa su modalidad antes de activar.' }}</p>
        </div>
        <div class="page-header__actions">
          <Button
            label="Pruebas"
            icon="pi pi-arrow-left"
            severity="secondary"
            text
            @click="router.push({ name: 'research-tests' })"
          />
          <template v-if="isDraft">
            <Button
              label="Guardar"
              icon="pi pi-save"
              severity="secondary"
              outlined
              :disabled="!canSave"
              :loading="pendingAction === 'save'"
              @click="saveTest"
            />
            <Button
              label="Activar"
              icon="pi pi-lock-open"
              :disabled="!canActivateCurrent"
              :loading="pendingAction === 'activate'"
              @click="confirmActivation"
            />
          </template>
          <template v-else-if="isActive">
            <Button label="Asignar" icon="pi pi-send" @click="openAssignment" />
            <Button
              label="Cerrar prueba"
              icon="pi pi-lock"
              severity="secondary"
              outlined
              :loading="pendingAction === 'close'"
              @click="confirmClose"
            />
            <Button
              label="Resultados"
              icon="pi pi-chart-line"
              severity="secondary"
              text
              @click="openResults"
            />
          </template>
          <Button
            v-else-if="isClosed"
            label="Resultados"
            icon="pi pi-chart-line"
            @click="openResults"
          />
        </div>
      </div>

      <Message v-if="testsStore.errorMessage" severity="error" :closable="false">
        <div class="research-refresh-warning">
          <span>{{ testsStore.errorMessage }}</span>
          <Button
            label="Reintentar"
            icon="pi pi-refresh"
            severity="danger"
            text
            size="small"
            @click="loadPage"
          />
        </div>
      </Message>
      <Message v-if="actionMessage" :severity="actionSeverity" :closable="false">
        {{ actionMessage }}
      </Message>

      <section class="panel sentence-panel">
        <div class="directory-panel__toolbar">
          <div>
            <p class="overline">Secuencia de aplicación</p>
            <h2>{{ isDraft ? 'Editor de oraciones' : 'Oraciones congeladas' }}</h2>
          </div>
          <span v-if="!isDraft" class="sentence-panel__lock">
            <i class="pi pi-lock" aria-hidden="true"></i>
            Solo lectura
          </span>
        </div>
        <SentenceEditorTable
          v-model:sentences="testsStore.draftSentences"
          :readonly="!isDraft"
        />
      </section>

      <section v-if="!isDraft" class="panel directory-panel assignment-panel">
        <div class="directory-panel__toolbar">
          <div>
            <p class="overline">Cohorte de aplicación</p>
            <h2>Asignación</h2>
          </div>
          <div class="assignment-panel__actions">
            <Tag
              v-if="hasInProgress"
              value="Actualizando en vivo"
              icon="pi pi-spin pi-spinner"
              severity="info"
              rounded
            />
            <Button
              v-if="isActive"
              label="Asignar"
              icon="pi pi-send"
              severity="secondary"
              outlined
              @click="openAssignment"
            />
            <Button
              icon="pi pi-refresh"
              severity="secondary"
              text
              rounded
              aria-label="Actualizar asignaciones"
              :loading="testsStore.isLoading"
              @click="testsStore.loadAssignments(testId)"
            />
          </div>
        </div>

        <div
          v-if="testsStore.isLoading && !testsStore.assignments.length"
          class="directory-loading"
        >
          <Skeleton v-for="item in 5" :key="item" height="3.6rem" />
        </div>
        <AttemptsTable
          v-else
          :rows="testsStore.assignments"
          :classrooms="researchStore.classroomDirectory"
          :pending-attempt-id="typeof pendingAction === 'string' ? pendingAction : null"
          @view="viewAttempt"
          @exclude="openExclusion"
        />
      </section>

      <AssignTestDialog
        v-model:visible="isAssignDialogVisible"
        :classrooms="researchStore.classroomDirectory"
        :is-loading="researchStore.isClassroomDirectoryLoading"
        :is-saving="pendingAction === 'assign'"
        :directory-error="researchStore.classroomDirectoryError"
        :error-message="assignErrorMessage"
        @retry="researchStore.loadClassroomDirectory"
        @submit="assignTest"
      />

      <ReasonDialog
        v-model:visible="isReasonDialogVisible"
        :username="exclusionTarget?.studentUsername ?? ''"
        :is-saving="pendingAction === exclusionTarget?.attemptId"
        :error-message="exclusionErrorMessage"
        @submit="excludeAttempt"
      />
    </template>

    <section v-else class="panel research-empty-state">
      <span class="research-empty-state__icon">
        <i class="pi pi-exclamation-circle" aria-hidden="true"></i>
      </span>
      <h2>No pudimos mostrar esta prueba.</h2>
      <p>Puede que ya no exista o que tu cuenta no tenga permiso para verla.</p>
      <div class="row-actions">
        <Button label="Volver a pruebas" severity="secondary" text @click="router.push({ name: 'research-tests' })" />
        <Button label="Reintentar" icon="pi pi-refresh" @click="loadPage" />
      </div>
    </section>
  </div>
</template>
