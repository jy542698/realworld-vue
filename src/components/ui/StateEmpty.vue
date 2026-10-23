<template>
  <div class="empty">
    <!-- 线稿插画：不引图片资源，避免为了一个空态多一个请求和一张要维护的图 -->
    <svg class="empty__art" width="120" height="120" viewBox="0 0 120 120" fill="none" aria-hidden="true">
      <rect x="18" y="26" width="84" height="60" rx="8" stroke="currentColor" stroke-width="2" />
      <path d="M18 42h84" stroke="currentColor" stroke-width="2" />
      <circle cx="28" cy="34" r="2.5" fill="currentColor" />
      <circle cx="37" cy="34" r="2.5" fill="currentColor" />
      <path d="M32 58h40M32 68h56M32 78h28" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
      <path d="M46 96h28" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
      <path d="M60 86v10" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
    </svg>

    <p class="empty__title">{{ title }}</p>
    <p v-if="description" class="empty__desc">{{ description }}</p>

    <!-- CTA 由调用方决定（写第一篇 / 清除筛选 / 回到首页），组件不自造按钮 -->
    <div v-if="$slots.default" class="empty__actions">
      <slot />
    </div>
  </div>
</template>

<script setup>
/**
 * 空态：线稿 + 一句标题 + 一句说明 + 可选 CTA。
 * 空态最怕的是「什么都不说」——所以 title 是必填的，description 才可选。
 */
defineProps({
  title: { type: String, required: true },
  description: { type: String, default: '' }
})
</script>

<style scoped>
.empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-16) var(--space-6);
  text-align: center;
}

.empty__art {
  margin-bottom: var(--space-3);
  color: var(--color-border-strong);
}

.empty__title {
  color: var(--color-ink);
  font-size: var(--text-h4-size);
  font-weight: var(--font-weight-semibold);
  line-height: var(--text-h4-lh);
}

.empty__desc {
  max-width: 380px;
  color: var(--color-text-secondary);
  font-size: var(--text-sm-size);
  line-height: var(--text-sm-lh);
}

.empty__actions {
  margin-top: var(--space-3);
}
</style>
