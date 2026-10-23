<template>
  <Teleport to="body">
    <Transition name="drawer">
      <div v-if="open" class="drawer-root">
        <!-- 遮罩：点击关闭；不用 <a href="#">，避免污染历史记录 -->
        <div class="drawer__scrim" @click="$emit('close')" />

        <aside
          ref="panelRef"
          class="drawer"
          role="dialog"
          aria-modal="true"
          aria-label="站点导航"
          @keydown="onKeydown"
        >
          <div class="drawer__head">
            <span class="drawer__title">Conduit</span>
            <button type="button" class="btn btn--icon" aria-label="关闭菜单" @click="$emit('close')">
              <AppIcon name="close" :size="20" />
            </button>
          </div>

          <div class="drawer__search">
            <AppIcon name="search" :size="16" class="drawer__search-icon" />
            <input
              v-model="searchText"
              class="drawer__search-input"
              type="text"
              aria-label="搜索文章、标签"
              placeholder="搜索文章、标签…"
              @input="onSearchInput"
              @keydown.enter.prevent="submitSearch"
            />
          </div>

          <nav class="drawer__nav">
            <router-link to="/" class="drawer__link" @click="$emit('close')">首页</router-link>
            <router-link
              v-if="username"
              :to="`/profile/${username}`"
              class="drawer__link"
              @click="$emit('close')"
            >我的主页</router-link>
            <router-link v-if="isAuthed" to="/editor" class="drawer__link" @click="$emit('close')">
              写文章
            </router-link>
            <router-link v-if="isAuthed" to="/settings" class="drawer__link" @click="$emit('close')">
              设置
            </router-link>
          </nav>

          <div class="drawer__foot">
            <template v-if="isAuthed">
              <div class="drawer__user">
                <Avatar :src="auth.state.user?.image" :username="username" :size="32" />
                <div class="drawer__user-meta">
                  <span class="drawer__user-name">{{ username }}</span>
                  <span class="drawer__user-mail">{{ auth.state.user?.email }}</span>
                </div>
              </div>
              <button type="button" class="btn btn--danger btn--block" @click="logout">退出登录</button>
            </template>
            <template v-else>
              <router-link to="/login" class="btn btn--ghost btn--block" @click="$emit('close')">
                登录
              </router-link>
              <router-link to="/register" class="btn btn--primary btn--block" @click="$emit('close')">
                开始写作
              </router-link>
            </template>
          </div>
        </aside>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
/**
 * 移动端右侧抽屉
 *
 * 三个必须做对的细节：
 * 1) 焦点陷阱：抽屉打开后 Tab 不能跑到背后的页面上去；
 * 2) 滚动锁：抽屉打开时 body 不跟着滚（否则手指在抽屉上滑会带动底页）；
 * 3) 焦点归还：关闭后焦点回到汉堡按钮（由 App 调 AppNav 的 focusMenuButton 完成）。
 */
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { auth } from '../store/auth'
import { useSearchBox } from '../composables/useSearchBox'
import AppIcon from './ui/AppIcon.vue'
import Avatar from './ui/Avatar.vue'

const props = defineProps({
  open: { type: Boolean, default: false }
})

const emit = defineEmits(['close'])

const router = useRouter()
const panelRef = ref(null)

// 抽屉里的搜索与顶栏共用同一套「写 URL」逻辑（同一个 composable、同一份 URL 状态），
// 只是提交后顺手把抽屉关掉
const {
  query: searchText,
  onInput: onSearchInput,
  commit: commitSearch
} = useSearchBox()

// 必须用 computed：抽屉在 App 里是常驻组件（只切 open，不销毁重建），
// 若在这里用 const 取一次快照，用户登录后抽屉仍会显示「登录/注册」。
const isAuthed = computed(() => auth.isAuthenticated())
const username = computed(() => auth.state.user?.username || '')

const FOCUSABLE = 'a[href], button:not([disabled]), input, textarea, select, [tabindex]:not([tabindex="-1"])'

function focusables() {
  if (!panelRef.value) return []
  return Array.from(panelRef.value.querySelectorAll(FOCUSABLE)).filter(
    (el) => el.offsetParent !== null
  )
}

/**
 * 焦点陷阱：只在抽屉内部处理 Tab，Esc 交给 document 级监听（见 onDocumentKeydown）。
 * 两者分工是为了「不双重触发」——同一个 Esc 只会有一个人处理。
 */
