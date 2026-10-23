<template>
  <header class="nav">
    <div class="nav__inner">
      <router-link to="/" class="nav__wordmark" aria-label="Conduit 首页">
        <span class="nav__wordmark-full">Conduit</span>
        <span class="nav__wordmark-short" aria-hidden="true">C</span>
      </router-link>

      <div class="nav__search">
        <AppIcon name="search" :size="16" class="nav__search-icon" />
        <input
          ref="searchRef"
          v-model="searchText"
          class="nav__search-input"
          type="text"
          role="searchbox"
          aria-label="搜索文章、标签"
          placeholder="搜索文章、标签…"
          @input="onSearchInput"
          @keydown.enter.prevent="onSearchCommit"
          @keydown.esc="onSearchClear"
        />
        <kbd class="nav__kbd" aria-hidden="true">⌘K</kbd>
      </div>

      <div class="nav__actions">
        <template v-if="auth.isAuthenticated()">
          <router-link to="/editor" class="btn btn--primary btn--pill nav__write">写文章</router-link>

          <div ref="menuWrapRef" class="nav__avatar-wrap">
            <button
              ref="avatarBtnRef"
              type="button"
              class="nav__avatar-btn"
              aria-haspopup="menu"
              :aria-expanded="menuOpen ? 'true' : 'false'"
              :aria-label="`打开用户菜单：${auth.state.user?.username || ''}`"
              @click="toggleMenu"
            >
              <Avatar
                :src="auth.state.user?.image"
                :username="auth.state.user?.username"
                :size="32"
              />
            </button>
            <UserMenu v-if="menuOpen" @close="closeMenu" />
          </div>
        </template>

        <template v-else>
          <router-link to="/login" class="btn btn--ghost btn--pill nav__login">登录</router-link>
          <router-link to="/register" class="btn btn--primary btn--pill nav__write">开始写作</router-link>
        </template>

        <button
          ref="hamburgerRef"
          type="button"
          class="btn btn--icon nav__hamburger"
          aria-label="打开菜单"
          @click="$emit('open-drawer')"
        >
          <AppIcon name="menu" :size="22" />
        </button>
      </div>
    </div>
  </header>
</template>

<script setup>
/**
 * 全局导航
 *
 * 视觉约定：sticky + 82% 白底 + 12px 毛玻璃，**完全不加阴影**。
 * 阴影会让 64px 的顶栏在滚动时一直「压」在内容上，而 1px 边框已经足够分层。
 *
 * 搜索框直接接 useSearchBox：输入 300ms 后写 URL 的 ?q=，
 * 列表页（useArticleList）以 URL 为唯一状态源，所以这里不需要 emit 任何事件。
 */
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { auth } from '../store/auth'
import { useSearchBox } from '../composables/useSearchBox'
import AppIcon from './ui/AppIcon.vue'
import Avatar from './ui/Avatar.vue'
import UserMenu from './UserMenu.vue'

defineEmits(['open-drawer'])

const searchRef = ref(null)
const menuWrapRef = ref(null)
const avatarBtnRef = ref(null)
const hamburgerRef = ref(null)
const menuOpen = ref(false)

const {
  query: searchText,
  onInput: onSearchInput,
  commit: onSearchCommit,
  clear: onSearchClear
} = useSearchBox()

function focusSearch() {
  searchRef.value?.focus()
  searchRef.value?.select()
}

function toggleMenu() {
  menuOpen.value = !menuOpen.value
}

function closeMenu() {
  menuOpen.value = false
  // 关闭后焦点回到触发按钮，否则键盘用户会「丢位置」
  avatarBtnRef.value?.focus()
}

/**
 * 全局快捷键：`/` 聚焦搜索，`⌘K` / `Ctrl+K` 同效。
 * 在输入框/文本域/contenteditable 里不劫持 `/`——用户可能真的想打一个斜杠。
 */
function onGlobalKeydown(event) {
  const target = event.target
  const tag = target?.tagName
  const isTyping =
    tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target?.isContentEditable

  const isSlash = event.key === '/' && !event.metaKey && !event.ctrlKey && !event.altKey
  const isCmdK = (event.metaKey || event.ctrlKey) && event.key?.toLowerCase() === 'k'

  if (isCmdK || (isSlash && !isTyping)) {
    event.preventDefault()
    focusSearch()
  }
}

