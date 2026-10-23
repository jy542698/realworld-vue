<template>
  <!--
    整卡就是一个链接：跳到首页并带上 ?tag=。
    用 router-link 而不是 click + router.push，浏览器的「在新标签页打开」才有意义。
  -->
  <router-link :to="`/?tag=${encodeURIComponent(name)}`" class="tag-card card card--hover">
    <span class="tag-card__hash">#</span>
    <span class="tag-card__name">{{ name }}</span>
    <span class="tag-card__count">{{ count }} 篇文章</span>
  </router-link>
</template>

<script setup>
defineProps({
  name: { type: String, required: true },
  count: { type: Number, default: 0 }
})
</script>

<style scoped>
.tag-card {
  display: grid;
  grid-template-areas:
    'hash name'
    'count count';
  grid-template-columns: auto 1fr;
  align-items: baseline;
  gap: var(--space-1) var(--space-1);
  padding: var(--space-4) var(--space-5);
  border-radius: var(--radius-lg);
  color: var(--color-ink);
  text-decoration: none;
}

.tag-card__hash {
  grid-area: hash;
  color: var(--color-text-tertiary);
  font-size: var(--text-h3-size);
  font-weight: var(--font-weight-semibold);
  line-height: var(--text-h3-lh);
}

.tag-card__name {
  grid-area: name;
  overflow: hidden;
  font-size: var(--text-h3-size);
  font-weight: var(--font-weight-semibold);
  line-height: var(--text-h3-lh);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tag-card__count {
  grid-area: count;
  margin-top: var(--space-1);
  color: var(--color-text-secondary);
  font-size: var(--text-sm-size);
  font-variant-numeric: tabular-nums;
  line-height: var(--text-sm-lh);
}

.tag-card:hover .tag-card__name {
  color: var(--color-brand);
}
</style>
