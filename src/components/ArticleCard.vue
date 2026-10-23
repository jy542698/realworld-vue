<template>
  <li class="article-card" :class="{ 'article-card--compact': compact }">
    <div class="article-card__meta">
      <router-link :to="`/profile/${article.author?.username}`" class="article-card__author">
        <Avatar :src="article.author?.image" :username="article.author?.username" :size="24" />
        <span class="article-card__name">{{ article.author?.username }}</span>
      </router-link>
      <span class="article-card__dot" aria-hidden="true">·</span>
      <time class="article-card__time" :datetime="article.createdAt">
        {{ relativeTime(article.createdAt) }}
      </time>

      <button
        type="button"
        class="article-card__fav"
        :class="{ 'article-card__fav--on': favorited }"
        :aria-pressed="favorited ? 'true' : 'false'"
        :aria-label="favorited ? '取消收藏' : '收藏文章'"
        :disabled="pending"
        @click.stop.prevent="toggleFavorite"
      >
        <AppIcon :name="favorited ? 'heart-filled' : 'heart'" :size="16" />
        <span class="article-card__fav-count">{{ count }}</span>
      </button>
    </div>

    <router-link :to="`/article/${article.slug}`" class="article-card__title">
      {{ article.title }}
    </router-link>

    <p class="article-card__desc">{{ article.description }}</p>

    <div v-if="article.tagList?.length" class="article-card__tags">
      <TagPill
        v-for="tag in article.tagList"
        :key="tag"
        :name="tag"
        @click="$emit('tag-click', tag)"
      />
    </div>
  </li>
</template>

<script setup>
/**
 * 文章卡片（列表项）
 *
 * 为什么固定 min-height 200px：加载态骨架是 N 张 200px 的灰卡，
 * 如果真实卡片高度随摘要行数浮动，数据到达时列表会整体跳一下。
 * 200 = padding(20+20) + meta(24) + 标题(28) + 摘要两行(48) + 胶囊(24) + gap(12×3)。
 * 摘要不足两行时多出来的空间落在底部（看起来只是留白），标题换两行时卡片会高 28px（可接受）。
 *
 * 收藏按钮做**乐观更新**：先改 UI 再发请求，失败回滚并 Toast（P0-22）。
 * 用户点下去必须立刻有反馈，等 300ms 网络往返是不可接受的。
 */
import { ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { favoriteArticle, unfavoriteArticle } from '../api/article'
import { auth } from '../store/auth'
import { toast } from '../composables/useToast'
import { extractErrors } from '../utils/errors'
import { relativeTime } from '../utils/time'
import AppIcon from './ui/AppIcon.vue'
import Avatar from './ui/Avatar.vue'
import TagPill from './ui/TagPill.vue'

const props = defineProps({
  article: { type: Object, required: true },
  compact: { type: Boolean, default: false }
})

defineEmits(['tag-click'])

const router = useRouter()
const route = useRoute()

// 本地镜像：不直接改 props.article，避免「子组件偷偷改父组件数据」的隐式耦合
const favorited = ref(!!props.article.favorited)
const count = ref(Number(props.article.favoritesCount) || 0)
const pending = ref(false)

// 列表翻页/刷新后父级数据变了，本地镜像要跟上
watch(
  () => [props.article.favorited, props.article.favoritesCount],
  ([nextFavorited, nextCount]) => {
    favorited.value = !!nextFavorited
    count.value = Number(nextCount) || 0
  }
)

async function toggleFavorite() {
  if (!auth.isAuthenticated()) {
    toast.error('登录后才能收藏文章')
    router.push({ path: '/login', query: { redirect: route.fullPath } })
    return
  }
  if (pending.value) return

  const snapshot = { favorited: favorited.value, count: count.value }
  pending.value = true

  // 1) 乐观更新
  favorited.value = !snapshot.favorited
  count.value = snapshot.favorited ? Math.max(0, snapshot.count - 1) : snapshot.count + 1

  try {
    const { data } = snapshot.favorited
      ? await unfavoriteArticle(props.article.slug)
      : await favoriteArticle(props.article.slug)
    // 2) 用后端返回值校准（并发场景下本地估算可能偏）
    if (data?.article) {
      favorited.value = !!data.article.favorited
      count.value = Number(data.article.favoritesCount) || 0
    }
  } catch (e) {
    // 3) 失败回滚 + 告知
    favorited.value = snapshot.favorited
    count.value = snapshot.count
    const { first } = extractErrors(e)
    toast.error(first)
  } finally {
    pending.value = false
  }
}
</script>

<style scoped>
.article-card {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  min-height: 200px;
  padding: var(--space-5) var(--space-6);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  background: var(--color-surface);
  box-shadow: var(--shadow-xs);
  /* 只过渡边框与阴影：位移/缩放会让快速滚动时整屏发抖 */
  transition:
    border-color var(--dur-fast) var(--ease-out),
    box-shadow var(--dur-fast) var(--ease-out);
}

.article-card:hover {
  border-color: var(--color-border-strong);
  box-shadow: var(--shadow-md);
}

.article-card__meta {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  height: 24px;
  color: var(--color-text-secondary);
  font-size: var(--text-sm-size);
  line-height: var(--text-sm-lh);
}

.article-card__author {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  color: var(--color-text);
  font-weight: var(--font-weight-medium);
}

.article-card__author:hover .article-card__name {
  color: var(--color-brand);
}

.article-card__dot {
  color: var(--color-text-tertiary);
}

.article-card__time {
  color: var(--color-text-secondary);
}

/* 收藏：ghost 图标按钮，点击区 36×36（触控最小目标） */
.article-card__fav {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  min-width: 36px;
  height: 36px;
  margin-left: auto;
  margin-right: calc(var(--space-2) * -1);
  padding: 0 var(--space-2);
  border-radius: var(--radius-md);
  color: var(--color-text-tertiary);
  font-size: var(--text-xs-size);
  font-variant-numeric: tabular-nums;
  transition:
    color var(--dur-fast) var(--ease-out),
    background var(--dur-fast) var(--ease-out);
}

.article-card__fav:hover:not(:disabled) {
  background: var(--color-rose-soft);
  color: var(--color-rose);
}

.article-card__fav--on {
  color: var(--color-rose);
}

.article-card__fav:disabled {
  cursor: progress;
}

.article-card__title {
  color: var(--color-ink);
  font-size: var(--text-h3-size);
  font-weight: var(--font-weight-semibold);
  line-height: var(--text-h3-lh);
}

.article-card__title:hover {
  color: var(--color-brand);
}

.article-card__desc {
  display: -webkit-box;
  overflow: hidden;
  color: var(--color-text-secondary);
  font-size: var(--text-body-size);
  line-height: var(--text-body-lh);
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  line-clamp: 2;
}

.article-card__tags {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
}

/* ---------------- compact 变体（个人主页用） ---------------- */
.article-card--compact {
  min-height: 0;
  gap: var(--space-2);
  padding: var(--space-4) var(--space-5);
}

.article-card--compact .article-card__title {
  font-size: var(--text-h4-size);
  line-height: var(--text-h4-lh);
}

.article-card--compact .article-card__desc {
  -webkit-line-clamp: 1;
  line-clamp: 1;
}

@media (max-width: 767px) {
  /* <768 卡片贴边：圆角归零、边框只留上下，靠分割线分块 */
  .article-card {
    padding: var(--space-4);
    border-width: 0 0 1px;
    border-radius: 0;
    box-shadow: none;
  }

  .article-card:hover {
    box-shadow: none;
  }
}
</style>