// 点导航外部时收起用户菜单（用 mousedown 而不是 click：避免拖选文本被当成「外部点击」）
function onDocumentMousedown(event) {
  if (!menuOpen.value) return
  if (menuWrapRef.value && !menuWrapRef.value.contains(event.target)) {
    menuOpen.value = false
  }
}

onMounted(() => {
  window.addEventListener('keydown', onGlobalKeydown)
  document.addEventListener('mousedown', onDocumentMousedown)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onGlobalKeydown)
  document.removeEventListener('mousedown', onDocumentMousedown)
})

// 抽屉关闭后由 App 调用，把焦点还给汉堡按钮
defineExpose({
  focusSearch,
  focusMenuButton: () => hamburgerRef.value?.focus()
})
</script>

<style scoped>
.nav {
  position: sticky;
  top: 0;
  z-index: var(--z-nav);
  height: var(--nav-h);
  border-bottom: 1px solid var(--color-border);
  /* color-mix 代替半透明白：组件里不允许出现裸颜色值，
     等价于「82% 的表面色 + 18% 透明」，毛玻璃才有东西可透 */
  background: color-mix(in srgb, var(--color-surface) 82%, transparent);
  -webkit-backdrop-filter: blur(12px);
  backdrop-filter: blur(12px);
}

.nav__inner {
  display: flex;
  align-items: center;
  gap: var(--space-6);
  height: 100%;
  max-width: var(--container-xl);
  margin: 0 auto;
  padding: 0 var(--space-6);
}

/* wordmark：用近黑承担品牌重量，字距收紧一点更有「字标」感 */
.nav__wordmark {
  flex: none;
  color: var(--color-ink);
  font-size: var(--text-h3-size);
  font-weight: var(--font-weight-semibold);
  letter-spacing: -0.02em;
  line-height: 1;
}

.nav__wordmark-short {
  display: none;
}

.nav__search {
  position: relative;
  display: flex;
  align-items: center;
  gap: var(--space-2);
  width: 320px;
  height: 36px;
  padding: 0 var(--space-3);
  border: 1px solid transparent;
  border-radius: var(--radius-full);
  background: var(--color-surface-sunken);
  transition:
    border-color var(--dur-fast) var(--ease-out),
    box-shadow var(--dur-fast) var(--ease-out),
    background var(--dur-fast) var(--ease-out);
}

.nav__search:focus-within {
  border-color: var(--color-brand);
  background: var(--color-surface);
  box-shadow: 0 0 0 3px var(--color-brand-soft);
}

.nav__search-icon {
  color: var(--color-text-tertiary);
}

.nav__search-input {
  width: 100%;
  height: 100%;
  border: 0;
  background: none;
  color: var(--color-ink);
  font-size: var(--text-sm-size);
}

.nav__search-input::placeholder {
  color: var(--color-text-tertiary);
}

.nav__search-input:focus {
  outline: none;
}

.nav__kbd {
  flex: none;
  padding: 1px 5px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-surface);
  color: var(--color-text-tertiary);
  font-family: var(--font-sans);
  font-size: var(--text-xs-size);
  line-height: var(--text-xs-lh);
}

.nav__actions {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  margin-left: auto;
}

.nav__avatar-wrap {
  position: relative;
  margin-left: var(--space-1);
}

.nav__avatar-btn {
  display: inline-flex;
  border-radius: var(--radius-full);
  line-height: 0;
}

.nav__avatar-btn:hover {
  box-shadow: 0 0 0 3px var(--color-brand-soft);
}

/* 汉堡按钮只在 <768 出现 */
.nav__hamburger {
  display: none;
}

@media (max-width: 1023px) {
  .nav__search {
    width: 220px;
  }
}

@media (max-width: 767px) {
  .nav__inner {
    gap: var(--space-3);
    padding: 0 var(--space-4);
  }

  /* 移动端：wordmark 缩为单字母，搜索与桌面操作区让位给抽屉 */
  .nav__wordmark-full {
    display: none;
  }

  .nav__wordmark-short {
    display: inline;
  }

  .nav__search,
  .nav__login,
  .nav__write {
    display: none;
  }

  .nav__hamburger {
    display: inline-flex;
  }
}
</style>
