<template>
  <span class="draft-pill">草稿</span>
</template>

<script setup>
/**
 * 草稿状态胶囊。
 *
 * 刻意做成独立组件而不是内联 span：它会在编辑器工具栏、草稿箱卡片、
 * 详情页提示条三处出现，样式必须完全一致；散落三处迟早有人只改了两处。
 *
 * 配色只用既有令牌，不引入新色值：中性底 + 次级文字色，
 * 不用黄色/橙色这类「警告色」—— 草稿是一种正常状态，不是错误。
 */
</script>

<style scoped>
.draft-pill {
  display: inline-flex;
  align-items: center;
  height: 20px;
  padding: 0 var(--space-2);
  border: 1px solid var(--color-border-strong);
  border-radius: var(--radius-full);
  background: var(--color-surface-sunken);
  color: var(--color-text-secondary);
  font-size: var(--text-xs-size);
  font-weight: var(--font-weight-medium);
  line-height: 1;
  white-space: nowrap;
}
</style>
