<template>
  <div class="login">
    <div class="login__panel">
      <div class="login__brand">
        <span class="login__logo" aria-hidden="true">
          <School :size="30" />
        </span>
        <h1 class="login__wordmark">School Management</h1>
      </div>

      <AppCard>
        <div class="login__head">
          <h2 class="login__title">Welcome back</h2>
          <p class="login__sub">Sign in to continue to your panel</p>
        </div>

        <form class="login__form" @submit.prevent="onSubmit">
          <AppInput v-model="identifier" label="Username" placeholder="admin" />
          <AppInput v-model="password" label="Password" type="password" placeholder="••••••••" />
          <p v-if="error" class="login__error">{{ error }}</p>
          <AppButton type="submit" :loading="busy">Login</AppButton>

          <div class="login__quick">
            <p class="login__quick-title">Quick login — click to fill (one per panel):</p>
            <div class="login__quick-btns">
              <button
                v-for="a in QUICK_ACCOUNTS"
                :key="a.username"
                type="button"
                class="login__quick-btn"
                :class="{ 'login__quick-btn--active': identifier === a.username }"
                :title="`${a.username} / ${a.password}`"
                @click="fill(a)"
              >
                {{ a.label }}
                <span class="login__quick-cred">{{ a.username }} / {{ a.password }}</span>
              </button>
            </div>
          </div>
        </form>
      </AppCard>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { School } from 'lucide-vue-next'
import AppButton from '@/components/common/AppButton.vue'
import AppCard from '@/components/common/AppCard.vue'
import AppInput from '@/components/common/AppInput.vue'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const router = useRouter()

interface QuickAccount {
  label: string
  username: string
  password: string
}

/**
 * DEV ONLY — seeded backend logins, one per panel (see seed_school command).
 * Remove this block before any public/production deploy: real passwords must
 * never ship in the client bundle.
 */
const QUICK_ACCOUNTS: QuickAccount[] = [
  { label: 'Super Admin', username: 'superadmin', password: 'super123' },
  { label: 'Admin', username: 'admin', password: 'admin123' },
  { label: 'Accountant', username: 'accountant', password: 'account123' },
  { label: 'Teacher / Staff', username: 'teacher', password: 'teacher123' },
  { label: 'Parent', username: 'parent', password: 'parent123' },
  { label: 'Live Display', username: 'live', password: 'live123' },
]

const identifier = ref('')
const password = ref('')
const error = ref('')
const busy = ref(false)

function fill(account: QuickAccount): void {
  identifier.value = account.username
  password.value = account.password
  error.value = ''
}

/** Prefer the backend's message (axios wraps it), fall back to generic. */
function apiErrorMessage(e: unknown, fallback: string): string {
  if (typeof e === 'object' && e !== null) {
    const data = (e as { response?: { data?: { message?: unknown } } }).response?.data
    if (typeof data?.message === 'string' && data.message) return data.message
    if (e instanceof Error && e.message && !e.message.startsWith('Request failed')) return e.message
  }
  return fallback
}

async function onSubmit(): Promise<void> {
  error.value = ''
  busy.value = true
  try {
    await auth.login(identifier.value, password.value)
    const role = auth.user?.role
    await router.push(
      role === 'super_admin'
        ? '/super-admin/dashboard'
        : role === 'parent'
          ? '/parent/dashboard'
          : role === 'teacher'
            ? '/teacher/dashboard'
            : role === 'monitor'
              ? '/live'
              : '/admin/dashboard',
    )
  } catch (e) {
    error.value = apiErrorMessage(e, 'Login failed')
  } finally {
    busy.value = false
  }
}
</script>

<style scoped>
.login {
  min-height: 100vh;
  min-height: 100dvh;
  display: grid;
  padding: var(--spacing-lg) var(--spacing-md);
  padding-bottom: calc(var(--spacing-lg) + env(safe-area-inset-bottom, 0px));
  /* Whisper-soft brand glow at the top — barely there in both themes. */
  background-image: radial-gradient(
    900px 420px at 50% 0%,
    var(--color-primary-light),
    transparent 70%
  );
}
/* The panel centers itself with auto margins (not place-items) so a page that
   grows past the viewport — brand block + long quick-login card on short
   screens — scrolls from the top instead of clipping the logo. */
.login__panel {
  width: min(440px, 100%);
  margin: auto;
  display: grid;
  gap: var(--spacing-lg);
}
.login__brand {
  display: grid;
  justify-items: center;
  gap: var(--spacing-xs);
  text-align: center;
}
.login__logo {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 60px;
  height: 60px;
  margin-bottom: var(--spacing-xs);
  border-radius: var(--radius-full);
  background: var(--color-primary);
  color: var(--color-primary-contrast);
  box-shadow: var(--shadow-md);
}
.login__wordmark {
  font-size: var(--font-size-2xl);
  font-weight: var(--font-weight-bold);
  letter-spacing: -0.02em;
  line-height: var(--line-height-tight);
}
.login__head {
  margin-bottom: var(--spacing-lg);
}
.login__title {
  font-size: var(--font-size-xl);
  font-weight: var(--font-weight-bold);
}
.login__sub {
  color: var(--color-text-muted);
  font-size: var(--font-size-sm);
}
/* Login card sits a touch higher than the default card. */
.login :deep(.app-card) {
  box-shadow: var(--shadow-lg);
}
.login__form {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
  min-width: 0;
}
.login__error {
  color: var(--color-danger);
  font-size: var(--font-size-sm);
}
.login__quick {
  border-top: 1px solid var(--color-border);
  padding-top: var(--spacing-md);
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}
.login__quick-title {
  color: var(--color-text-muted);
  font-size: var(--font-size-sm);
}
.login__quick-btns {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
}
.login__quick-btn {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--spacing-xs) var(--spacing-sm);
  min-height: 40px;
  padding: var(--spacing-xs) var(--spacing-md);
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border);
  background: var(--color-surface);
  color: var(--color-text);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  text-align: left;
}
.login__quick-btn:hover {
  border-color: var(--color-primary);
}
.login__quick-btn--active {
  border-color: var(--color-primary);
  background: var(--color-primary-light);
}
.login__quick-cred {
  margin-left: auto;
  color: var(--color-text-muted);
  font-weight: var(--font-weight-normal);
  font-size: var(--font-size-xs);
}
/* Very narrow phones: stack label above credentials instead of squeezing. */
@media (max-width: 420px) {
  .login__quick-btn {
    flex-direction: column;
    align-items: flex-start;
  }
  .login__quick-cred {
    margin-left: 0;
  }
}
</style>
