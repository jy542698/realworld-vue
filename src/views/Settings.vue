<template>
  <div class="settings">
    <div class="settings__card">
      <h1 class="settings__title">设置</h1>

      <!-- 顶部 alert：一次展示全部错误，用户不用挨个字段找 -->
      <div v-if="alertMessage" class="settings__alert" role="alert">{{ alertMessage }}</div>

      <form class="settings__form" @submit.prevent="save">
        <section class="settings__group">
          <h2 class="settings__group-title">个人资料</h2>

          <div class="field">
            <label class="field__label" for="settings-image">头像地址</label>
            <div class="settings__avatar-row">
              <Avatar :src="form.image" :username="form.username" :size="40" />
              <input
                id="settings-image"
                v-model="form.image"
                class="input"
                type="text"
                placeholder="https://…"
              />
            </div>
            <p v-if="fieldErrors.image" class="field__error">{{ fieldErrors.image }}</p>
          </div>

          <div class="field">
            <label class="field__label" for="settings-username">用户名</label>
            <input id="settings-username" class="input" type="text" :value="form.username" readonly />
            <p class="field__hint">用户名是唯一标识，注册后不可修改。</p>
          </div>

          <div class="field">
            <label class="field__label" for="settings-bio">个人简介</label>
            <textarea
              id="settings-bio"
              v-model="form.bio"
              class="input"
              rows="3"
              maxlength="512"
              placeholder="一句话介绍你自己"
            />
            <p v-if="fieldErrors.bio" class="field__error">{{ fieldErrors.bio }}</p>
          </div>

          <div class="field">
            <label class="field__label" for="settings-email">邮箱</label>
            <input id="settings-email" v-model="form.email" class="input" type="email" />
            <p v-if="fieldErrors.email" class="field__error">{{ fieldErrors.email }}</p>
          </div>
        </section>

        <section class="settings__group">
          <h2 class="settings__group-title">安全</h2>

          <div class="field">
            <label class="field__label" for="settings-password">新密码</label>
            <input
              id="settings-password"
              v-model="form.password"
              class="input"
              type="password"
              autocomplete="new-password"
              placeholder="留空则不修改"
            />
            <p v-if="fieldErrors.password" class="field__error">{{ fieldErrors.password }}</p>
          </div>

          <div class="field">
            <label class="field__label" for="settings-password2">确认新密码</label>
            <input
              id="settings-password2"
              v-model="form.password2"
              class="input"
              type="password"
              autocomplete="new-password"
              placeholder="再输入一次"
            />
            <p v-if="fieldErrors.password2" class="field__error">{{ fieldErrors.password2 }}</p>
          </div>
        </section>

        <div class="settings__actions">
          <button type="submit" class="btn btn--primary btn--lg" :disabled="saving">
            {{ saving ? '保存中…' : '保存设置' }}
          </button>
          <button type="button" class="btn btn--danger settings__logout" @click="logout">
            退出登录
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
/**
 * 设置页（P1-05）
 *
 * 密码留空 = 不改：很多用户只想改简介，如果强制填密码会直接劝退。
 * 客户端先校验（邮箱格式/密码长度/两次一致），再交给后端；
 * 后端返回的字段级错误用 pickFieldError 落到对应输入框下面，其余进顶部 alert。
 */
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { updateUser } from '../api/user'
import { auth } from '../store/auth'
import { toast } from '../composables/useToast'
import { extractErrors, pickFieldError } from '../utils/errors'
import Avatar from '../components/ui/Avatar.vue'

const router = useRouter()

const form = reactive({
  username: auth.state.user?.username || '',
  email: auth.state.user?.email || '',
  bio: auth.state.user?.bio || '',
  image: auth.state.user?.image || '',
  password: '',
  password2: ''
})

const saving = ref(false)
const alertMessage = ref('')
const fieldErrors = reactive({ email: '', bio: '', image: '', password: '', password2: '' })

const isAuthed = computed(() => auth.isAuthenticated())

function clearErrors() {
  alertMessage.value = ''
  for (const key of Object.keys(fieldErrors)) fieldErrors[key] = ''
}

