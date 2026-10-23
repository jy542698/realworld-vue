<template>
  <aside v-if="items.length" class="toc" aria-label="目录">
    <p class="toc__title">本文目录</p>
    <ul class="toc__list">
      <li v-for="item in items" :key="item.id">
        <a
          class="toc__link"
          :class="{
            'toc__link--active': item.id === activeId,
            'toc__link--sub': item.level === 3
          }"
          :href="`#${item.id}`"
          @click.prevent="jump(item.id)"
        >{{ item.text }}</a>
      </li>
    </ul>
  </aside>
</template>

<script setup>
/**
 * 详情页右侧目录
 *
 * 高亮判定用 IntersectionObserver 而不是 scroll 事件：
 * scroll 里做 getBoundingClientRect 会在长文里触发几十次强制同步布局，肉眼可见掉帧。
 * rootMargin 上方留 72px（sticky 导航高度 + 余量），下方 -70% 表示
 * 「只有进入视口顶部 30% 的标题才算当前小节」——这样滚到段中时不会来回跳。
 */
import { nextTick, onBeforeUnmount, ref, watch } from 'vue'

const props = defineProps({
  items: { type: Array, default: () => [] }
})

const activeId = ref('')
let observer = null

function teardown() {
  if (observer) {
    observer.disconnect()
    observer = null
  }
}

function setup() {
  teardown()
  if (!props.items.length || typeof IntersectionObserver === 'undefined') return

  const visible = new Set()

  observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        const id = entry.target.id
        if (entry.isIntersecting) visible.add(id)
        else visible.delete(id)
      }
      // 取文档顺序里最靠上的「正在视口内」的标题：那才是用户正在读的小节
      const ordered = props.items.map((item) => item.id)
      const next = [...visible].sort((a, b) => ordered.indexOf(a) - ordered.indexOf(b)).find(Boolean)
      if (next) activeId.value = next
    },
    { rootMargin: '-72px 0px -70% 0px', threshold: 0 }
  )

  for (const item of props.items) {
    if (!item.id) continue
    const el = document.getElementById(item.id)
    if (el) observer.observe(el)
  }
}

function jump(id) {
  const el = document.getElementById(id)
  if (!el) return
  el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  activeId.value = id
  // 同步地址栏哈希，方便复制小节链接（用 replace 避免污染历史）
  history.replaceState(null, '', `#${id}`)
}

watch(
  () => props.items,
  async () => {
    await nextTick()
    setup()
  },
  { immediate: true }
)

onBeforeUnmount(teardown)
</script>

<style scoped>
.toc {
  position: sticky;
  top: calc(var(--nav-h) + var(--space-4));
  width: 220px;
  max-height: calc(100vh - var(--nav-h) - var(--space-8));
  overflow-y: auto;
}

.toc__title {
  margin-bottom: var(--space-2);
  color: var(--color-text-tertiary);
  font-size: var(--text-xs-size);
  font-weight: var(--font-weight-medium);
  letter-spacing: 0.04em;
}

.toc__list {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.toc__link {
  display: block;
  padding: var(--space-1) 0 var(--space-1) var(--space-3);
  border-left: 2px solid transparent;
  color: var(--color-text-secondary);
  font-size: var(--text-sm-size);
  line-height: var(--text-sm-lh);
}

.toc__link:hover {
  color: var(--color-ink);
}

.toc__link--sub {
  padding-left: var(--space-5);
}

/* 当前小节：文字变墨色 + 左侧 2px 品牌色竖线 */
.toc__link--active {
  border-left-color: var(--color-brand);
  color: var(--color-ink);
  font-weight: var(--font-weight-medium);
}

/* 只有 ≥1280 才有空间放目录 */
@media (max-width: 1279px) {
  .toc {
    display: none;
  }
}
</style>
