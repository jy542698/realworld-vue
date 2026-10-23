<template>
  <div class="auth">
    <section class="auth__form-side">
      <div class="auth__inner">
        <h1 class="auth__title">创建账号</h1>
        <p class="auth__subtitle">开始记录你的技术思考。</p>

        <div v-if="alertMessage" class="auth__alert" role="alert">{{ alertMessage }}</div>

        <form class="auth__form" @submit.prevent="submit">
          <div class="field">
            <label class="field__label" for="reg-username">用户名</label>
            <input
              id="reg-username"
              v-model="form.username"
              class="input"
              :class="{ 'input--invalid': fieldErrors.username }"
              type="text"
              autocomplete="username"
              placeholder="3~32 个字符"
            />
            <p v-if="fieldErrors.username" class="field__error">{{ fieldErrors.username }}</p>
          </div>

          <div class="field">
            <label class="field__label" for="reg-email">邮箱</label>
            <input
              id="reg-email"
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
            <label class="field__label" for="reg-password">密码</label>
            <input
              id="reg-password"
              v-model="form.password"
              class="input"
              :class="{ 'input--invalid': fieldErrors.password }"
              type="password"
              autocomplete="new-password"
              placeholder="至少 8 位"
            />
            <p v-if="fieldErrors.password" class="field__error">{{ fieldErrors.password }}</p>
          </div>

          <div class="field">
            <label class="field__label" for="reg-password2">确认密码</label>
            <input
              id="reg-password2"
              v-model="form.password2"
              class="input"
              :class="{ 'input--invalid': fieldErrors.password2 }"
              type="password"
              autocomplete="new-password"
              placeholder="再输入一次"
            />
            <p v-if="fieldErrors.password2" class="field__error">{{ fieldErrors.password2 }}</p>
          </div>

          <button type="submit" class="btn btn--primary btn--lg btn--block" :disabled="loading">
            {{ loading ? '创建中…' : '创建账号' }}
          </button>
        </form>

        <p class="auth__switch">
          已有账号？
          <router-link :to="{ path: '/login', query: redirectQuery }">登录</router-link>
        </p>
      </div>
    </section>

    <BrandPanel class="auth__brand" />
  </div>
</template>

<script setup>
/**
 * 注册页
 *
 * 注册接口直接返回 token（后端行为），所以注册成功 = 已登录，
 * 不需要再走一次登录请求；随后按 ?redirect 回跳（同样做站内路径校验，防开放重定向）。
 */
import { computed, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { register } from '../api/user'
import { auth } from '../store/auth'
import { toast } from '../composables/useToast'
import { extractErrors, pickFieldError } from '../utils/errors'
import BrandPanel from '../components/BrandPanel.vue'

const route = useRoute()
const router = useRouter()

const form = reactive({ username: '', email: '', password: '', password2: '' })
const fieldErrors = reactive({ username: '', email: '', password: '', password2: '' })
const alertMessage = ref('')
const loading = ref(false)

const redirectQuery = computed(() => {
  const target = safeRedirect(route.query.redirect)
  return target === '/' ? {} : { redirect: target }
})

function safeRedirect(value) {
  if (typeof value === 'string' && value.startsWith('/') && !value.startsWith('//')) {
    return value
  }
  return '/'
}

function validate() {
  fieldErrors.username = ''
  fieldErrors.email = ''
  fieldErrors.password = ''
  fieldErrors.password2 = ''
  alertMessage.value = ''

  const username = form.username.trim()
  const email = form.email.trim()

  if (!username) fieldErrors.username = '请输入用户名'
  else if (username.length < 3 || username.length > 32) {
    fieldErrors.username = '用户名长度需在 3 到 32 之间'
  }

  if (!email) fieldErrors.email = '请输入邮箱'
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) fieldErrors.email = '邮箱格式不正确'

  if (!form.password) fieldErrors.password = '请输入密码'
  else if (form.password.length < 8 || form.password.length > 64) {
    fieldErrors.password = '密码长度需在 8 到 64 之间'
  }

  if (form.password !== form.password2) fieldErrors.password2 = '两次输入的密码不一致'

  return (
    !fieldErrors.username && !fieldErrors.email && !fieldErrors.password && !fieldErrors.password2
  )
}

async function submit() {
  if (loading.value || !validate()) return
  loading.value = true

  try {
    const { data } = await register({
      username: form.username.trim(),
      email: form.email.trim(),
      password: form.password
    })
    const user = data?.user
    if (!user?.token) {
      alertMessage.value = '注册失败，请稍后重试'
      return
    }
    auth.setAuth(user, user.token)
    toast.success('注册成功，欢迎加入')
    router.replace(safeRedirect(route.query.redirect))
  } catch (e) {
    // 后端对「用户名已占用 / 邮箱已注册」返回的是 errors.body，不是字段键
    const { fieldMap, first } = extractErrors(e)
    fieldErrors.username = pickFieldError(fieldMap, 'username')
    fieldErrors.email = pickFieldError(fieldMap, 'email')
    fieldErrors.password = pickFieldError(fieldMap, 'password')
    if (!fieldErrors.username && !fieldErrors.email && !fieldErrors.password) {
      alertMessage.value = first
    }
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

@media (min-width: 1024px) {
  .auth {
    grid-template-columns: minmax(0, 3fr) minmax(0, 2fr);
  }

  .auth__brand {
    display: block;
  }
}
</style>
