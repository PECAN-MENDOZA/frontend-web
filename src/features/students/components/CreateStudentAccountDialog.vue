<script setup>
import { reactive, watch } from 'vue'
import Button from 'primevue/button'
import Dialog from 'primevue/dialog'
import InputText from 'primevue/inputtext'
import Message from 'primevue/message'
import Textarea from 'primevue/textarea'
import StudentCredentialDialog from '@/features/students/components/StudentCredentialDialog.vue'

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
  createdAccount: {
    type: Object,
    default: null,
  },
})

const emit = defineEmits(['update:visible', 'submit', 'close-credentials'])
const form = reactive({
  studentRealName: '',
  notes: '',
})

watch(
  () => props.visible,
  (isVisible) => {
    if (!isVisible) return

    form.studentRealName = ''
    form.notes = ''
  },
)

function submitStudent() {
  const studentRealName = form.studentRealName.trim()

  if (!studentRealName) return

  emit('submit', {
    studentRealName,
    notes: form.notes.trim(),
  })
}
</script>

<template>
  <Dialog
    :visible="visible"
    modal
    header="Crear cuenta de estudiante"
    class="student-account-dialog"
    @update:visible="$emit('update:visible', $event)"
  >
    <div class="student-account-dialog__intro">
      <span class="student-account-dialog__icon"><i class="pi pi-user-plus"></i></span>
      <div>
        <p class="overline">Nueva cuenta</p>
        <h3>Incorpora un estudiante a tu aula.</h3>
        <p>Crearemos su alias y un PIN temporal para el primer ingreso.</p>
      </div>
    </div>

    <Message v-if="errorMessage" severity="error" :closable="false">
      {{ errorMessage }}
    </Message>

    <form class="student-account-form" @submit.prevent="submitStudent">
      <label>
        <span>Nombre completo</span>
        <InputText
          v-model="form.studentRealName"
          placeholder="Ej. Nicolás Herrera"
          autocomplete="off"
          required
          autofocus
          fluid
        />
      </label>
      <label>
        <span>Notas docentes <small>Opcional</small></span>
        <Textarea
          v-model="form.notes"
          placeholder="Agrega contexto útil para el seguimiento mensual."
          rows="4"
          auto-resize
          fluid
        />
      </label>
    </form>

    <template #footer>
      <Button
        label="Cancelar"
        severity="secondary"
        text
        :disabled="isSaving"
        @click="$emit('update:visible', false)"
      />
      <Button
        label="Crear cuenta"
        icon="pi pi-arrow-right"
        icon-pos="right"
        :loading="isSaving"
        @click="submitStudent"
      />
    </template>
  </Dialog>

  <StudentCredentialDialog
    :credential="createdAccount"
    header="PIN temporal"
    intro="Comparte estos datos con el estudiante para ingresar desde el teclado digital."
    action-label="Ya entregué el PIN"
    @close="$emit('close-credentials')"
  />
</template>
