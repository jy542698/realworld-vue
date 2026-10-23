<template>
  <div class="error-state" role="alert">
    <AppIcon name="close" :size="28" class="error-state__icon" />
    <p class="error-state__msg">{{ message }}</p>
    <button type="button" class="btn btn--ghost btn--pill" @click="$emit('retry')">重试</button>
  </div>
</template>

<script setup>
/**
 * 错误态：一句可读的中文 + 一个重试按钮。
 * 不把 err.stack / 英文原文暴露给用户，也不自动重试（自动重试在断网时会变成请求风暴）。
 */
import AppIcon from './AppIcon.vue'

defineProps({
  message: { type: String, default: '加载失败，请稍后再试' }
})

defineEmits(['retry'])
</script>

<style scoped>
.error-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-16) var(--space-6);
  text-align: center;
}

.error-state__icon {
  color: var(--color-danger);
  opacity: 0.7;
}

.error-state__msg {
  max-width: 420px;
  color: var(--color-text-secondary);
  font-size: var(--text-body-size);
  line-height: var(--text-body-lh);
}
</style>
