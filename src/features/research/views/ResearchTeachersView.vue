<script setup>
import { computed, onMounted, ref } from 'vue'
import Button from 'primevue/button'
import Column from 'primevue/column'
import DataTable from 'primevue/datatable'
import Dialog from 'primevue/dialog'
import Message from 'primevue/message'
import Skeleton from 'primevue/skeleton'
import Tag from 'primevue/tag'
import CreateTeacherDialog from '@/features/research/components/CreateTeacherDialog.vue'
import { useResearchStore } from '@/features/research/store/research.store'
import { copyText } from '@/features/research/utils/clipboard'
import { teacherStatusLabel, temporaryPasswordNotice } from '@/features/research/utils/teachers'
import PageHeader from '@/shared/components/PageHeader.vue'

const TEACHER_STATUS_SEVERITIES = { 'Contraseña temporal': 'warn', Activo: 'success' }

const researchStore = useResearchStore()
const isCreateDialogVisible = ref(false)
const createErrorMessage = ref('')
// Docente cuya contraseña se está reiniciando: solo ese botón muestra el spinner.
const pendingTeacherId = ref(null)
const resetErrorMessage = ref('')
const copyStatus = ref('')

const passwordDialogTeacher = computed(() => researchStore.temporaryPassword?.teacher ?? null)
const passwordDialogNotice = computed(() => {
  const state = researchStore.temporaryPassword

  return state ? temporaryPasswordNotice(state.teacher, state.password) : ''
})

onMounted(() => {
  researchStore.loadTeachers()
  researchStore.loadClassroomDirectory()
})

function openCreateTeacher() {
  createErrorMessage.value = ''
  isCreateDialogVisible.value = true
}

async function createTeacher(payload) {
  createErrorMessage.value = ''

  try {
    await researchStore.createTeacher(payload)
    isCreateDialogVisible.value = false
  } catch (error) {
    createErrorMessage.value = error.message
  }
}

async function resetPassword(teacher) {
  resetErrorMessage.value = ''
  pendingTeacherId.value = teacher.id

  try {
    await researchStore.resetTeacherPassword(teacher.id)
  } catch (error) {
    resetErrorMessage.value = error.message
  } finally {
    pendingTeacherId.value = null
  }
}

async function copyNotice() {
  const wasCopied = await copyText(passwordDialogNotice.value)

  copyStatus.value = wasCopied ? 'Copiado' : 'No se pudo copiar'
  window.setTimeout(() => {
    copyStatus.value = ''
  }, 1800)
}

function closePasswordDialog() {
  copyStatus.value = ''
  researchStore.clearTemporaryPassword()
}
</script>

