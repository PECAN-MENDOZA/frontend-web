import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import {
  clearSession,
  restoreSession,
  signIn as signInRequest,
} from '@/features/auth/services/auth.service'

export const useAuthStore = defineStore('auth', () => {
  const session = restoreSession()
  const user = ref(session?.user ?? null)
  const isLoading = ref(false)
  const errorMessage = ref('')

  const isAuthenticated = computed(() => Boolean(user.value))
  const userInitials = computed(() =>
    user.value?.name
      .split(' ')
      .map((name) => name[0])
      .slice(0, 2)
      .join(''),
  )

  async function signIn(credentials) {
    isLoading.value = true
    errorMessage.value = ''

    try {
      const newSession = await signInRequest(credentials)
      user.value = newSession.user
    } catch (error) {
      errorMessage.value = error.message
      throw error
    } finally {
      isLoading.value = false
    }
  }

  function signOut() {
    clearSession()
    user.value = null
  }

  window.addEventListener('auth:unauthorized', signOut)

  return {
    user,
    isLoading,
    errorMessage,
    isAuthenticated,
    userInitials,
    signIn,
    signOut,
  }
})
