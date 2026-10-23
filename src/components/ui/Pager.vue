<template>
  <!-- pageCount<=1 时整块不渲染：只有一页的分页器是纯噪音 -->
  <nav v-if="pageCount > 1" class="pager" aria-label="分页">
    <button
      type="button"
      class="pager__arrow"
      :disabled="disabled || page <= 1"
      aria-label="上一页"
      @click="go(page - 1)"
    >
      <AppIcon name="chevron-left" :size="18" />
    </button>

    <template v-for="(item, index) in items" :key="`${item}-${index}`">
      <span v-if="item === '…'" class="pager__gap" aria-hidden="true">…</span>
      <button
        v-else
        type="button"
        class="pager__num"
        :class="{ 'pager__num--current': item === page }"
        :disabled="disabled"
        :aria-current="item === page ? 'page' : null"
        @click="go(item)"
      >{{ item }}</button>
    </template>

    <button
      type="button"
      class="pager__arrow"
      :disabled="disabled || page >= pageCount"
      aria-label="下一页"
      @click="go(page + 1)"
    >
      <AppIcon name="chevron-right" :size="18" />
    </button>
  </nav>
</template>

<script setup>
/**
 * 分页器：对外永远是 1 基页码。
 *
 * 折叠规则（与 PRD 一致）：总页数 >7 时只保留「首页、末页、当前页±1」，
 * 中间断档用 … 表示。用 Set 收集再排序，天然去重、天然处理边界
 * （当前页在第 1 页或最后一页时不会出现 `0` 或 `pageCount+1`）。
 */
import { computed } from 'vue'
import AppIcon from './AppIcon.vue'

const props = defineProps({
  page: { type: Number, default: 1 },
  pageCount: { type: Number, required: true },
  disabled: { type: Boolean, default: false }
})

const emit = defineEmits(['update:page'])

const items = computed(() => {
  const total = Math.max(1, props.pageCount)
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1)
  }

  const keep = new Set([1, total, props.page, props.page - 1, props.page + 1])
  const pages = [...keep].filter((n) => n >= 1 && n <= total).sort((a, b) => a - b)

  const out = []
  let prev = 0
  for (const n of pages) {
    if (prev && n - prev > 1) {
      out.push('…')
    }
    out.push(n)
    prev = n
  }
  return out
})

function go(target) {
  if (props.disabled) return
  if (target < 1 || target > props.pageCount || target === props.page) return
  emit('update:page', target)
}
</script>

<style scoped>
.pager {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  padding: var(--space-8) 0 var(--space-4);
}

.pager__num,
.pager__arrow {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 36px;
  height: 36px;
  padding: 0 var(--space-2);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-surface);
  color: var(--color-text);
  font-size: var(--text-sm-size);
  font-variant-numeric: tabular-nums;
  transition:
    border-color var(--dur-fast) var(--ease-out),
    background var(--dur-fast) var(--ease-out),
    color var(--dur-fast) var(--ease-out);
}

.pager__num:hover:not(:disabled),
.pager__arrow:hover:not(:disabled) {
  border-color: var(--color-border-strong);
  color: var(--color-ink);
}

.pager__num--current {
  border-color: var(--color-ink);
  background: var(--color-ink);
  color: var(--color-surface);
}

.pager__num--current:hover:not(:disabled) {
  color: var(--color-surface);
}

.pager__arrow:disabled,
.pager__num:disabled {
  color: var(--color-text-tertiary);
  cursor: not-allowed;
}

.pager__gap {
  min-width: 24px;
  color: var(--color-text-tertiary);
  text-align: center;
}
</style>
