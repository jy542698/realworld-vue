<template>
  <aside class="brand-panel" aria-hidden="true">
    <div class="brand-panel__grid" />
    <div class="brand-panel__content">
      <p class="brand-panel__wordmark">Conduit</p>
      <p class="brand-panel__slogan">写好一篇，被人读到。</p>

      <ul class="brand-panel__points">
        <li v-for="point in points" :key="point" class="brand-panel__point">
          <span class="brand-panel__tick">—</span>{{ point }}
        </li>
      </ul>
    </div>
  </aside>
</template>

<script setup>
/**
 * 登录/注册右侧品牌区
 *
 * 纯装饰：aria-hidden，且宽屏才渲染（<1024 由父级隐藏）。
 * 背景用「浅品牌色 + 24px 细网格」而不是图片：一张 40KB 的插画会直接拖慢
 * 登录页这种本该秒开的页面。
 */
const points = ['专注写作的极简编辑器，支持 Markdown 与代码高亮', '标签与关注流帮你找到同频的人', '纯中文界面，没有多余的功能噪音']
</script>

<style scoped>
.brand-panel {
  position: relative;
  overflow: hidden;
  background: var(--color-brand-soft);
}

/* 细网格：24px 一格，用 border 画线比渐变更锐利 */
.brand-panel__grid {
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(to right, var(--color-border) 1px, transparent 1px),
    linear-gradient(to bottom, var(--color-border) 1px, transparent 1px);
  background-size: 24px 24px;
  opacity: 0.55;
}

.brand-panel__content {
  position: relative;
  display: flex;
  flex-direction: column;
  justify-content: center;
  height: 100%;
  padding: var(--space-16) var(--space-12);
}

.brand-panel__wordmark {
  color: var(--color-ink);
  font-size: var(--text-h2-size);
  font-weight: var(--font-weight-semibold);
  letter-spacing: -0.02em;
}

.brand-panel__slogan {
  margin-top: var(--space-4);
  color: var(--color-ink);
  font-size: var(--text-h3-size);
  font-weight: var(--font-weight-semibold);
  line-height: var(--text-h3-lh);
}

.brand-panel__points {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  margin-top: var(--space-8);
}

.brand-panel__point {
  color: var(--color-text-secondary);
  font-size: var(--text-sm-size);
  line-height: var(--text-sm-lh);
}

.brand-panel__tick {
  margin-right: var(--space-2);
  color: var(--color-brand);
}
</style>
