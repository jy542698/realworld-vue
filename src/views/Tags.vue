<template>
  <div class="tags-page">
    <header class="tags-page__head">
      <h1 class="tags-page__title">标签</h1>
      <p class="tags-page__desc">
        <template v-if="status === 'success' && tags.length">
          按主题浏览全站文章，共 {{ tags.length }} 个标签
        </template>
        <template v-else>按主题浏览全站文章</template>
      </p>
    </header>

    <!-- 三态：骨架 / 错误 / 空 / 列表，与首页保持同一套组件 -->
    <StateLoading
      v-if="status === 'loading' || status === 'idle'"
      variant="inline"
      :rows="6"
    />

    <StateError v-else-if="status === 'error'" @retry="load" />

    <StateEmpty
      v-else-if="!tags.length"
      title="还没有任何标签"
      description="发布文章时加上标签，它们就会在这里归类显示"
    >
      <router-link to="/editor" class="btn btn--primary">去写第一篇</router-link>
    </StateEmpty>

    <div v-else class="tags-page__grid">
      <TagCard v-for="tag in tags" :key="tag.name" :name="tag.name" :count="tag.count" />
    </div>
  </div>
</template>

<script setup>
/**
 * 独立标签页 /tags
 *
 * 数据源是 /tags/stats（全量 + 计数），不是 /tags/hot（top-N）——
 * 标签页要的是「全部」，而首页侧栏要的是「前 10 个」。
 *
 * 只统计已发布文章，所以仅在草稿里用过的标签不会出现在这里（后端已保证）。
 */
import { onMounted, ref } from 'vue'
import { getTagStats } from '../api/tag'
import { extractErrors } from '../utils/errors'
import { toast } from '../composables/useToast'
import TagCard from '../components/tags/TagCard.vue'
import StateLoading from '../components/ui/StateLoading.vue'
import StateError from '../components/ui/StateError.vue'
import StateEmpty from '../components/ui/StateEmpty.vue'

const tags = ref([])
const status = ref('idle')

async function load() {
  status.value = 'loading'
  try {
    const { data } = await getTagStats()
    tags.value = Array.isArray(data?.tags) ? data.tags : []
    status.value = 'success'
  } catch (e) {
    tags.value = []
    status.value = 'error'
    toast.error(extractErrors(e).first)
  }
}

onMounted(load)
</script>

<style scoped>
.tags-page {
  max-width: var(--container-xl);
  margin: 0 auto;
  padding: var(--space-10) var(--space-6) var(--space-16);
}

.tags-page__head {
  margin-bottom: var(--space-8);
}

.tags-page__title {
  color: var(--color-ink);
  font-size: var(--text-h1-size);
  font-weight: var(--font-weight-semibold);
  line-height: var(--text-h1-lh);
}

.tags-page__desc {
  margin-top: var(--space-2);
  color: var(--color-text-secondary);
  font-size: var(--text-body-size);
  line-height: var(--text-body-lh);
}

/* 自适应栅格：宽屏 3–4 列，平板 2 列，手机 1 列，不需要写断点 */
.tags-page__grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(196px, 1fr));
  gap: var(--space-3);
}

@media (max-width: 767px) {
  .tags-page {
    padding: var(--space-6) var(--space-4) var(--space-12);
  }
}
</style>
