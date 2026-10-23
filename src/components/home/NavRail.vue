<template>
  <nav class="rail" aria-label="首页导航">
    <ul class="rail__list">
      <li v-for="item in items" :key="item.key">
        <router-link
          :to="item.to"
          class="rail__item"
          :class="{ 'rail__item--active': item.key === activeKey }"
        >
          {{ item.label }}
        </router-link>
      </li>
    </ul>

    <p v-if="!isAuthed" class="rail__hint">
      <router-link to="/login" class="rail__hint-link">登录后解锁关注流</router-link>
    </p>

    <template v-if="topTags.length">
      <div class="rail__divider" />
      <p class="rail__section">热门标签</p>
      <ul class="rail__tags">
        <li v-for="tag in topTags" :key="tag.name">
          <router-link :to="{ path: '/', query: { tag: tag.name } }" class="rail__tag">
            {{ tag.name }}
            <span class="rail__tag-count">{{ tag.count }}</span>
          </router-link>
        </li>
      </ul>
    </template>
  </nav>
</template>

<script setup>
/**
 * 首页左栏导航
 *
 * 「我的收藏 / 我的文章」都落在个人主页（Profile 的 Tab 区分），
 * 「我的关注」走首页自己的 tab=following —— 复用已有路由，不为导航造新页面。
 * 未登录时只留「首页」，其余项直接不渲染（比置灰更干净）。
 *
 * 标签数据由 Home 统一请求后 props 下传（右栏也要用同一份），
 * 这里只取前 5 个展示 —— 左栏宽度只有 200px，再多就是噪音。
 */
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { auth } from '../../store/auth'

const props = defineProps({
  // [{ name, count }]，与右栏同源
  tags: { type: Array, default: () => [] }
})

const route = useRoute()
const isAuthed = computed(() => auth.isAuthenticated())
const me = computed(() => auth.state.user?.username || '')

const topTags = computed(() => props.tags.slice(0, 5))

const activeKey = computed(() => {
  if (route.path.startsWith('/profile')) {
    // Profile 用 ?tab= 区分「文章 / 收藏」，这里同步高亮
    return route.query.tab === 'favorited' ? 'favorites' : 'articles'
  }
  if (route.path !== '/') return ''
  return route.query.tab === 'following' ? 'following' : 'home'
})

const items = computed(() => {
  const base = [{ key: 'home', label: '首页', to: '/' }]
  if (!isAuthed.value) return base
  return [
    ...base,
    { key: 'favorites', label: '我的收藏', to: `/profile/${me.value}?tab=favorited` },
    { key: 'following', label: '我的关注', to: '/?tab=following' },
    { key: 'articles', label: '我的文章', to: `/profile/${me.value}` }
  ]
})
</script>

<style scoped>
.rail {
  position: sticky;
  top: calc(var(--nav-h) + var(--space-4));
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.rail__list {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.rail__item {
  display: block;
  padding: var(--space-2) var(--space-3);
  border-radius: var(--radius-md);
  color: var(--color-text);
  font-size: var(--text-body-size);
  transition:
    background var(--dur-fast) var(--ease-out),
    color var(--dur-fast) var(--ease-out);
}

.rail__item:hover {
  background: var(--color-surface-sunken);
  color: var(--color-ink);
}

.rail__item--active {
  background: var(--color-brand-soft);
  color: var(--color-brand);
  font-weight: var(--font-weight-medium);
}

.rail__hint {
  padding: 0 var(--space-3);
  color: var(--color-text-tertiary);
  font-size: var(--text-xs-size);
  line-height: var(--text-xs-lh);
}

.rail__hint-link {
  color: var(--color-brand);
}

.rail__divider {
  height: 1px;
  margin: var(--space-1) 0;
  background: var(--color-border);
}

.rail__section {
  padding: 0 var(--space-3);
  color: var(--color-text-tertiary);
  font-size: var(--text-xs-size);
  font-weight: var(--font-weight-medium);
  letter-spacing: 0.04em;
}

.rail__tags {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.rail__tag {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-2);
  padding: var(--space-1) var(--space-3);
  border-radius: var(--radius-sm);
  color: var(--color-text-secondary);
  font-size: var(--text-sm-size);
}

.rail__tag:hover {
  background: var(--color-surface-sunken);
  color: var(--color-brand);
}

.rail__tag-count {
  color: var(--color-text-tertiary);
  font-size: var(--text-xs-size);
  font-variant-numeric: tabular-nums;
}
</style>
