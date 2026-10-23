<template>
  <div ref="rootRef" class="user-menu" role="menu" aria-label="用户菜单">
    <router-link
      :to="`/profile/${username}`"
      class="user-menu__item"
      role="menuitem"
      @click="$emit('close')"
    >
      <AppIcon name="user" :size="16" />
      <span>个人主页</span>
    </router-link>

    <router-link to="/settings" class="user-menu__item" role="menuitem" @click="$emit('close')">
      <AppIcon name="settings" :size="16" />
      <span>设置</span>
    </router-link>

    <div class="user-menu__divider" role="separator" />

    <button type="button" class="user-menu__item user-menu__item--danger" role="menuitem" @click="logout">
      <AppIcon name="logout" :size="16" />
      <span>退出登录</span>
    </button>
  </div>
</template>

<script setup>
/**
 * 头像下拉菜单
 *
 * 键盘可达性三件套必须齐：Esc 关闭、↑↓ 在项间移动、打开后焦点落在第一项。
 * 少了任何一个，键盘用户打开菜单后就会「困住」或「跳走」。
 */
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { auth } from '../store/auth'
import AppIcon from './ui/AppIcon.vue'

const emit = defineEmits(['close'])

const router = useRouter()
const rootRef = ref(null)
const username = auth.state.user?.username || ''

function focusables() {
  if (!rootRef.value) return []
  return Array.from(rootRef.value.querySelectorAll('[role="menuitem"]'))
}

function onKeydown(event) {
  if (event.key === 'Escape') {
    event.preventDefault()
    emit('close')
    return
  }

  if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return

  const items = focusables()
  if (!items.length) return
  event.preventDefault()

  const current = items.indexOf(document.activeElement)
  const delta = event.key === 'ArrowDown' ? 1 : -1
  // 循环移动：末项按 ↓ 回到首项，首项按 ↑ 到末项
  const next = (current + delta + items.length) % items.length
  items[next].focus()
}

function logout() {
  auth.clearAuth()
  emit('close')
  router.push('/')
}

onMounted(() => {
  document.addEventListener('keydown', onKeydown)
  // 打开即聚焦首项，屏幕阅读器与键盘都能马上接管
  focusables()[0]?.focus()
})

onBeforeUnmount(() => {
  document.removeEventListener('keydown', onKeydown)
})
</script>

<style scoped>
.user-menu {
  position: absolute;
  top: calc(100% + var(--space-2));
  right: 0;
  z-index: var(--z-menu);
  width: 180px;
  padding: var(--space-1);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-surface);
  box-shadow: var(--shadow-md);
}

.user-menu__item {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  width: 100%;
  padding: var(--space-2) var(--space-3);
  border-radius: var(--radius-sm);
  color: var(--color-text);
  font-size: var(--text-sm-size);
  line-height: var(--text-sm-lh);
  text-align: left;
  cursor: pointer;
}

.user-menu__item:hover,
.user-menu__item:focus-visible {
  background: var(--color-surface-sunken);
  color: var(--color-ink);
  outline: none;
}

.user-menu__item--danger {
  color: var(--color-danger);
}

.user-menu__item--danger:hover,
.user-menu__item--danger:focus-visible {
  background: var(--color-danger-soft);
  color: var(--color-danger);
}

.user-menu__divider {
  height: 1px;
  margin: var(--space-1) 0;
  background: var(--color-border);
}
</style>
