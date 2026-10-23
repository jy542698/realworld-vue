<template>
  <div class="auth">
    <section class="auth__form-side">
      <div class="auth__inner">
        <h1 class="auth__title">欢迎回来</h1>
        <p class="auth__subtitle">登录后继续写、继续读。</p>

        <div v-if="alertMessage" class="auth__alert" role="alert">{{ alertMessage }}</div>

        <form class="auth__form" @submit.prevent="submit">
          <div class="field">
            <label class="field__label" for="login-email">邮箱</label>
            <input
              id="login-email"
              v-model="form.email"
              class="input"
              :class="{ 'input--invalid': fieldErrors.email }"
              type="email"
              autocomplete="email"
              placeholder="you@example.com"
            />
            <p v-if="fieldErrors.email" class="field__error">{{ fieldErrors.email }}</p>
          </div>

          <div class="field">
            <label class="field__label" for="login-password">密码</label>
            <input
              id="login-password"
              v-model="form.password"
              class="input"
              :class="{ 'input--invalid': fieldErrors.password }"
              type="password"
              autocomplete="current-password"
              placeholder="请输入密码"
            />
            <p v-if="fieldErrors.password" class="field__error">{{ fieldErrors.password }}</p>
          </div>

          <button type="submit" class="btn btn--primary btn--lg btn--block" :disabled="loading">
            {{ loading ? '登录中…' : '登录' }}
          </button>
        </form>

        <p class="auth__switch">
          还没有账号？
          <router-link :to="{ path: '/register', query: redirectQuery }">注册</router-link>
        </p>
      </div>
    </section>

    <BrandPanel class="auth__brand" />
  </div>
</template>

<script setup>
/**
 * 登录页（≥1024 分屏，<1024 单列）
 *
 * 登录失败只有一种文案（邮箱或密码错误）——后端也不区分「邮箱不存在」和「密码错」，
 * 前端跟着不区分，避免变成账号探测工具。
 * 成功后按 ?redirect 回跳，且只接受站内相对路径（防开放重定向）。
 */
import { computed, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { login } from '../api/user'
import { auth } from '../store/auth'
import { toast } from '../composables/useToast'
import { extractErrors, pickFieldError } from '../utils/errors'
import BrandPanel from '../components/BrandPanel.vue'

const route = useRoute()
const router = useRouter()

const form = reactive({ email: '', password: '' })
const fieldErrors = reactive({ email: '', password: '' })
const alertMessage = ref('')
const loading = ref(false)

const redirectQuery = computed(() => {
  const target = safeRedirect(route.query.redirect)
  return target === '/' ? {} : { redirect: target }
})

/** 只接受站内相对路径：`//evil.com` 与 `https://evil.com` 一律回落首页 */
function safeRedirect(value) {
  if (typeof value === 'string' && value.startsWith('/') && !value.startsWith('//')) {
    return value
  }
  return '/'
}

function validate() {
  fieldErrors.email = ''
  fieldErrors.password = ''
  alertMessage.value = ''

  const email = form.email.trim()
  if (!email) fieldErrors.email = '请输入邮箱'
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) fieldErrors.email = '邮箱格式不正确'

  if (!form.password) fieldErrors.password = '请输入密码'

  return !fieldErrors.email && !fieldErrors.password
}

async function submit() {
  if (loading.value || !validate()) return
  loading.value = true

  try {
    const { data } = await login({ email: form.email.trim(), password: form.password })
    const user = data?.user
    if (!user?.token) {
      alertMessage.value = '登录失败，请稍后重试'
      return
    }
    auth.setAuth(user, user.token)
    toast.success('登录成功')
    router.replace(safeRedirect(route.query.redirect))
  } catch (e) {
    const { fieldMap, first } = extractErrors(e)
    fieldErrors.email = pickFieldError(fieldMap, 'email')
    fieldErrors.password = pickFieldError(fieldMap, 'password')
    if (!fieldErrors.email && !fieldErrors.password) alertMessage.value = first
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.auth {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  min-height: calc(100vh - var(--nav-h));
}

.auth__form-side {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-16) var(--space-6);
  background: var(--color-surface);
}

.auth__inner {
  width: 100%;
  max-width: 400px;
}

.auth__title {
  color: var(--color-ink);
  font-size: var(--text-h2-size);
  font-weight: var(--font-weight-semibold);
  line-height: var(--text-h2-lh);
}

.auth__subtitle {
  margin-top: var(--space-2);
  color: var(--color-text-secondary);
  font-size: var(--text-body-size);
  line-height: var(--text-body-lh);
}

.auth__alert {
  margin-top: var(--space-5);
  padding: var(--space-3) var(--space-4);
  border-left: 3px solid var(--color-danger);
  border-radius: var(--radius-sm);
  background: var(--color-rose-soft);
  color: var(--color-danger);
  font-size: var(--text-sm-size);
  line-height: var(--text-sm-lh);
}

.auth__form {
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
  margin-top: var(--space-8);
}

.auth__switch {
  margin-top: var(--space-6);
  color: var(--color-text-secondary);
  font-size: var(--text-sm-size);
  text-align: center;
}

.auth__brand {
  display: none;
}

/* ≥1024 分屏：左 60% 表单 / 右 40% 品牌区 */
@media (min-width: 1024px) {
  .auth {
    grid-template-columns: minmax(0, 3fr) minmax(0, 2fr);
  }

  .auth__brand {
    display: block;
  }
}
</style>
