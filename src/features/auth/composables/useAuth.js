import { reactive } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/features/auth/store/auth.store'

export function useAuth() {
  const route = useRoute()
  const router = useRouter()
  const authStore = useAuthStore()
  const credentials = reactive({
    email: '',
    password: '',
  })

  async function submitSignIn() {
    try {
      await authStore.signIn(credentials)
      router.push(route.query.redirect ?? { name: 'dashboard' })
    } catch {
      // The store exposes the request error for the form message.
    }
  }

  return {
    authStore,
    credentials,
    submitSignIn,
  }
}