<template>
  <div class="research-page">
    <PageHeader
      eyebrow="Cuentas"
      title="Docentes"
      description="Crea las cuentas de los docentes. Cada docente crea sus salones y alumnos."
    >
      <template #actions>
        <Button label="Nuevo docente" icon="pi pi-plus" @click="openCreateTeacher" />
        <Button
          label="Actualizar"
          icon="pi pi-refresh"
          severity="secondary"
          outlined
          :loading="researchStore.isTeachersLoading"
          @click="researchStore.loadTeachers"
        />
      </template>
    </PageHeader>

    <Message v-if="researchStore.teachersError" severity="error">
      {{ researchStore.teachersError }}
    </Message>
    <Message v-if="resetErrorMessage" severity="error">
      {{ resetErrorMessage }}
    </Message>

    <section class="panel directory-panel">
      <div class="directory-panel__toolbar">
        <div>
          <p class="overline">Cuentas creadas</p>
          <h2>Docentes del estudio</h2>
        </div>
      </div>

      <div
        v-if="researchStore.isTeachersLoading && !researchStore.teachers.length"
        class="directory-loading"
      >
        <Skeleton v-for="item in 4" :key="item" height="3.6rem" />
      </div>
      <DataTable v-else :value="researchStore.teachers" class="teachers-table" table-style="min-width: 48rem">
        <template #empty>
          <p class="table-empty">
            Aún no hay docentes. Crea la primera cuenta para que empiece a registrar salones.
          </p>
        </template>
        <Column field="username" header="Usuario" />
        <Column field="email" header="Correo" />
        <Column field="institution" header="Institución" />
        <Column field="classroomCount" header="Salones" />
        <Column field="studentCount" header="Alumnos" />
        <Column header="Estado">
          <template #body="{ data }">
            <Tag
              :value="teacherStatusLabel(data)"
              :severity="TEACHER_STATUS_SEVERITIES[teacherStatusLabel(data)] ?? 'secondary'"
              rounded
            />
          </template>
        </Column>
        <Column header="Acciones">
          <template #body="{ data }">
            <Button
              label="Reiniciar contraseña"
              icon="pi pi-key"
              severity="secondary"
              text
              size="small"
              :loading="pendingTeacherId === data.id"
              :disabled="researchStore.isMutating && pendingTeacherId !== data.id"
              @click="resetPassword(data)"
            />
          </template>
        </Column>
      </DataTable>
    </section>

    <Message v-if="researchStore.classroomDirectoryError" severity="error">
      {{ researchStore.classroomDirectoryError }}
    </Message>

    <section class="panel directory-panel">
      <div class="directory-panel__toolbar">
        <div>
          <p class="overline">Solo lectura</p>
          <h2>Salones</h2>
          <p>Directorio de todos los salones y sus usernames, para asignar las pruebas.</p>
        </div>
      </div>

      <div
        v-if="researchStore.isClassroomDirectoryLoading && !researchStore.classroomDirectory.length"
        class="directory-loading"
      >
        <Skeleton v-for="item in 3" :key="item" height="3.6rem" />
      </div>
      <DataTable
        v-else
        :value="researchStore.classroomDirectory"
        class="classroom-directory-table"
        table-style="min-width: 48rem"
      >
        <template #empty>
          <p class="table-empty">Todavía no hay salones creados por ningún docente.</p>
        </template>
        <Column field="teacherUsername" header="Docente" />
        <Column header="Salón">
          <template #body="{ data }">
            <div class="classroom-cell">
              <strong>{{ data.name }}</strong>
              <Tag v-if="data.archived" value="Archivado" severity="secondary" rounded />
            </div>
          </template>
        </Column>
        <Column header="Alumnos">
          <template #body="{ data }">
            {{ data.students.length }}
          </template>
        </Column>
        <Column header="Estudiantes">
          <template #body="{ data }">
            <div class="classroom-directory-students">
              <Tag
                v-for="student in data.students"
                :key="student.studentId"
                :value="student.username"
                severity="secondary"
              />
              <span v-if="!data.students.length">Sin alumnos</span>
            </div>
          </template>
        </Column>
      </DataTable>
    </section>

    <CreateTeacherDialog
      v-model:visible="isCreateDialogVisible"
      :is-saving="researchStore.isMutating"
      :error-message="createErrorMessage"
      @submit="createTeacher"
    />

    <Dialog
      :visible="Boolean(researchStore.temporaryPassword)"
      modal
      :closable="false"
      header="Contraseña temporal"
      class="student-credentials-dialog"
      @update:visible="closePasswordDialog"
    >
      <div v-if="passwordDialogTeacher" class="credential-reveal">
        <div class="credential-reveal__heading">
          <Tag value="Entrega única" severity="warn" />
          <h3>La cuenta de {{ passwordDialogTeacher.username }} está lista.</h3>
          <p>Entrega esta contraseña temporal al docente para su primer ingreso.</p>
        </div>

        <Message severity="warn" :closable="false"> Solo se muestra una vez. </Message>

        <pre class="credentials-sheet">{{ passwordDialogNotice }}</pre>
      </div>

      <template #footer>
        <span v-if="copyStatus" class="credentials-copy-status" role="status">{{ copyStatus }}</span>
        <Button label="Copiar" icon="pi pi-copy" severity="secondary" outlined @click="copyNotice" />
        <Button label="Listo" icon="pi pi-check" @click="closePasswordDialog" />
      </template>
    </Dialog>
  </div>
</template>
