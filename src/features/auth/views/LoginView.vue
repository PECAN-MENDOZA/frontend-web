<script setup>
import Button from 'primevue/button'
import Divider from 'primevue/divider'
import InputText from 'primevue/inputtext'
import Message from 'primevue/message'
import Password from 'primevue/password'
import { useAuth } from '@/features/auth/composables/useAuth'
import { APP_NAME, APP_TAGLINE } from '@/shared/constants/app'

const { authStore, credentials, submitSignIn } = useAuth()
</script>

<template>
  <section class="login-page">
    <div class="login-page__story">
      <div class="login-page__brand">
        <div class="brand-mark brand-mark--large">F</div>
        <span>{{ APP_NAME }}</span>
      </div>

      <div class="login-page__story-content">
        <p class="overline">Teacher workspace</p>
        <h1>See the learning pattern behind every word.</h1>
        <p>
          Transform daily writing signals into focused, compassionate guidance for every student.
        </p>
      </div>

      <div class="login-page__signal-card">
        <span class="login-page__signal-icon"><i class="pi pi-sparkles"></i></span>
        <div>
          <strong>Small signals. Clear next steps.</strong>
          <p>Track acceptance, error patterns, and recurring words in one calm workspace.</p>
        </div>
      </div>
    </div>

    <div class="login-page__panel">
      <form class="login-card" @submit.prevent="submitSignIn">
        <div>
          <p class="overline">Welcome back</p>
          <h2>Sign in to your classroom</h2>
          <p class="login-card__subtitle">{{ APP_TAGLINE }}</p>
        </div>

        <Message v-if="authStore.errorMessage" severity="error" :closable="false">
          {{ authStore.errorMessage }}
        </Message>

        <div class="form-field">
          <label for="email">Institutional email</label>
          <InputText
            id="email"
            v-model="credentials.email"
            type="email"
            autocomplete="email"
            placeholder="teacher@school.edu"
            fluid
          />
        </div>

        <div class="form-field">
          <label for="password">Password</label>
          <Password
            input-id="password"
            v-model="credentials.password"
            autocomplete="current-password"
            placeholder="Enter your password"
            :feedback="false"
            toggle-mask
            fluid
          />
        </div>

        <div class="login-card__options">
          <label class="checkbox-label">
            <input type="checkbox" checked />
            <span>Keep me signed in</span>
          </label>
          <button type="button">Forgot password?</button>
        </div>

        <Button
          type="submit"
          label="Enter dashboard"
          icon="pi pi-arrow-right"
          icon-pos="right"
          :loading="authStore.isLoading"
          fluid
        />

        <Divider />

        <p class="login-card__hint">
          <i class="pi pi-lock"></i>
          Protected access for authorized educators only.
        </p>
      </form>
    </div>
  </section>
</template>