function onKeydown(event) {
  if (event.key !== 'Tab') return

  const items = focusables()
  if (!items.length) return
  const first = items[0]
  const last = items[items.length - 1]
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault()
    last.focus()
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault()
    first.focus()
  }
}

/**
 * Esc 兜底：焦点落在遮罩上、或用户点过非聚焦区域时，aside 上的 keydown 收不到事件，
 * 抽屉就关不掉了。document 级监听才能保证「任何时候按 Esc 都能关」。
 */
function onDocumentKeydown(event) {
  if (event.key !== 'Escape' || !props.open) return
  event.preventDefault()
  emit('close')
}

function submitSearch() {
  commitSearch()
  emit('close')
}

function logout() {
  auth.clearAuth()
  emit('close')
  router.push('/')
}

watch(
  () => props.open,
  async (open) => {
    if (open) {
      document.body.style.overflow = 'hidden'
      await nextTick()
      focusables()[0]?.focus()
    } else {
      document.body.style.overflow = ''
      // 关闭时不清空 searchText：它由 URL 的 ?q= 驱动，
      // 清空会把用户正在看的搜索结果也一起抹掉
    }
  }
)

onMounted(() => {
  // 抽屉常驻挂载（只切 open），所以监听在挂载时装一次，闭包里用 props.open 判断
  document.addEventListener('keydown', onDocumentKeydown)
})

onBeforeUnmount(() => {
  document.removeEventListener('keydown', onDocumentKeydown)
  // 组件被意外卸载（例如路由跳转）时也要解锁，否则整站无法滚动
  document.body.style.overflow = ''
})
</script>

<style scoped>
.drawer-root {
  position: fixed;
  inset: 0;
  z-index: var(--z-drawer);
}

.drawer__scrim {
  position: absolute;
  inset: 0;
  background: color-mix(in srgb, var(--color-ink) 32%, transparent);
}

.drawer {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  display: flex;
  flex-direction: column;
  width: 280px;
  padding: var(--space-4);
  gap: var(--space-4);
  background: var(--color-surface);
  box-shadow: var(--shadow-lg);
  overflow-y: auto;
}

.drawer__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.drawer__title {
  color: var(--color-ink);
  font-size: var(--text-h4-size);
  font-weight: var(--font-weight-semibold);
  letter-spacing: -0.02em;
}

.drawer__search {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  height: 40px;
  padding: 0 var(--space-3);
  border: 1px solid transparent;
  border-radius: var(--radius-full);
  background: var(--color-surface-sunken);
}

.drawer__search:focus-within {
  border-color: var(--color-brand);
  box-shadow: 0 0 0 3px var(--color-brand-soft);
}

.drawer__search-icon {
  color: var(--color-text-tertiary);
}

.drawer__search-input {
  width: 100%;
  border: 0;
  background: none;
  color: var(--color-ink);
  font-size: var(--text-sm-size);
}

.drawer__search-input:focus {
  outline: none;
}

.drawer__nav {
  display: flex;
  flex-direction: column;
  border-top: 1px solid var(--color-border);
}

.drawer__link {
  padding: var(--space-3) var(--space-2);
  border-bottom: 1px solid var(--color-border);
  color: var(--color-text);
  font-size: var(--text-body-size);
}

.drawer__link:hover {
  color: var(--color-brand);
}

.drawer__foot {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  margin-top: auto;
  padding-top: var(--space-4);
}

.drawer__user {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}

.drawer__user-meta {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.drawer__user-name {
  color: var(--color-ink);
  font-size: var(--text-sm-size);
  font-weight: var(--font-weight-medium);
}

.drawer__user-mail {
  overflow: hidden;
  color: var(--color-text-tertiary);
  font-size: var(--text-xs-size);
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* 抽屉从右侧滑入，遮罩淡入 */
.drawer-enter-active,
.drawer-leave-active {
  transition: opacity var(--dur-slow) var(--ease-out);
}

.drawer-enter-active .drawer,
.drawer-leave-active .drawer {
  transition: transform var(--dur-slow) var(--ease-out);
}

.drawer-enter-from,
.drawer-leave-to {
  opacity: 0;
}

.drawer-enter-from .drawer,
.drawer-leave-to .drawer {
  transform: translateX(100%);
}
</style>
