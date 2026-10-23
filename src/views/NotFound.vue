<template>
  <div class="notfound">
    <p class="notfound__code">404</p>
    <h1 class="notfound__title">这一页不见了</h1>
    <p class="notfound__desc">地址可能输错了，或者这页内容已经被删除。</p>
    <router-link to="/" class="btn btn--primary btn--lg btn--pill">回到首页</router-link>
  </div>
</template>

<script setup>
/**
 * 404 页
 *
 * 不做插画、不放搜索框：迷路的用户只需要一个明确出口（回首页）。
 * 404 数字用 --color-border-strong 而不是品牌色 —— 它不是「可交互」元素。
 */
</script>

<style scoped>
.notfound {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--space-3);
  min-height: calc(100vh - var(--nav-h) - var(--space-20));
  padding: var(--space-16) var(--space-6);
  text-align: center;
}

.notfound__code {
  color: var(--color-border-strong);
  font-size: var(--text-display-size);
  font-weight: var(--font-weight-semibold);
  line-height: var(--text-display-lh);
  letter-spacing: -0.02em;
}

.notfound__title {
  color: var(--color-ink);
  font-size: var(--text-h2-size);
  font-weight: var(--font-weight-semibold);
  line-height: var(--text-h2-lh);
}

.notfound__desc {
  max-width: 380px;
  color: var(--color-text-secondary);
  font-size: var(--text-body-size);
  line-height: var(--text-body-lh);
}
</style>
