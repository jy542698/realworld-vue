<template>
  <!-- inline：行内小骨架，用于「按钮旁/侧栏」这类小块 -->
  <div v-if="variant === 'inline'" class="loading loading--inline" aria-hidden="true">
    <span v-for="i in rows" :key="i" class="skeleton loading__line" />
  </div>

  <!-- detail：详情页（标题 + meta + 正文段） -->
  <div v-else-if="variant === 'detail'" class="loading loading--detail" aria-hidden="true">
    <span class="skeleton loading__title" />
    <span class="skeleton loading__meta" />
    <span class="skeleton loading__divider" />
    <span v-for="i in rows" :key="i" class="skeleton loading__para" :class="{ 'loading__para--short': i === rows }" />
  </div>

  <!-- list：文章列表骨架，卡片高度必须与真实卡片一致，否则加载完成时会跳一下 -->
  <div v-else class="loading loading--list" aria-hidden="true">
    <div v-for="i in rows" :key="i" class="skeleton loading__card">
      <span class="loading__card-meta" />
      <span class="loading__card-title" />
      <span class="loading__card-desc" />
      <span class="loading__card-pills" />
    </div>
  </div>
</template>

<script setup>
/**
 * 加载态骨架。
 *
 * 高度对齐是这里唯一的技术要求：骨架卡高 200px 与 ArticleCard 的 min-height 完全一致
 * （2026-10 批次 B 已双向核对：padding 20+20 + meta 24 + 标题 28 + 摘要两行 48 + 胶囊 24
 * + gap 12×3 = 200）。两边任何一侧改了这些数值，另一侧必须同步，
 * 否则数据到达时列表会整体跳一下。变量 --skeleton-card-h 暴露出来就是为了对齐。
 */
defineProps({
  // list：列表卡片；detail：详情页；inline：行内小块
  variant: { type: String, default: 'list' },
  rows: { type: Number, default: 3 }
})
</script>

<style scoped>
.loading {
  --skeleton-card-h: 200px;
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.loading--list {
  gap: var(--space-3);
}

.loading__card {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  /* 用 min-height 而不是 height：与 ArticleCard 的 min-height 语义一致，
     边框/内边距的累计方式完全相同，两边才能真正等高 */
  min-height: var(--skeleton-card-h);
  padding: var(--space-5) var(--space-6);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  background: var(--color-surface);
}

.loading__card-meta {
  width: 40%;
  height: 24px;
  border-radius: var(--radius-sm);
  background: var(--color-surface-sunken);
}

.loading__card-title {
  width: 72%;
  height: 28px;
  border-radius: var(--radius-sm);
  background: var(--color-surface-sunken);
}

.loading__card-desc {
  width: 100%;
  height: 48px;
  border-radius: var(--radius-sm);
  background: var(--color-surface-sunken);
}

.loading__card-pills {
  width: 30%;
  height: 24px;
  border-radius: var(--radius-full);
  background: var(--color-surface-sunken);
}

.loading--detail {
  gap: var(--space-4);
}

.loading__title {
  width: 70%;
  height: 40px;
}

.loading__meta {
  width: 45%;
  height: 20px;
}

.loading__divider {
  width: 100%;
  height: 1px;
}

.loading__para {
  width: 100%;
  height: 28px;
}

.loading__para--short {
  width: 60%;
}

.loading--inline {
  gap: var(--space-2);
}

.loading__line {
  width: 100%;
  height: 12px;
}

/* 省电/晕动敏感用户：不做 shimmer，静态灰块即可 */
@media (prefers-reduced-motion: reduce) {
  .skeleton {
    animation: none;
    background-image: none;
  }
}
</style>
