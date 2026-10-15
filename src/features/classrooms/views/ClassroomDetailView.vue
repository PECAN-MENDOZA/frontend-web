<script setup>
import { computed, nextTick, onMounted, onUnmounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import Button from 'primevue/button'
import Column from 'primevue/column'
import DataTable from 'primevue/datatable'
import InputText from 'primevue/inputtext'
import Message from 'primevue/message'
import Skeleton from 'primevue/skeleton'
import { useConfirm } from 'primevue/useconfirm'
import CreateClassroomDialog from '@/features/classrooms/components/CreateClassroomDialog.vue'
import CreateStudentsDialog from '@/features/classrooms/components/CreateStudentsDialog.vue'
import CredentialsListDialog from '@/features/classrooms/components/CredentialsListDialog.vue'
import MoveStudentDialog from '@/features/classrooms/components/MoveStudentDialog.vue'
import { useClassroomsStore } from '@/features/classrooms/store/classrooms.store'
import { formatDeactivatedAt, formatLastAccess } from '@/features/classrooms/utils/classrooms'
import StudentCredentialDialog from '@/features/students/components/StudentCredentialDialog.vue'
import {
  deactivateConfirmation,
  pinResetConfirmation,
  reactivateConfirmation,
} from '@/features/students/utils/students'
import PageHeader from '@/shared/components/PageHeader.vue'

const route = useRoute()
const router = useRouter()
const confirm = useConfirm()
const classroomsStore = useClassroomsStore()

const classroomId = computed(() => route.params.classroomId)
const classroom = computed(() => classroomsStore.selectedClassroom)
const studentCountLabel = computed(() => {
  const count = classroomsStore.students.length

  return count === 1 ? '1 estudiante activo' : `${count} estudiantes activos`
})
// Si la carga falla, la cabecera no se queda en "Cargando…" (el aviso de error ya lo explica).
const headerDescription = computed(() => {
  if (classroom.value) return studentCountLabel.value

  return classroomsStore.errorMessage ? '' : 'Cargando el salón…'
})
const inactiveCount = computed(() => classroomsStore.inactiveStudents.length)

const isRenameDialogVisible = ref(false)
const isCreateDialogVisible = ref(false)
const createMode = ref('named')
const isCredentialsDialogVisible = ref(false)
// Tras crear se muestra solo el lote nuevo; "Imprimir credenciales" muestra todo lo de esta visita.
const credentialsScope = ref('created')
const credentialsToShow = computed(() =>
  credentialsScope.value === 'session'
    ? classroomsStore.sessionCredentials
    : classroomsStore.createdCredentials,
)
const isMoveDialogVisible = ref(false)
const movingStudent = ref(null)
// Qué acción (y de qué fila) está en curso: solo ese botón muestra el spinner.
const pendingAction = ref(null)
// Edición en línea del nombre real: una fila a la vez.
// Edición en línea de una celda: el nombre real o las notas del docente (una a la vez).
const editing = reactive({ studentId: null, field: 'name', name: '' })
const editInput = ref(null)

const isAnyDialogVisible = computed(
  () =>
    isRenameDialogVisible.value ||
    isCreateDialogVisible.value ||
    isCredentialsDialogVisible.value ||
    isMoveDialogVisible.value,
)

onMounted(() => classroomsStore.loadClassroom(classroomId.value))
watch(classroomId, (id) => {
  if (id) {
    classroomsStore.clearSelectedClassroom()
    classroomsStore.loadClassroom(id)
  }
})
// Los PIN creados no deben sobrevivir a la salida de la vista.
onUnmounted(() => classroomsStore.clearSelectedClassroom())

function openRenameClassroom() {
  classroomsStore.mutationErrorMessage = ''
  isRenameDialogVisible.value = true
}

async function renameClassroom(name) {
  if (await classroomsStore.renameClassroom(classroomId.value, name)) {
    isRenameDialogVisible.value = false
  }
}

function openCreateStudents(mode) {
  classroomsStore.mutationErrorMessage = ''
  createMode.value = mode
  isCreateDialogVisible.value = true
}

async function createStudents(body) {
  if (await classroomsStore.createStudents(classroomId.value, body)) {
    isCreateDialogVisible.value = false
    credentialsScope.value = 'created'
    isCredentialsDialogVisible.value = true
  }
}

function openSessionCredentials() {
  credentialsScope.value = 'session'
  isCredentialsDialogVisible.value = true
}

function isPending(kind, studentId) {
  return pendingAction.value?.kind === kind && pendingAction.value?.studentId === studentId
}

async function runPending(kind, studentId, action) {
  pendingAction.value = { kind, studentId }

  try {
    return await action()
  } finally {
    pendingAction.value = null
  }
}

async function startEdit(student, field = 'name') {
  editing.studentId = student.studentId
  editing.field = field
  editing.name = (field === 'notes' ? student.notes : student.studentRealName) ?? ''
  // El campo se monta al cambiar la fila a modo edición; el foco se pide una vez montado.
  await nextTick()
  editInput.value?.$el?.focus()
}

function cancelEdit() {
  editing.studentId = null
  editing.field = 'name'
  editing.name = ''
}

async function saveEdit(student) {
  const wasSaved = await runPending('edit', student.studentId, () =>
    classroomsStore.updateStudent(student.studentId, {
      studentRealName:
        editing.field === 'name' ? editing.name.trim() : (student.studentRealName ?? ''),
      notes: editing.field === 'notes' ? editing.name.trim() : (student.notes ?? ''),
    }),
  )

  if (wasSaved) cancelEdit()
}

// Opciones comunes de las confirmaciones de esta vista (acción destructiva en rojo).
const CONFIRM_DEFAULTS = {
  rejectLabel: 'Cancelar',
  acceptProps: { severity: 'danger' },
  rejectProps: { severity: 'secondary', text: true },
}

function resetPin(student) {
  confirm.require({
    ...CONFIRM_DEFAULTS,
    ...pinResetConfirmation(student.studentRealName, student.studentUsername),
    icon: 'pi pi-key',
    accept: () =>
      runPending('reset', student.studentId, () =>
        classroomsStore.resetStudentPin(student.studentId),
      ),
  })
}

function openMoveStudent(student) {
  classroomsStore.mutationErrorMessage = ''
  movingStudent.value = student
  isMoveDialogVisible.value = true
}

async function moveStudent(targetClassroomId) {
  if (await classroomsStore.moveStudent(movingStudent.value.studentId, targetClassroomId)) {
    isMoveDialogVisible.value = false
    movingStudent.value = null
  }
}

function confirmDeactivate(student) {
  confirm.require({
    ...CONFIRM_DEFAULTS,
    ...deactivateConfirmation(student.studentRealName, student.studentUsername),
    icon: 'pi pi-user-minus',
    accept: () =>
      runPending('deactivate', student.studentId, () =>
        classroomsStore.deactivateStudent(student.studentId),
      ),
  })
}

function confirmReactivate(student) {
  confirm.require({
    ...CONFIRM_DEFAULTS,
    ...reactivateConfirmation(student.studentRealName, student.studentUsername),
    icon: 'pi pi-user-plus',
    acceptProps: {},
    accept: () =>
      runPending('reactivate', student.studentId, () =>
        classroomsStore.reactivateStudent(student.studentId),
      ),
  })
}

function openStudent(studentId) {
  router.push({ name: 'student-detail', params: { studentId } })
}
</script>

<template>
  <div class="classroom-detail-page">
    <template v-if="classroomsStore.isNotFound">
      <Message severity="info" :closable="false">No encontramos este salón.</Message>
      <div>
        <Button
          label="Volver a salones"
          icon="pi pi-arrow-left"
          severity="secondary"
          text
          @click="router.push({ name: 'classrooms' })"
        />
      </div>
    </template>

    <template v-else>
      <PageHeader
        eyebrow="Salón"
        :title="classroom?.name ?? 'Salón'"
        :description="headerDescription"
      >
        <template #actions>
          <Button
            label="Salones"
            icon="pi pi-arrow-left"
            severity="secondary"
            text
            @click="router.push({ name: 'classrooms' })"
          />
          <Button
            v-if="classroomsStore.sessionCredentials.length"
            label="Imprimir credenciales"
            icon="pi pi-print"
            severity="secondary"
            outlined
            @click="openSessionCredentials"
          />
          <Button
            label="Crear varios"
            icon="pi pi-users"
            severity="secondary"
            outlined
            :disabled="!classroom || Boolean(classroom.archivedAt)"
            @click="openCreateStudents('count')"
          />
          <Button
            label="Nuevo estudiante"
            icon="pi pi-user-plus"
            :disabled="!classroom || Boolean(classroom.archivedAt)"
            @click="openCreateStudents('named')"
          />
        </template>
      </PageHeader>

      <Message v-if="classroomsStore.errorMessage" severity="error">
        {{ classroomsStore.errorMessage }}
      </Message>
      <Message v-if="classroomsStore.mutationErrorMessage && !isAnyDialogVisible" severity="error">
        {{ classroomsStore.mutationErrorMessage }}
      </Message>
      <Message v-if="classroom?.archivedAt" severity="warn" :closable="false">
        Este salón está archivado. Restáuralo desde la lista de salones para crear cuentas.
      </Message>

      <section class="panel directory-panel">
        <div class="directory-panel__toolbar">
          <div>
            <p class="overline">Estudiantes del salón</p>
            <h2>Cuentas y accesos</h2>
          </div>
          <Button
            icon="pi pi-pencil"
            label="Renombrar"
            severity="secondary"
            text
            size="small"
            :disabled="!classroom"
            @click="openRenameClassroom"
          />
        </div>

        <div
          v-if="classroomsStore.isLoading && !classroomsStore.students.length"
          class="directory-loading"
        >
          <Skeleton v-for="item in 6" :key="item" height="3.6rem" />
        </div>
        <DataTable
          v-else
          :value="classroomsStore.students"
          class="classroom-students-table" scrollable
          data-key="studentId"
          paginator
          :rows="15"
          :rows-per-page-options="[15, 40]"
          table-style="min-width: 58rem"
        >
          <template #empty>
            <p class="table-empty">
              Este salón aún no tiene estudiantes. Crea la primera cuenta con «Nuevo estudiante».
            </p>
          </template>
          <Column header="Alias">
            <template #body="{ data }">
              <code class="classroom-username">{{ data.studentUsername }}</code>
            </template>
          </Column>
          <Column header="Nombre real">
            <template #body="{ data }">
              <form
                v-if="editing.studentId === data.studentId && editing.field === 'name'"
                class="inline-edit"
                @submit.prevent="saveEdit(data)"
              >
                <InputText
                  ref="editInput"
                  v-model="editing.name"
                  size="small"
                  :maxlength="160"
                  aria-label="Nombre real del estudiante"
                  @keydown.esc.prevent="cancelEdit"
                />
                <Button
                  type="submit"
                  icon="pi pi-check"
                  size="small"
                  text
                  rounded
                  aria-label="Guardar nombre"
                  :loading="isPending('edit', data.studentId)"
                />
                <Button
                  type="button"
                  icon="pi pi-times"
                  size="small"
                  severity="secondary"
                  text
                  rounded
                  aria-label="Cancelar edición"
                  :disabled="isPending('edit', data.studentId)"
                  @click="cancelEdit"
                />
              </form>
              <div v-else class="inline-edit">
                <span :class="{ 'classroom-name--empty': !data.studentRealName }">
                  {{ data.studentRealName || 'Sin nombre' }}
                </span>
                <Button
                  icon="pi pi-pencil"
                  size="small"
                  severity="secondary"
                  text
                  rounded
                  :aria-label="`Editar nombre real de ${data.studentUsername}`"
                  @click="startEdit(data)"
                />
              </div>
            </template>
          </Column>
          <Column header="Notas">
            <template #body="{ data }">
              <form
                v-if="editing.studentId === data.studentId && editing.field === 'notes'"
                class="inline-edit"
                @submit.prevent="saveEdit(data)"
              >
                <InputText
                  ref="editInput"
                  v-model="editing.name"
                  size="small"
                  :maxlength="2000"
                  aria-label="Notas del docente"
                  @keydown.esc.prevent="cancelEdit"
                />
                <Button
                  type="submit"
                  icon="pi pi-check"
                  size="small"
                  text
                  rounded
                  aria-label="Guardar notas"
                  :loading="isPending('edit', data.studentId)"
                />
                <Button
                  type="button"
                  icon="pi pi-times"
                  size="small"
                  severity="secondary"
                  text
                  rounded
                  aria-label="Cancelar edición"
                  :disabled="isPending('edit', data.studentId)"
                  @click="cancelEdit"
                />
              </form>
              <div v-else class="inline-edit">
                <span class="classroom-notes">{{ data.notes || '—' }}</span>
                <Button
                  icon="pi pi-pencil"
                  size="small"
                  severity="secondary"
                  text
                  rounded
                  :aria-label="`Editar notas de ${data.studentUsername}`"
                  @click="startEdit(data, 'notes')"
                />
              </div>
            </template>
          </Column>
          <Column header="Última actividad">
            <template #body="{ data }">
              {{ formatLastAccess(data.lastAccessAt) }}
            </template>
          </Column>
          <Column header="Acciones" frozen align-frozen="right">
            <template #body="{ data }">
              <div class="row-actions">
                <Button
                  v-tooltip.top="'Reiniciar PIN'"
                  icon="pi pi-key"
                  severity="secondary"
                  text
                  rounded
                  aria-label="Reiniciar PIN"
                  :loading="isPending('reset', data.studentId)"
                  @click="resetPin(data)"
                />
                <Button
                  v-tooltip.top="'Mover de salón'"
                  icon="pi pi-arrow-right-arrow-left"
                  severity="secondary"
                  text
                  rounded
                  aria-label="Mover de salón"
                  @click="openMoveStudent(data)"
                />
                <Button
                  v-tooltip.top="'Dar de baja'"
                  icon="pi pi-user-minus"
                  severity="danger"
                  text
                  rounded
                  aria-label="Dar de baja"
                  :loading="isPending('deactivate', data.studentId)"
                  @click="confirmDeactivate(data)"
                />
                <Button
                  label="Ver ficha"
                  icon="pi pi-arrow-right"
                  icon-pos="right"
                  text
                  size="small"
                  @click="openStudent(data.studentId)"
                />
              </div>
            </template>
          </Column>
        </DataTable>
      </section>

      <details v-if="inactiveCount" class="panel inactive-students">
        <summary class="inactive-students__summary">
          <i class="pi pi-chevron-right" aria-hidden="true"></i>
          <span>Dados de baja ({{ inactiveCount }})</span>
        </summary>
        <DataTable
          :value="classroomsStore.inactiveStudents"
          class="inactive-students-table"
          scrollable
          data-key="studentId"
          table-style="min-width: 40rem"
        >
          <Column header="Alias">
            <template #body="{ data }">
              <code class="classroom-username">{{ data.studentUsername }}</code>
            </template>
          </Column>
          <Column header="Nombre real">
            <template #body="{ data }">
              <span :class="{ 'classroom-name--empty': !data.studentRealName }">
                {{ data.studentRealName || 'Sin nombre' }}
              </span>
            </template>
          </Column>
          <Column header="Fecha de baja">
            <template #body="{ data }">
              {{ formatDeactivatedAt(data.deactivatedAt) }}
            </template>
          </Column>
          <Column header="Acciones" frozen align-frozen="right">
            <template #body="{ data }">
              <Button
                label="Reactivar"
                icon="pi pi-user-plus"
                severity="secondary"
                text
                size="small"
                :loading="isPending('reactivate', data.studentId)"
                :disabled="classroomsStore.isMutating && !isPending('reactivate', data.studentId)"
                @click="confirmReactivate(data)"
              />
            </template>
          </Column>
        </DataTable>
      </details>

      <CreateClassroomDialog
        v-model:visible="isRenameDialogVisible"
        :classroom="classroom"
        :is-saving="classroomsStore.isMutating"
        :error-message="classroomsStore.mutationErrorMessage"
        @submit="renameClassroom"
      />

      <CreateStudentsDialog
        v-model:visible="isCreateDialogVisible"
        :initial-mode="createMode"
        :is-saving="classroomsStore.isMutating"
        :error-message="classroomsStore.mutationErrorMessage"
        @submit="createStudents"
      />

      <CredentialsListDialog
        v-model:visible="isCredentialsDialogVisible"
        :credentials="credentialsToShow"
        :classroom-name="classroom?.name ?? ''"
      />

      <MoveStudentDialog
        v-model:visible="isMoveDialogVisible"
        :student="movingStudent"
        :classrooms="classroomsStore.classrooms"
        :current-classroom-id="classroomId"
        :is-saving="classroomsStore.isMutating"
        :error-message="classroomsStore.mutationErrorMessage"
        @submit="moveStudent"
      />

      <StudentCredentialDialog
        :credential="classroomsStore.resetPinCredentials"
        header="Nuevo PIN"
        intro="Entrega el nuevo PIN al estudiante para que vuelva a ingresar desde el teclado."
        action-label="Ya entregué el PIN"
        @close="classroomsStore.clearResetPinCredentials"
      />
    </template>
  </div>
</template>
