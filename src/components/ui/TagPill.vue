<template>
  <span class="tag-pill pill" :class="{ 'pill--active': active }">
    <button
      type="button"
      class="tag-pill__label"
      :aria-pressed="active ? 'true' : 'false'"
      @click="$emit('click', name)"
    >{{ name }}</button>
    <span v-if="count !== null && count !== undefined" class="tag-pill__count">{{ count }}</span>
    <button
      v-if="closable"
      type="button"
      class="tag-pill__remove"
      :aria-label="`移除标签 ${name}`"
      @click.stop="$emit('remove', name)"
    >
      <AppIcon name="close" :size="12" />
    </button>
  </span>
</template>

<script setup>
/**
 * 标签胶囊：**只负责展示与抛事件**，不 import router。
 *
 * 原因：同一个胶囊在首页是「筛选」、在详情页是「跳转」、在编辑器是「删除」。
 * 组件一旦自己拼 URL，三处语义就会打架；由父组件决定点击后做什么才对。
 */
import AppIcon from './AppIcon.vue'

defineProps({
  name: { type: String, required: true },
  count: { type: Number, default: null },
  active: { type: Boolean, default: false },
  closable: { type: Boolean, default: false }
})

defineEmits(['click', 'remove'])
</script>

<style scoped>
.tag-pill {
  height: 24px;
  padding: 0 var(--space-2);
  gap: var(--space-1);
}

.tag-pill__label {
  color: inherit;
  font-size: inherit;
  font-weight: inherit;
  line-height: 1;
  cursor: pointer;
}

.tag-pill__label:hover {
  color: var(--color-brand);
}

.tag-pill__count {
  color: var(--color-text-tertiary);
  font-size: var(--text-xs-size);
  font-variant-numeric: tabular-nums;
}

.tag-pill__remove {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  margin-right: -2px;
  border-radius: var(--radius-full);
  color: var(--color-text-tertiary);
}

.tag-pill__remove:hover {
  background: var(--color-border);
  color: var(--color-ink);
}
</style>
