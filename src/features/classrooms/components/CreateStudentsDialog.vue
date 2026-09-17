<script setup>
import { computed, reactive, ref, watch } from 'vue'
import Button from 'primevue/button'
import Dialog from 'primevue/dialog'
import InputNumber from 'primevue/inputnumber'
import InputText from 'primevue/inputtext'
import Message from 'primevue/message'
import SelectButton from 'primevue/selectbutton'
import Textarea from 'primevue/textarea'
import { STUDENT_COUNT_MAX, studentsFormErrors } from '@/features/classrooms/utils/classrooms'

const MODE_OPTIONS = [
  { label: 'Con nombre', value: 'named' },
  { label: 'Varios sin nombre', value: 'count' },
]

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
  initialMode: {
    type: String,
    default: 'named',
  },
})

const emit = defineEmits(['update:visible', 'submit'])
const form = reactive({ mode: 'named', studentRealName: '', notes: '', count: 5 })
const showErrors = ref(false)
const errors = computed(() => studentsFormErrors(form))
const isNamed = computed(() => form.mode === 'named')

watch(
  () => props.visible,
  (isVisible) => {
    if (!isVisible) return

    form.mode = props.initialMode
    form.studentRealName = ''
    form.notes = ''
    form.count = 5
    showErrors.value = false
  },
)

// Al cambiar de modo, los errores del otro modo no deben quedar a la vista.
watch(
  () => form.mode,
  () => {
    showErrors.value = false
  },
)

function submitStudents() {
  showErrors.value = true

  if (Object.keys(errors.value).length) return

  emit(
    'submit',
    isNamed.value
      ? { studentRealName: form.studentRealName.trim(), notes: form.notes.trim() }
      : { count: form.count },
  )
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
    header="Nuevas cuentas de estudiante"
    :closable="!isSaving"
    class="student-account-dialog"
    @update:visible="close"
  >
    <div class="student-account-dialog__intro">
      <span class="student-account-dialog__icon"
        ><i class="pi pi-user-plus" aria-hidden="true"></i
      ></span>
      <div>
        <p class="overline">Cuentas con PIN</p>
        <h3>Incorpora estudiantes a este salón.</h3>
        <p>Crearemos un usuario y un PIN temporal por cada estudiante.</p>
      </div>
    </div>

    <Message v-if="errorMessage" severity="error" :closable="false">
      {{ errorMessage }}
    </Message>

    <form class="student-account-form" @submit.prevent="submitStudents">
      <SelectButton
        v-model="form.mode"
        :options="MODE_OPTIONS"
        option-label="label"
        option-value="value"
        :allow-empty="false"
        aria-label="Modo de creación"
      />

      <template v-if="isNamed">
        <label>
          <span>Nombre completo</span>
          <InputText
            v-model="form.studentRealName"
            placeholder="Ej. Nicolás Herrera"
            autocomplete="off"
            :maxlength="160"
            :invalid="showErrors && Boolean(errors.studentRealName)"
            autofocus
            fluid
          />
          <small v-if="showErrors && errors.studentRealName" class="form-error">{{
            errors.studentRealName
          }}</small>
        </label>
        <label>
          <span>Notas docentes <small>Opcional</small></span>
          <Textarea
            v-model="form.notes"
            placeholder="Agrega contexto útil para el seguimiento mensual."
            rows="3"
            :maxlength="2000"
            auto-resize
            fluid
          />
        </label>
      </template>

      <label v-else>
        <span
          >Cantidad de cuentas <small>Entre 1 y {{ STUDENT_COUNT_MAX }}</small></span
        >
        <InputNumber
          v-model="form.count"
          :min="1"
          :max="STUDENT_COUNT_MAX"
          :use-grouping="false"
          show-buttons
          :invalid="showErrors && Boolean(errors.count)"
          input-id="students-count"
          fluid
        />
        <small v-if="showErrors && errors.count" class="form-error">{{ errors.count }}</small>
        <small v-else class="form-help">
          Podrás asignar el nombre real de cada cuenta después, desde la tabla del salón.
        </small>
      </label>
    </form>

    <template #footer>
      <Button label="Cancelar" severity="secondary" text :disabled="isSaving" @click="close" />
      <Button
        :label="isNamed ? 'Crear cuenta' : 'Crear cuentas'"
        icon="pi pi-arrow-right"
        icon-pos="right"
        :loading="isSaving"
        @click="submitStudents"
      />
    </template>
  </Dialog>
</template>
