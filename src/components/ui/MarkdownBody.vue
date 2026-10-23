<template>
  <div
    ref="hostRef"
    class="markdown-body"
    :aria-busy="!ready ? 'true' : 'false'"
    @click="onHostClick"
    v-html="html"
  />
</template>

<script setup>
/**
 * Markdown 渲染组件 —— 全项目**唯一**允许 v-html 的地方。
 *
 * 安全性来自 utils/markdown.js 的 html:false：所有正文文本都被转义，
 * 不会有可执行的 script / on* 属性进入 DOM。
 *
 * 渲染器用动态 import：markdown-it + highlight.js 约 160KB（gzip ~68KB），
 * 只应作为独立 chunk 由「详情 / 编辑器」两个懒路由拉取，绝不该进首屏。
 *
 * ⚠ 使用方约定：**在把正文交给本组件之前**先把渲染器拉起来
 * （详情页用 Promise.all 与文章请求并行 await，见 ArticleDetail）。
 * 否则会出现「.markdown-body 已挂进 DOM、html 还是空串」的空帧，
 * 表现为正文区先白一下再出内容。
 */
import { nextTick, ref, watch } from 'vue'
import { toast } from '../../composables/useToast'

const props = defineProps({
  content: { type: String, required: true },
  // 是否生成标题锚点并对外广播目录
  anchor: { type: Boolean, default: true }
})

const emit = defineEmits(['toc'])

const hostRef = ref(null)
const html = ref('')
const ready = ref(false)

let modulePromise = null

/** 复用同一个 import promise：重复调用只有一次网络请求（同一 URL 的模块在浏览器里天然共享） */
function loadRenderer() {
  if (!modulePromise) {
    modulePromise = import('../../utils/markdown')
  }
  return modulePromise
}

watch(
  () => props.content,
  async (src) => {
    try {
      const { parseMarkdown } = await loadRenderer()
      const result = parseMarkdown(src || '')
      html.value = result.html
      ready.value = true
      if (props.anchor) {
        emit('toc', result.toc)
      }
    } catch (e) {
      // 渲染器 chunk 拉取失败（断网 / 构建产物缺文件）：不能把正文整块吞掉，
      // 给一句静态提示（不含用户内容，故无 XSS 风险）并告知用户
      html.value = ''
      ready.value = true
      toast.error('正文渲染失败，请刷新页面重试')
    }
  },
  { immediate: true }
)

/**
 * 代码块复制：事件委托挂在容器上。
 * 20 个代码块只对应 1 个 listener，也避免了 v-html 重渲染后要重新绑定的问题。
 */
async function onHostClick(event) {
  const button = event.target?.closest?.('.code-copy')
  if (!button) return

  const code = button.parentElement?.querySelector('code')
  const text = code?.textContent || ''
  if (!text) return

  try {
    await navigator.clipboard.writeText(text)
    toast.success('代码已复制')
  } catch (e) {
    // 非 https / 无剪贴板权限时会走到这里，给出可操作的替代方案
    toast.error('复制失败，请手动选中代码复制')
  } finally {
    await nextTick()
  }
}
</script>

<style scoped>
.markdown-body {
  min-height: 40px;
}

/* v-html 内部节点不属于 scoped 作用域的常规选择器，
   这里用 :deep() 才能命中渲染出来的 .code-block */
.markdown-body :deep(.code-block) {
  position: relative;
}

.markdown-body :deep(.code-copy) {
  position: absolute;
  top: var(--space-2);
  right: var(--space-2);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--color-border);
  background: var(--color-surface-sunken);
  color: var(--color-text-secondary);
  opacity: 0;
  transition: opacity var(--dur-fast) var(--ease-out);
}

/* 只在悬停代码块时出现：常驻会挡住代码首行 */
.markdown-body :deep(.code-block:hover .code-copy),
.markdown-body :deep(.code-copy:focus-visible) {
  opacity: 1;
}

.markdown-body :deep(.code-copy:hover) {
  color: var(--color-ink);
  border-color: var(--color-border-strong);
}
</style>
