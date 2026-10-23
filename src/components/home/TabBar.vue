<template>
  <div ref="listRef" class="tabbar" role="tablist" aria-label="文章列表筛选">
    <button
      v-for="tab in tabs"
      :key="tab.key"
      type="button"
      class="tabbar__item"
      :class="{ 'tabbar__item--active': tab.key === active }"
      role="tab"
      :aria-selected="tab.key === active ? 'true' : 'false'"
      :data-key="tab.key"
      @click="$emit('change', tab.key)"
    >
      {{ tab.label }}
    </button>

    <!-- 单条绝对定位指示器：切 Tab 时只改 transform/width，做一次平滑位移，
         比每个 Tab 各画一条下划线更接近「滑块」的观感 -->
    <span class="tabbar__indicator" :style="indicatorStyle" aria-hidden="true" />
  </div>
</template>

<script setup>
/**
 * 下划线 Tab 栏
 *
 * 指示器用一条绝对定位的 span + transform 位移实现：
 * 每个 tab 各自画一条 ::after 的话，切换时是「灭一条亮一条」，
 * 而位移过渡能表达「同一个指示器移过去了」，视觉上更连贯。
 */
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'

const props = defineProps({
  // [{ key, label }]
  tabs: { type: Array, required: true },
  active: { type: String, required: true }
})

defineEmits(['change'])

const listRef = ref(null)
const offset = ref(0)
const width = ref(0)

const indicatorStyle = computed(() => ({
  transform: `translateX(${offset.value}px)`,
  width: `${width.value}px`,
  opacity: width.value ? 1 : 0
}))

function measure() {
  const el = listRef.value?.querySelector(`[data-key="${props.active}"]`)
  if (!el) {
    width.value = 0
    return
  }
  offset.value = el.offsetLeft
  width.value = el.offsetWidth
}

watch(
  () => props.active,
  async () => {
    await nextTick()
    measure()
  }
)

onMounted(() => {
  measure()
  // 字体加载完成 / 窗口缩放都会改变 tab 宽度，指示器必须跟着量
  window.addEventListener('resize', measure)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', measure)
})
</script>

<style scoped>
.tabbar {
  position: relative;
  display: flex;
  gap: var(--space-6);
  border-bottom: 1px solid var(--color-border);
}

.tabbar__item {
  padding: var(--space-3) 0;
  color: var(--color-text-secondary);
  font-size: var(--text-body-size);
  font-weight: var(--font-weight-normal);
  white-space: nowrap;
  transition: color var(--dur-fast) var(--ease-out);
}

.tabbar__item:hover {
  color: var(--color-ink);
}

.tabbar__item--active {
  color: var(--color-ink);
  font-weight: var(--font-weight-semibold);
}

.tabbar__indicator {
  position: absolute;
  bottom: -1px;
  left: 0;
  height: 2px;
  border-radius: var(--radius-full);
  background: var(--color-ink);
  transition:
    transform var(--dur-slow) var(--ease-out),
    width var(--dur-slow) var(--ease-out),
    opacity var(--dur-fast) var(--ease-out);
}
</style>
