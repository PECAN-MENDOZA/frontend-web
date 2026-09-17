<script setup>
import { computed, ref, watch } from 'vue'
import Button from 'primevue/button'
import Dialog from 'primevue/dialog'
import InputText from 'primevue/inputtext'
import Message from 'primevue/message'
import { teacherFormErrors } from '@/features/research/utils/teachers'

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
})

const emit = defineEmits(['update:visible', 'submit'])
const fullName = ref('')
const email = ref('')
const institution = ref('')
const showErrors = ref(false)
const form = computed(() => ({
  fullName: fullName.value,
  email: email.value,
  institution: institution.value,
}))
const errors = computed(() => teacherFormErrors(form.value))

watch(
  () => props.visible,
  (isVisible) => {
    if (!isVisible) return

    fullName.value = ''
    email.value = ''
    institution.value = ''
    showErrors.value = false
  },
)

function submitTeacher() {
  showErrors.value = true

  if (Object.keys(errors.value).length) return

  emit('submit', {
    fullName: fullName.value.trim(),
    email: email.value.trim(),
    institution: institution.value.trim(),
  })
}

// Mientras se crea la cuenta el diálogo no se cierra: un correo duplicado debe verse aquí.
function close() {
  if (props.isSaving) return

  emit('update:visible', false)
}
</script>

<template>
  <Dialog
    :visible="visible"
    modal
    header="Nuevo docente"
    :closable="!isSaving"
    class="student-account-dialog"
    @update:visible="close"
  >
    <div class="student-account-dialog__intro">
      <span class="student-account-dialog__icon"
        ><i class="pi pi-id-card" aria-hidden="true"></i
      ></span>
      <div>
        <p class="overline">Cuenta de docente</p>
        <h3>Crea la cuenta del docente.</h3>
        <p>El docente entra con una contraseña temporal y crea sus propios salones y alumnos.</p>
      </div>
    </div>

    <Message v-if="errorMessage" severity="error" :closable="false">
      {{ errorMessage }}
    </Message>

    <form class="student-account-form" @submit.prevent="submitTeacher">
      <label>
        <span>Nombre completo</span>
        <InputText
          v-model="fullName"
          placeholder="Ej. Ana Pérez"
          autocomplete="off"
          :invalid="showErrors && Boolean(errors.fullName)"
          autofocus
          fluid
        />
        <small v-if="showErrors && errors.fullName" class="form-error">{{ errors.fullName }}</small>
      </label>
      <label>
        <span>Correo</span>
        <InputText
          v-model="email"
          type="email"
          placeholder="ana@colegio.edu.pe"
          autocomplete="off"
          :invalid="showErrors && Boolean(errors.email)"
          fluid
        />
        <small v-if="showErrors && errors.email" class="form-error">{{ errors.email }}</small>
      </label>
      <label>
        <span>Institución</span>
        <InputText
          v-model="institution"
          placeholder="Ej. Colegio San Martín"
          autocomplete="off"
          :invalid="showErrors && Boolean(errors.institution)"
          fluid
        />
        <small v-if="showErrors && errors.institution" class="form-error">{{
          errors.institution
        }}</small>
      </label>
    </form>

    <template #footer>
      <Button label="Cancelar" severity="secondary" text :disabled="isSaving" @click="close" />
      <Button
        label="Crear docente"
        icon="pi pi-arrow-right"
        icon-pos="right"
        :loading="isSaving"
        @click="submitTeacher"
      />
    </template>
  </Dialog>
</template>
