<script setup>
import { computed, ref, watch } from 'vue'
import Button from 'primevue/button'
import Dialog from 'primevue/dialog'
import Message from 'primevue/message'
import MultiSelect from 'primevue/multiselect'
import Select from 'primevue/select'
import SelectButton from 'primevue/selectbutton'

const props = defineProps({
  visible: { type: Boolean, required: true },
  classrooms: { type: Array, required: true },
  isLoading: { type: Boolean, required: true },
  isSaving: { type: Boolean, required: true },
  directoryError: { type: String, required: true },
  errorMessage: { type: String, required: true },
})

const emit = defineEmits(['update:visible', 'submit', 'retry'])
const mode = ref('classroom')
const classroomId = ref(null)
const studentIds = ref([])
const showErrors = ref(false)
const modeOptions = [
  { label: 'Por salón', value: 'classroom' },
  { label: 'Por alumnos', value: 'students' },
]
const classroomOptions = computed(() =>
  props.classrooms
    .filter((classroom) => !classroom.archived)
    .map((classroom) => ({
      value: classroom.id,
      label: `${classroom.teacherUsername || 'Docente sin identificar'} · ${classroom.name || 'Salón sin nombre'} · ${classroom.students?.length ?? 0} alumnos`,
    })),
)
const studentOptions = computed(() => {
  const students = new Map()

  for (const classroom of props.classrooms.filter((item) => !item.archived)) {
    for (const student of classroom.students ?? []) {
      if (!student.studentId) continue
      students.set(student.studentId, {
        value: student.studentId,
        label: student.username || 'Usuario sin identificar',
        classroom: classroom.name || 'Salón sin nombre',
      })
    }
  }

  return [...students.values()].sort((first, second) => first.label.localeCompare(second.label))
})
const isValid = computed(() =>
  mode.value === 'classroom' ? Boolean(classroomId.value) : studentIds.value.length > 0,
)

watch(
  () => props.visible,
  (isVisible) => {
    if (!isVisible) return

    mode.value = 'classroom'
    classroomId.value = null
    studentIds.value = []
    showErrors.value = false
  },
)

function submitAssignment() {
  showErrors.value = true
  if (!isValid.value || props.isSaving) return

  emit(
    'submit',
    mode.value === 'classroom'
      ? { classroomId: classroomId.value }
      : { studentIds: studentIds.value },
  )
}

function close() {
  if (!props.isSaving) emit('update:visible', false)
}
</script>

<template>
  <Dialog
    :visible="visible"
    modal
    header="Asignar prueba"
    :closable="!isSaving"
    class="student-account-dialog test-dialog"
    @update:visible="close"
  >
    <div class="student-account-dialog__intro">
      <span class="student-account-dialog__icon">
        <i class="pi pi-send" aria-hidden="true"></i>
      </span>
      <div>
        <p class="overline">Nueva asignación</p>
        <h3>Elige quién realizará la prueba.</h3>
        <p>Asigna un salón completo o selecciona alumnos concretos por su username.</p>
      </div>
    </div>

    <Message v-if="errorMessage" severity="error" :closable="false">
      {{ errorMessage }}
    </Message>
    <Message v-if="directoryError" severity="error" :closable="false">
      <div class="research-refresh-warning">
        <span>{{ directoryError }}</span>
        <Button label="Reintentar" severity="danger" text size="small" @click="emit('retry')" />
      </div>
    </Message>

    <form class="research-form test-assignment-form" @submit.prevent="submitAssignment">
      <label>
        <span>Forma de asignación</span>
        <SelectButton
          v-model="mode"
          :options="modeOptions"
          option-label="label"
          option-value="value"
          :allow-empty="false"
          aria-label="Forma de asignación"
        />
      </label>

      <label v-if="mode === 'classroom'">
        <span>Salón</span>
        <Select
          v-model="classroomId"
          :options="classroomOptions"
          option-label="label"
          option-value="value"
          placeholder="Selecciona un salón"
          :loading="isLoading"
          :invalid="showErrors && !classroomId"
          filter
          fluid
        />
        <small v-if="showErrors && !classroomId" class="research-form__error">
          Selecciona un salón.
        </small>
      </label>

      <label v-else>
        <span>Alumnos <small>{{ studentIds.length }} seleccionados</small></span>
        <MultiSelect
          v-model="studentIds"
          :options="studentOptions"
          option-label="label"
          option-value="value"
          placeholder="Selecciona uno o más alumnos"
          :loading="isLoading"
          :invalid="showErrors && !studentIds.length"
          filter
          display="chip"
          fluid
        >
          <template #option="{ option }">
            <div class="test-student-option">
              <strong>{{ option.label }}</strong>
              <small>{{ option.classroom }}</small>
            </div>
          </template>
        </MultiSelect>
        <small v-if="showErrors && !studentIds.length" class="research-form__error">
          Selecciona al menos un alumno.
        </small>
      </label>

      <Message
        v-if="!isLoading && !directoryError && !classroomOptions.length"
        severity="warn"
        :closable="false"
      >
        No hay salones activos disponibles. Pide a un docente que cree un salón con alumnos.
      </Message>
    </form>

    <template #footer>
      <Button label="Cancelar" severity="secondary" text :disabled="isSaving" @click="close" />
      <Button
        label="Asignar"
        icon="pi pi-send"
        :disabled="!isValid"
        :loading="isSaving"
        @click="submitAssignment"
      />
    </template>
  </Dialog>
</template>
