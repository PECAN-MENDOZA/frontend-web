<script setup>
import { computed } from 'vue'
import Button from 'primevue/button'
import Message from 'primevue/message'
import Select from 'primevue/select'
import SelectButton from 'primevue/selectbutton'
import Textarea from 'primevue/textarea'
import {
  ASSISTANCE_LABELS,
  KIND_LABELS,
  REFERENCE_MAX_LENGTH,
  SENTENCE_MAX,
  countsSummary,
  moveSentence,
  newSentence,
  sentenceCounts,
  sentenceErrors,
} from '@/features/tests/utils/sentences'

const props = defineProps({
  readonly: { type: Boolean, default: false },
})

const sentences = defineModel('sentences', { type: Array, required: true })
const kindOptions = Object.entries(KIND_LABELS).map(([value, label]) => ({ value, label }))
const assistanceOptions = Object.entries(ASSISTANCE_LABELS).map(([value, label]) => ({
  value,
  label,
}))
const errors = computed(() => sentenceErrors(sentences.value))
const summary = computed(() => countsSummary(sentenceCounts(sentences.value)))

function placeholderFor(kind) {
  return kind === 'FREE' ? 'Consigna que dictarás' : 'Oración exacta que dictarás'
}

function updateSentence(index, field, value) {
  sentences.value = sentences.value.map((sentence, currentIndex) =>
    currentIndex === index ? { ...sentence, [field]: value } : sentence,
  )
}

function addSentence() {
  if (sentences.value.length < SENTENCE_MAX) {
    sentences.value = [...sentences.value, newSentence()]
  }
}

function removeSentence(index) {
  sentences.value = sentences.value.filter((_, currentIndex) => currentIndex !== index)
}

function reorder(from, to) {
  sentences.value = moveSentence(sentences.value, from, to)
}
</script>

<template>
  <div class="sentence-editor">
    <div class="sentence-editor__scroll">
      <table>
        <thead>
          <tr>
            <th scope="col">#</th>
            <th scope="col">Tipo</th>
            <th scope="col">Texto o consigna</th>
            <th scope="col">Ayuda</th>
            <th v-if="!props.readonly" scope="col"><span class="sr-only">Acciones</span></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(sentence, index) in sentences" :key="sentence.id ?? index">
            <td class="sentence-editor__position">{{ index + 1 }}</td>
            <td>
              <span v-if="props.readonly" class="sentence-editor__label">
                {{ KIND_LABELS[sentence.kind] ?? sentence.kind ?? '—' }}
              </span>
              <Select
                v-else
                :model-value="sentence.kind"
                :options="kindOptions"
                option-label="label"
                option-value="value"
                :aria-label="`Tipo de la oración ${index + 1}`"
                @update:model-value="updateSentence(index, 'kind', $event)"
              />
            </td>
            <td class="sentence-editor__text">
              <p v-if="props.readonly">{{ sentence.referenceText || 'Texto no disponible' }}</p>
              <Textarea
                v-else
                :model-value="sentence.referenceText"
                rows="2"
                auto-resize
                fluid
                :maxlength="REFERENCE_MAX_LENGTH"
                :placeholder="placeholderFor(sentence.kind)"
                :aria-label="`Texto de la oración ${index + 1}`"
                :invalid="errors.some((error) => error.index === index)"
                @update:model-value="updateSentence(index, 'referenceText', $event)"
              />
            </td>
            <td>
              <span v-if="props.readonly" class="sentence-editor__label">
                {{ ASSISTANCE_LABELS[sentence.assistance] ?? sentence.assistance ?? '—' }}
              </span>
              <SelectButton
                v-else
                :model-value="sentence.assistance"
                :options="assistanceOptions"
                option-label="label"
                option-value="value"
                :allow-empty="false"
                :aria-label="`Ayuda de la oración ${index + 1}`"
                @update:model-value="updateSentence(index, 'assistance', $event)"
              />
            </td>
            <td v-if="!props.readonly">
              <div class="sentence-editor__actions">
                <Button
                  icon="pi pi-arrow-up"
                  severity="secondary"
                  text
                  rounded
                  size="small"
                  :aria-label="`Subir oración ${index + 1}`"
                  :disabled="index === 0"
                  @click="reorder(index, index - 1)"
                />
                <Button
                  icon="pi pi-arrow-down"
                  severity="secondary"
                  text
                  rounded
                  size="small"
                  :aria-label="`Bajar oración ${index + 1}`"
                  :disabled="index === sentences.length - 1"
                  @click="reorder(index, index + 1)"
                />
                <Button
                  icon="pi pi-trash"
                  severity="danger"
                  text
                  rounded
                  size="small"
                  :aria-label="`Quitar oración ${index + 1}`"
                  @click="removeSentence(index)"
                />
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="sentence-editor__footer">
      <Button
        v-if="!props.readonly"
        label="Añadir oración"
        icon="pi pi-plus"
        severity="secondary"
        outlined
        :disabled="sentences.length >= SENTENCE_MAX"
        @click="addSentence"
      />
      <p>{{ summary }}</p>
    </div>

    <div v-if="!props.readonly && errors.length" class="sentence-editor__errors" aria-live="polite">
      <Message
        v-for="error in errors"
        :key="`${error.index}-${error.message}`"
        severity="error"
        :closable="false"
      >
        {{ error.message }}
      </Message>
    </div>
  </div>
</template>
