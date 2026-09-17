<script setup>
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import Button from 'primevue/button'
import Column from 'primevue/column'
import DataTable from 'primevue/datatable'
import Message from 'primevue/message'
import Skeleton from 'primevue/skeleton'
import Tag from 'primevue/tag'
import CreateClassroomDialog from '@/features/classrooms/components/CreateClassroomDialog.vue'
import { useClassroomsStore } from '@/features/classrooms/store/classrooms.store'
import PageHeader from '@/shared/components/PageHeader.vue'

const router = useRouter()
const classroomsStore = useClassroomsStore()
const isCreateDialogVisible = ref(false)
// Qué salón está archivándose/restaurándose: solo ese botón muestra el spinner.
const pendingClassroomId = ref(null)

onMounted(() => classroomsStore.loadClassrooms())

function openCreateClassroom() {
  classroomsStore.mutationErrorMessage = ''
  isCreateDialogVisible.value = true
}

async function createClassroom(name) {
  if (await classroomsStore.createClassroom(name)) {
    isCreateDialogVisible.value = false
  }
}

async function toggleArchived(classroom) {
  pendingClassroomId.value = classroom.id

  try {
    await classroomsStore.archiveClassroom(classroom.id, !classroom.archivedAt)
  } finally {
    pendingClassroomId.value = null
  }
}

function openClassroom(classroomId) {
  router.push({ name: 'classroom-detail', params: { classroomId } })
}
</script>

<template>
  <div class="classrooms-page">
    <PageHeader
      eyebrow="Tus salones"
      title="Salones."
      description="Crea un salón y dentro de él las cuentas de tus estudiantes."
    >
      <template #actions>
        <Button label="Nuevo salón" icon="pi pi-plus" @click="openCreateClassroom" />
        <Button
          label="Actualizar"
          icon="pi pi-refresh"
          severity="secondary"
          outlined
          :loading="classroomsStore.isLoading"
          @click="classroomsStore.loadClassrooms"
        />
      </template>
    </PageHeader>

    <Message v-if="classroomsStore.errorMessage" severity="error">
      {{ classroomsStore.errorMessage }}
    </Message>
    <Message v-if="classroomsStore.mutationErrorMessage && !isCreateDialogVisible" severity="error">
      {{ classroomsStore.mutationErrorMessage }}
    </Message>

    <section class="panel directory-panel">
      <div class="directory-panel__toolbar">
        <div>
          <p class="overline">Aulas del docente</p>
          <h2>Salones activos y archivados</h2>
        </div>
      </div>

      <div
        v-if="classroomsStore.isLoading && !classroomsStore.classrooms.length"
        class="directory-loading"
      >
        <Skeleton v-for="item in 4" :key="item" height="3.6rem" />
      </div>
      <DataTable
        v-else
        :value="classroomsStore.classrooms"
        class="classrooms-table"
        :row-class="(data) => (data.archivedAt ? 'classrooms-table__row--archived' : '')"
        table-style="min-width: 40rem"
      >
        <template #empty>
          <p class="table-empty">
            Aún no tienes salones. Crea el primero para registrar a tus estudiantes.
          </p>
        </template>
        <Column header="Salón">
          <template #body="{ data }">
            <div class="classroom-cell">
              <strong>{{ data.name }}</strong>
              <Tag v-if="data.archivedAt" value="Archivado" severity="secondary" rounded />
            </div>
          </template>
        </Column>
        <Column field="studentCount" header="Estudiantes" />
        <Column header="Acciones">
          <template #body="{ data }">
            <div class="row-actions">
              <Button
                label="Abrir"
                icon="pi pi-arrow-right"
                icon-pos="right"
                text
                size="small"
                @click="openClassroom(data.id)"
              />
              <Button
                :label="data.archivedAt ? 'Restaurar' : 'Archivar'"
                :icon="data.archivedAt ? 'pi pi-replay' : 'pi pi-inbox'"
                severity="secondary"
                text
                size="small"
                :loading="pendingClassroomId === data.id"
                :disabled="classroomsStore.isMutating && pendingClassroomId !== data.id"
                @click="toggleArchived(data)"
              />
            </div>
          </template>
        </Column>
      </DataTable>
    </section>

    <CreateClassroomDialog
      v-model:visible="isCreateDialogVisible"
      :is-saving="classroomsStore.isMutating"
      :error-message="classroomsStore.mutationErrorMessage"
      @submit="createClassroom"
    />
  </div>
</template>
