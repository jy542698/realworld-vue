<template>
  <img
    v-if="src && !failed"
    class="avatar"
    :src="src"
    :alt="altText"
    :width="size"
    :height="size"
    loading="lazy"
    decoding="async"
    @error="failed = true"
  />
  <span
    v-else
    class="avatar avatar--fallback"
    :style="fallbackStyle"
    :aria-label="altText"
    role="img"
  >{{ initial }}</span>
</template>

<script setup>
/**
 * 头像：图片优先，任何异常（空 src / 404 / 防盗链）都退回「首字母色块」。
 * 为什么不用 background-image：<img> 才有 loading="lazy" 与 alt，
 * 列表页 20 个头像能真正延迟加载，而不是全部计入首屏请求。
 */
import { computed, ref, watch } from 'vue'

const props = defineProps({
  src: { type: String, default: '' },
  username: { type: String, default: '' },
  size: { type: Number, default: 32 }
})

// 换了 username 就重试图片（例如从 A 的主页跳到 B 的主页）
const failed = ref(false)
watch(
  () => props.src,
  () => {
    failed.value = false
  }
)

const initial = computed(() => (props.username || '?').trim().charAt(0).toUpperCase() || '?')

const altText = computed(() => (props.username ? `${props.username} 的头像` : '用户头像'))

const fallbackStyle = computed(() => ({
  width: `${props.size}px`,
  height: `${props.size}px`,
  // 字号跟尺寸走，24 以下不再缩小，否则中文首字母糊成一团
  fontSize: `${Math.max(12, Math.round(props.size * 0.42))}px`
}))
</script>

<style scoped>
.avatar {
  flex: none;
  border-radius: var(--radius-full);
  background: var(--color-surface-sunken);
  object-fit: cover;
}

.avatar--fallback {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: var(--color-brand-soft);
  color: var(--color-brand-strong);
  font-weight: var(--font-weight-semibold);
  line-height: 1;
  user-select: none;
}
</style>
