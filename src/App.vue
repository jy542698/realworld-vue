<template>
  <AppNav ref="navRef" @open-drawer="drawerOpen = true" />
  <AppDrawer :open="drawerOpen" @close="closeDrawer" />

  <main class="app-main">
    <router-view />
  </main>

  <ToastHost />
</template>

<script setup>
/**
 * 应用外壳：导航 / 抽屉 / 内容 / Toast 四件事，仅此而已。
 *
 * 具体页面的布局全部下沉到各自视图，App 里出现任何页面级样式都是分层泄漏。
 */
import { onMounted, ref } from 'vue'
import AppNav from './components/AppNav.vue'
import AppDrawer from './components/AppDrawer.vue'
import ToastHost from './components/ToastHost.vue'
import { auth } from './store/auth'

const drawerOpen = ref(false)
const navRef = ref(null)

function closeDrawer() {
  drawerOpen.value = false
  // 关闭后把焦点还给汉堡按钮：键盘/读屏用户才不会「丢失光标位置」
  navRef.value?.focusMenuButton()
}

onMounted(() => {
  // 刷新页面时 token 还在但 user 为空，补全一次；失败会自行 clearAuth，不抛错
  auth.hydrate()
})
</script>
