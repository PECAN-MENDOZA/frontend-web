<script setup>
import { computed, onUnmounted, ref } from 'vue'
import Button from 'primevue/button'
import { practiceSheet } from '@/features/insights/utils/errors.js'
import { copyText } from '@/features/research/utils/clipboard.js'

// "Palabras para practicar": las palabras corregidas dos o más veces en el periodo
// (StudentErrorsResponse.practiceWords), listas para copiar o imprimir como hoja.
const props = defineProps({
  words: {
    type: Array,
    default: () => [],
  },
  studentName: {
    type: String,
    default: '',
  },
})

const copyState = ref('')
let copyTimer = null

const sheet = computed(() => practiceSheet(props.words, props.studentName))

function timesLabel(count) {
  return count === 1 ? '1 vez' : `${count} veces`
}

function showCopyState(state) {
  copyState.value = state
  window.clearTimeout(copyTimer)
  copyTimer = window.setTimeout(() => {
    copyState.value = ''
  }, 2000)
}

async function copySheet() {
  const copied = await copyText(sheet.value)
  showCopyState(copied ? 'copied' : 'failed')
}

function escapeHtml(text) {
  return text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}

// Hoja imprimible mínima: título y una línea por palabra, sin estilos del panel.
function printSheet() {
  const printWindow = window.open('', '_blank', 'width=720,height=900')
  if (!printWindow) {
    showCopyState('popup-blocked')
    return
  }

  const [title, ...lines] = sheet.value.split('\n')
  const body = lines.map((line) => `<li>${escapeHtml(line)}</li>`).join('')

  printWindow.document.write(
    `<!doctype html><html lang="es"><head><meta charset="utf-8"><title>${escapeHtml(title)}</title>` +
      '<style>body{font-family:Georgia,serif;padding:2rem;color:#222}h1{font-size:1.5rem}' +
      'ol{font-size:1.15rem;line-height:2}</style></head><body>' +
      `<h1>${escapeHtml(title)}</h1><ol>${body}</ol></body></html>`,
  )
  printWindow.document.close()
  printWindow.focus()
  printWindow.print()
}

onUnmounted(() => window.clearTimeout(copyTimer))
</script>

<template>
  <div class="practice-words">
    <p v-if="!words.length" class="table-empty">
      Ninguna palabra corregida dos o más veces en este periodo.
    </p>
    <template v-else>
      <ol class="practice-words__list">
        <li v-for="word in words" :key="`${word.original}-${word.corrected}`">
          <strong>{{ word.corrected }}</strong>
          <span>escribió {{ word.original }}, {{ timesLabel(word.count) }}</span>
        </li>
      </ol>
      <div class="practice-words__actions">
        <Button
          label="Copiar"
          icon="pi pi-copy"
          severity="secondary"
          outlined
          size="small"
          @click="copySheet"
        />
        <Button
          label="Imprimir"
          icon="pi pi-print"
          severity="secondary"
          outlined
          size="small"
          @click="printSheet"
        />
        <span class="practice-words__state" role="status" aria-live="polite">
          <template v-if="copyState === 'copied'">Copiado</template>
          <template v-else-if="copyState === 'failed'">No se pudo copiar</template>
          <template v-else-if="copyState === 'popup-blocked'">
            El navegador bloqueó la ventana de impresión
          </template>
        </span>
      </div>
    </template>
  </div>
</template>
