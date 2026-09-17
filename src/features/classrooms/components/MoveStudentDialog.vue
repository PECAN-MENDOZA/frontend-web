<script setup>
import { computed, ref, watch } from 'vue'
import Button from 'primevue/button'
import Dialog from 'primevue/dialog'
import Message from 'primevue/message'
import Select from 'primevue/select'

const props = defineProps({
  visible: {
    type: Boolean,
    required: true,
  },
  student: {
    type: Object,
    default: null,
  },
  classrooms: {
    type: Array,
    required: true,
  },
  currentClassroomId: {
    type: String,
    required: true,
  },
  isSaving: {
    type: Boolean,
    required: true,
  },
  errorMessage: {
    type: String,
    required: true,
  },
})

const emit = defineEmits(['update:visible', 'submit'])
const targetClassroomId = ref(null)

// Solo salones activos y distintos del actual: el backend rechaza mover a uno archivado.
const options = computed(() =>
  props.classrooms.filter(
    (classroom) => !classroom.archivedAt && classroom.id !== props.currentClassroomId,
  ),
)
const studentLabel = computed(
  () => props.student?.studentRealName || props.student?.studentUsername || 'el estudiante',
)

watch(
  () => props.visible,
  (isVisible) => {
    if (isVisible) {
      targetClassroomId.value = null
    }
  },
)

function submitMove() {
  if (!targetClassroomId.value) return

  emit('submit', targetClassroomId.value)
}

function close() {
  if (props.isSaving) return

  emit('update:visible', false)
}
</script>

<template>
  <Dialog
    :visible="visible"
    modal
    header="Mover de salón"
    :closable="!isSaving"
    class="student-account-dialog"
    @update:visible="close"
  >
    <div class="student-account-dialog__intro">
      <span class="student-account-dialog__icon"
        ><i class="pi pi-arrow-right-arrow-left" aria-hidden="true"></i
      ></span>
      <div>
        <p class="overline">Cambio de salón</p>
        <h3>Mueve a {{ studentLabel }}.</h3>
        <p>Conservará su usuario, su PIN y todo su historial.</p>
      </div>
    </div>

    <Message v-if="errorMessage" severity="error" :closable="false">
      {{ errorMessage }}
    </Message>

    <Message v-if="!options.length" severity="info" :closable="false">
      No tienes otro salón activo. Crea uno primero para poder mover estudiantes.
    </Message>

    <form v-else class="student-account-form" @submit.prevent="submitMove">
      <label>
        <span>Salón de destino</span>
        <Select
          v-model="targetClassroomId"
          :options="options"
          option-label="name"
          option-value="id"
          placeholder="Elige un salón"
          fluid
        />
      </label>
    </form>

    <template #footer>
      <Button label="Cancelar" severity="secondary" text :disabled="isSaving" @click="close" />
      <Button
        label="Mover"
        icon="pi pi-arrow-right"
        icon-pos="right"
        :disabled="!targetClassroomId"
        :loading="isSaving"
        @click="submitMove"
      />
    </template>
  </Dialog>
</template>
