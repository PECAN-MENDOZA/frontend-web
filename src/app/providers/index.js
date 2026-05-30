import PrimeVue from 'primevue/config'
import Aura from '@primeuix/themes/aura'

export function registerAppProviders(app) {
  app.use(PrimeVue, {
    ripple: true,
    theme: {
      preset: Aura,
      options: {
        darkModeSelector: '.app-dark',
        cssLayer: false,
      },
    },
  })
}
