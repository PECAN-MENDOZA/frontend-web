import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import router from '@/app/router'
import { registerAppProviders } from '@/app/providers'
import { reloadOnceForChunkError } from '@/app/router/chunkReload'
import '@/assets/styles/main.css'

// Precarga de un trozo que ya no existe (despliegue nuevo): misma recarga única.
window.addEventListener('vite:preloadError', (event) => {
  const reloaded = reloadOnceForChunkError(event.payload, {
    storage: window.sessionStorage,
    reload: () => window.location.reload(),
  })
  if (reloaded) event.preventDefault()
})

const app = createApp(App)

app.use(createPinia())
app.use(router)
registerAppProviders(app)

app.mount('#app')
