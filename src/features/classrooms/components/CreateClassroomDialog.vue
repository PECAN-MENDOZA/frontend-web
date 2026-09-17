<script setup>
import { computed, ref, watch } from 'vue'
import Button from 'primevue/button'
import Dialog from 'primevue/dialog'
import InputText from 'primevue/inputtext'
import Message from 'primevue/message'
import {
  CLASSROOM_NAME_MAX_LENGTH,
  classroomFormErrors,
} from '@/features/classrooms/utils/classrooms'

const props = defineProps({
  visible: {
    type: Boolean,
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
  // Con un salón el diálogo pasa a modo "renombrar"; sin él, crea uno nuevo.
  classroom: {
    type: Object,
    default: null,
  },
})

const emit = defineEmits(['update:visible', 'submit'])
const name = ref('')
const showErrors = ref(false)
const errors = computed(() => classroomFormErrors({ name: name.value }))
const isRenaming = computed(() => Boolean(props.classroom))

watch(
  () => props.visible,
  (isVisible) => {
    if (!isVisible) return

    name.value = props.classroom?.name ?? ''
    showErrors.value = false
  },
)

function submitClassroom() {
  showErrors.value = true

  if (Object.keys(errors.value).length) return

  emit('submit', name.value.trim())
}

// Mientras el guardado está en curso el diálogo no se cierra: su resultado (p. ej. nombre
// duplicado) debe verse aquí.
function close() {
  if (props.isSaving) return

  emit('update:visible', false)
}
</script>

<template>
  <Dialog
    :visible="visible"
    modal
    :header="isRenaming ? 'Renombrar salón' : 'Nuevo salón'"
    :closable="!isSaving"
    class="student-account-dialog"
    @update:visible="close"
  >
    <div class="student-account-dialog__intro">
      <span class="student-account-dialog__icon"
        ><i class="pi pi-th-large" aria-hidden="true"></i
      ></span>
      <div>
        <p class="overline">{{ isRenaming ? 'Salón existente' : 'Salón' }}</p>
        <h3>{{ isRenaming ? 'Cambia el nombre del salón.' : 'Crea un salón para tu aula.' }}</h3>
        <p>Dentro del salón crearás las cuentas de tus estudiantes.</p>
      </div>
    </div>

    <Message v-if="errorMessage" severity="error" :closable="false">
      {{ errorMessage }}
    </Message>

    <form class="student-account-form" @submit.prevent="submitClassroom">
      <label>
        <span>Nombre del salón</span>
        <InputText
          v-model="name"
          placeholder="Ej. 3.º B"
          autocomplete="off"
          :maxlength="CLASSROOM_NAME_MAX_LENGTH"
          :invalid="showErrors && Boolean(errors.name)"
          autofocus
          fluid
        />
        <small v-if="showErrors && errors.name" class="form-error">{{ errors.name }}</small>
      </label>
    </form>

    <template #footer>
      <Button label="Cancelar" severity="secondary" text :disabled="isSaving" @click="close" />
      <Button
        :label="isRenaming ? 'Guardar nombre' : 'Crear salón'"
        icon="pi pi-arrow-right"
        icon-pos="right"
        :loading="isSaving"
        @click="submitClassroom"
      />
    </template>
  </Dialog>
</template>
