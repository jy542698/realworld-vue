<template>
  <aside class="sidebar">
    <!-- 卡 1：热门标签（数据由 Home 统一请求后下传，与左栏同源） -->
    <section class="card card--pad sidebar__card">
      <h2 class="sidebar__title">热门标签</h2>

      <StateLoading v-if="tagsLoading" variant="inline" :rows="3" />

      <div v-else-if="visibleTags.length" class="sidebar__pills">
        <TagPill
          v-for="tag in visibleTags"
          :key="tag.name"
          :name="tag.name"
          :count="tag.count"
          @click="$emit('tag-click', tag.name)"
        />
      </div>

      <p v-else class="sidebar__muted">暂无标签</p>

      <router-link v-if="hotTags.length" to="/tags" class="sidebar__more">查看全部 →</router-link>
    </section>

    <!-- 卡 2：本周热门（没有稳定的"推荐作者"接口，就不做，绝不编数据） -->
    <section v-if="hotLoading || hotArticles.length" class="card card--pad sidebar__card">
      <h2 class="sidebar__title">本周热门</h2>

      <StateLoading v-if="hotLoading" variant="inline" :rows="3" />

      <ol v-else class="sidebar__hot">
        <li v-for="(item, index) in hotArticles" :key="item.slug" class="sidebar__hot-item">
          <span class="sidebar__hot-rank" :class="{ 'sidebar__hot-rank--top': index === 0 }">
            {{ index + 1 }}
          </span>
          <router-link :to="`/article/${item.slug}`" class="sidebar__hot-title">
            {{ item.title }}
          </router-link>
          <span class="sidebar__hot-count">{{ item.favoritesCount }}</span>
        </li>
      </ol>
    </section>
  </aside>
</template>

<script setup>
/**
 * 首页右栏
 *
 * 失败策略：侧栏是**次要信息**，任何请求失败都静默降级（不渲染/显示「暂无」），
 * 绝不弹 Toast —— 首页主列表已经有一套错误提示，侧栏再弹一次就是噪音。
 *
 * 热门标签的数据由 Home 请求一次后 props 下传（左栏要用同一份），
 * 「查看全部」直接跳独立标签页 /tags，不再就地展开全量（那样既没有 URL 也没有计数）。
 */
import { computed, onMounted, ref } from 'vue'
import { listArticles } from '../../api/article'
import TagPill from '../ui/TagPill.vue'
import StateLoading from '../ui/StateLoading.vue'

const props = defineProps({
  // [{ name, count }]，来自 Home 的一次 /tags/hot 请求
  hotTags: { type: Array, default: () => [] },
  tagsLoading: { type: Boolean, default: false }
})

defineEmits(['tag-click'])

const hotArticles = ref([])
const hotLoading = ref(true)

// 只展示 Home 下传的那一份，本组件不再自己拉全量
const visibleTags = computed(() => props.hotTags)

onMounted(async () => {
  try {
    const { data } = await listArticles({ sort: 'hot', limit: 5 })
    hotArticles.value = Array.isArray(data?.articles) ? data.articles : []
  } catch (e) {
    hotArticles.value = []
  } finally {
    hotLoading.value = false
  }
})
</script>

<style scoped>
.sidebar {
  position: sticky;
  top: calc(var(--nav-h) + var(--space-4));
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  max-height: calc(100vh - var(--nav-h) - var(--space-8));
  overflow-y: auto;
}

.sidebar__card {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.sidebar__title {
  color: var(--color-ink);
  font-size: var(--text-h4-size);
  font-weight: var(--font-weight-semibold);
  line-height: var(--text-h4-lh);
}

.sidebar__pills {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
}

.sidebar__muted {
  color: var(--color-text-tertiary);
  font-size: var(--text-sm-size);
}

.sidebar__more {
  align-self: flex-start;
  color: var(--color-brand);
  font-size: var(--text-sm-size);
}

.sidebar__more:hover {
  color: var(--color-brand-strong);
}

.sidebar__hot {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.sidebar__hot-item {
  display: flex;
  align-items: baseline;
  gap: var(--space-2);
}

.sidebar__hot-rank {
  flex: none;
  width: 16px;
  color: var(--color-text-tertiary);
  font-size: var(--text-xs-size);
  font-variant-numeric: tabular-nums;
}

/* 第一名用强调色点一下，其余保持中性，避免整列花掉 */
.sidebar__hot-rank--top {
  color: var(--color-brand);
  font-weight: var(--font-weight-semibold);
}

.sidebar__hot-title {
  overflow: hidden;
  color: var(--color-text);
  font-size: var(--text-sm-size);
  line-height: var(--text-sm-lh);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.sidebar__hot-title:hover {
  color: var(--color-brand);
}

.sidebar__hot-count {
  flex: none;
  margin-left: auto;
  color: var(--color-text-tertiary);
  font-size: var(--text-xs-size);
  font-variant-numeric: tabular-nums;
}
</style>