function validate() {
  clearErrors()
  const email = form.email.trim()

  if (!email) fieldErrors.email = '邮箱不能为空'
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) fieldErrors.email = '邮箱格式不正确'

  if (form.bio.length > 512) fieldErrors.bio = '个人简介不能超过 512 个字符'

  if (form.password) {
    if (form.password.length < 8) fieldErrors.password = '密码长度需在 8 到 64 之间'
    else if (form.password.length > 64) fieldErrors.password = '密码长度需在 8 到 64 之间'
    if (form.password !== form.password2) fieldErrors.password2 = '两次输入的密码不一致'
  }

  return !fieldErrors.email && !fieldErrors.bio && !fieldErrors.password && !fieldErrors.password2
}

async function save() {
  if (saving.value || !validate()) return
  saving.value = true

  try {
    const payload = {
      email: form.email.trim(),
      bio: form.bio,
      image: form.image.trim()
    }
    // 空串不下发：后端把「有值」当作要改，空串会把密码改成空密码
    if (form.password) payload.password = form.password

    const { data } = await updateUser(payload)
    if (data?.user) {
      auth.setAuth(data.user, data.user.token || auth.state.token)
    }
    form.password = ''
    form.password2 = ''
    toast.success('设置已保存')
  } catch (e) {
    const { fieldMap, first } = extractErrors(e)
    fieldErrors.email = pickFieldError(fieldMap, 'email')
    fieldErrors.bio = pickFieldError(fieldMap, 'bio')
    fieldErrors.image = pickFieldError(fieldMap, 'image')
    fieldErrors.password = pickFieldError(fieldMap, 'password')

    const hasFieldError =
      fieldErrors.email || fieldErrors.bio || fieldErrors.image || fieldErrors.password
    if (!hasFieldError) alertMessage.value = first
  } finally {
    saving.value = false
  }
}

function logout() {
  auth.clearAuth()
  toast.success('已退出登录')
  router.push('/')
}

onMounted(() => {
  // 路由守卫已经拦过一次，这里兜底：直接输 URL 且 token 失效时不留空白页
  if (!isAuthed.value) {
    router.replace({ path: '/login', query: { redirect: '/settings' } })
  }
})

/**
 * 直接刷新 /settings 时，App 的 auth.hydrate() 可能还在飞，
 * setup 阶段读到的 state.user 是 null。
 * 这里等用户信息到达后「只填空字段」——不覆盖用户已经输入的内容。
 */
watch(
  () => auth.state.user,
  (user) => {
    if (!user) return
    if (!form.username) form.username = user.username || ''
    if (!form.email) form.email = user.email || ''
    if (!form.bio) form.bio = user.bio || ''
    if (!form.image) form.image = user.image || ''
  },
  { immediate: true }
)
</script>

<style scoped>
.settings {
  max-width: 560px;
  margin: 0 auto;
  padding: var(--space-10) var(--space-6) var(--space-16);
}

.settings__card {
  padding: var(--space-8);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-xl);
  background: var(--color-surface);
  box-shadow: var(--shadow-xs);
}

.settings__title {
  color: var(--color-ink);
  font-size: var(--text-h2-size);
  font-weight: var(--font-weight-semibold);
  line-height: var(--text-h2-lh);
}

.settings__alert {
  margin-top: var(--space-4);
  padding: var(--space-3) var(--space-4);
  border-left: 3px solid var(--color-danger);
  border-radius: var(--radius-sm);
  background: var(--color-rose-soft);
  color: var(--color-danger);
  font-size: var(--text-sm-size);
  line-height: var(--text-sm-lh);
}

.settings__form {
  display: flex;
  flex-direction: column;
  gap: var(--space-8);
  margin-top: var(--space-6);
}

.settings__group {
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
}

.settings__group-title {
  color: var(--color-text-secondary);
  font-size: var(--text-xs-size);
  font-weight: var(--font-weight-medium);
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.settings__avatar-row {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}

.settings__actions {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding-top: var(--space-4);
  border-top: 1px solid var(--color-border);
}

.settings__logout {
  margin-left: auto;
}

@media (max-width: 767px) {
  .settings {
    padding: var(--space-5) var(--space-4) var(--space-12);
  }

  .settings__card {
    padding: var(--space-5);
  }
}
</style>
