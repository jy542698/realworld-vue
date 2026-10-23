<template>
  <div class="detail">
    <div class="detail__grid">
      <div class="detail__main">
        <!-- 加载 -->
        <div v-if="isPending" class="detail__card">
          <StateLoading variant="detail" :rows="6" />
        </div>

        <!-- 请求失败（网络/5xx） -->
        <div v-else-if="status === 'error'" class="detail__card">
          <StateError @retry="load" />
        </div>

        <!-- 文章不存在：404、或路由参数为空（库里有一条历史脏数据 slug='')-->
        <div v-else-if="status === 'missing'" class="detail__card">
          <StateEmpty title="文章不存在或已被删除" description="链接可能过期了，回首页看看别的文章。">
            <router-link to="/" class="btn btn--primary btn--pill">回到首页</router-link>
          </StateEmpty>
        </div>

        <template v-else>
          <article class="detail__card">
            <!-- 头区 -->
            <header class="detail__head">
              <div v-if="article.tagList?.length" class="detail__tags">
                <TagPill
                  v-for="tag in article.tagList"
                  :key="tag"
                  :name="tag"
                  active
                  @click="goToTag(tag)"
                />
              </div>

              <h1 class="detail__title">{{ article.title }}</h1>

              <div class="detail__author-row">
                <div class="detail__author">
                  <Avatar :src="article.author?.image" :username="article.author?.username" :size="40" />
                  <div class="detail__author-text">
                    <router-link :to="`/profile/${article.author?.username}`" class="detail__author-name">
                      {{ article.author?.username }}
                    </router-link>
                    <div class="detail__meta">
                      <time :datetime="article.createdAt">{{ relativeTime(article.createdAt) }}</time>
                      <span class="detail__dot" aria-hidden="true">·</span>
                      <span class="detail__meta-item">
                        <AppIcon name="eye" :size="14" />{{ article.viewCount ?? 0 }} 次阅读
                      </span>
                      <span class="detail__dot" aria-hidden="true">·</span>
                      <span class="detail__meta-item">约 {{ minutes }} 分钟阅读</span>
                    </div>
                  </div>
                </div>

                <div class="detail__actions">
                  <!-- 收藏对作者本人也可见：RealWorld 语义允许收藏自己的文章，
                       作者只是在收藏之外**额外**多出编辑/删除 -->
                  <button
                    type="button"
                    class="btn btn--ghost btn--pill detail__fav"
                    :class="{ 'detail__fav--on': article.favorited }"
                    :aria-pressed="article.favorited ? 'true' : 'false'"
                    :disabled="favPending"
                    @click="toggleFavorite"
                  >
                    <AppIcon :name="article.favorited ? 'heart-filled' : 'heart'" :size="16" />
                    {{ article.favoritesCount ?? 0 }}
                  </button>

                  <button
                    v-if="!isAuthor"
                    type="button"
                    class="btn btn--pill"
                    :class="article.author?.following ? 'btn--ghost' : 'btn--primary'"
                    :disabled="followingPending"
                    @click="toggleFollow"
                  >{{ article.author?.following ? '已关注' : '关注' }}</button>

                  <template v-if="isAuthor">
                    <router-link :to="`/editor/${article.slug}`" class="btn btn--ghost btn--pill">
                      <AppIcon name="edit" :size="16" />编辑
                    </router-link>
                    <button
                      type="button"
                      class="btn btn--danger btn--pill"
                      :disabled="deleting"
                      @click="removeArticle"
                    >
                      <AppIcon name="trash" :size="16" />{{ deleting ? '删除中…' : '删除' }}
                    </button>
                  </template>
                </div>
              </div>

              <div class="detail__divider" />
            </header>

            <!-- 正文：与编辑器预览使用同一个组件，所见即所得 -->
            <MarkdownBody :content="article.body || ''" @toc="tocItems = $event" />

            <div v-if="article.tagList?.length" class="detail__tags detail__tags--foot">
              <TagPill
                v-for="tag in article.tagList"
                :key="tag"
                :name="tag"
                @click="goToTag(tag)"
              />
            </div>
          </article>

          <div class="detail__author-card">
            <AuthorCard
              :username="article.author?.username"
              :following="!!article.author?.following"
              @update:following="onFollowingChange"
            />
          </div>

          <CommentSection :slug="article.slug" />
        </template>
      </div>

      <TocAside :items="tocItems" class="detail__toc" />
    </div>
  </div>
</template>

<script setup>
/**
 * 文章详情页
 *
 * 信息架构：头区（标签/标题/作者行/操作）→ 正文 → 文末标签 → 作者卡 → 评论区，
 * 右侧目录 ≥1280 才出现（组件内部用媒体查询自控）。
 *
 * 两个必须做对的地方：
 * 1) slug 为空时**不发请求**：数据库里有一条历史脏数据 slug=''，
 *    请求 /articles/ 会打到列表接口上，拿回来一个 404 或者一个文章数组，都可能把页面搞乱。
 * 2) 收藏/关注/删除都做乐观更新 + 失败回滚：这些是高频轻操作，等 300ms 才变会明显卡手。
 */
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { deleteArticle, favoriteArticle, getArticle, unfavoriteArticle } from '../api/article'
import { follow, unfollow } from '../api/profile'
import { auth } from '../store/auth'
import { toast } from '../composables/useToast'
import { extractErrors } from '../utils/errors'
import { readingMinutes, relativeTime } from '../utils/time'
import MarkdownBody from '../components/ui/MarkdownBody.vue'
import TocAside from '../components/ui/TocAside.vue'
import TagPill from '../components/ui/TagPill.vue'
import Avatar from '../components/ui/Avatar.vue'
import AppIcon from '../components/ui/AppIcon.vue'
import StateLoading from '../components/ui/StateLoading.vue'
import StateEmpty from '../components/ui/StateEmpty.vue'
import StateError from '../components/ui/StateError.vue'
import AuthorCard from '../components/AuthorCard.vue'
import CommentSection from '../components/CommentSection.vue'

const route = useRoute()
const router = useRouter()

const article = ref(null)
const status = ref('idle') // idle | loading | success | error | missing
const tocItems = ref([])
const favPending = ref(false)
const followingPending = ref(false)
const deleting = ref(false)

const slug = computed(() => (typeof route.params.slug === 'string' ? route.params.slug : ''))
const isPending = computed(() => status.value === 'idle' || status.value === 'loading')
const isAuthor = computed(() => auth.isOwner(article.value?.author?.username))
const minutes = computed(() => readingMinutes(article.value?.body))

function goToTag(tag) {
  router.push({ path: '/', query: { tag } })
}

async function load() {
  // 空 slug 直接判「不存在」，一个请求都不发
  if (!slug.value) {
    status.value = 'missing'
    return
  }

  status.value = 'loading'
  try {
    // 渲染器与文章**并行**加载，且一起 await：
    // 只预热不等待的话，文章先到时正文区会先渲染一帧空 div 再填内容（"白一下"），
    // 也会让自动化断言取到空正文。两者都就位后再切成功态，首帧即有内容。
    // 渲染器加载失败不影响文章展示（.catch 兜住，MarkdownBody 内部会再兜一次）。
    const [{ data }] = await Promise.all([
      getArticle(slug.value),
      import('../utils/markdown').catch(() => null)
    ])
    article.value = data?.article || null
    if (!article.value) {
      status.value = 'missing'
      return
    }
    status.value = 'success'
    document.title = `${article.value.title} · Conduit`
  } catch (e) {
    if (e?.response?.status === 404) {
      status.value = 'missing'
      return
    }
    const { first } = extractErrors(e)
    toast.error(first)
    status.value = 'error'
  }
}

async function toggleFavorite() {
  if (!auth.isAuthenticated()) {
    toast.error('登录后才能收藏文章')
    router.push({ path: '/login', query: { redirect: route.fullPath } })
    return
  }
  if (favPending.value || !article.value) return

  const target = article.value
  const before = { favorited: target.favorited, count: target.favoritesCount }
  favPending.value = true
  target.favorited = !before.favorited
  target.favoritesCount = before.favorited ? Math.max(0, before.count - 1) : before.count + 1

  try {
    const { data } = before.favorited
      ? await unfavoriteArticle(target.slug)
      : await favoriteArticle(target.slug)
    if (data?.article) {
      target.favorited = !!data.article.favorited
      target.favoritesCount = Number(data.article.favoritesCount) || 0
    }
  } catch (e) {
    target.favorited = before.favorited
    target.favoritesCount = before.count
    const { first } = extractErrors(e)
    toast.error(first)
  } finally {
    favPending.value = false
  }
}

async function toggleFollow() {
  if (!auth.isAuthenticated()) {
    toast.error('登录后才能关注作者')
    router.push({ path: '/login', query: { redirect: route.fullPath } })
    return
  }
  const target = article.value?.author
  if (!target || followingPending.value) return

  const before = !!target.following
  followingPending.value = true
  target.following = !before

  try {
    await (before ? unfollow(target.username) : follow(target.username))
  } catch (e) {
    target.following = before
    const { first } = extractErrors(e)
    toast.error(first)
  } finally {
    followingPending.value = false
  }
}

/** 作者卡里的关注按钮回抛（两处显示同一状态，必须同步） */
function onFollowingChange(next) {
  if (article.value?.author) {
    article.value.author.following = next
  }
}

async function removeArticle() {
  if (!article.value || deleting.value) return
  if (!window.confirm('删除后无法恢复，确定删除这篇文章吗？')) return

  deleting.value = true
  try {
    await deleteArticle(article.value.slug)
    toast.success('文章已删除')
    router.push('/')
  } catch (e) {
    const { first } = extractErrors(e)
    toast.error(first)
  } finally {
    deleting.value = false
  }
}

// 同一路由内切换 slug（比如右侧推荐位跳另一篇）也要重新加载
watch(slug, load, { immediate: true })
</script>

<style scoped>
.detail {
  max-width: var(--container-xl);
  margin: 0 auto;
  padding: var(--space-8) var(--space-6) var(--space-20);
}

.detail__grid {
  display: grid;
  grid-template-columns: minmax(0, var(--container-md));
  justify-content: center;
  gap: var(--space-10);
  align-items: start;
}

.detail__main {
  display: flex;
  flex-direction: column;
  gap: var(--space-6);
  min-width: 0;
}

/* 头区 + 正文在同一张白卡里：阅读时不该被卡片边界切断 */
.detail__card {
  padding: var(--space-10) var(--space-12);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-xl);
  background: var(--color-surface);
  box-shadow: var(--shadow-xs);
}

.detail__head {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.detail__tags {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
}

.detail__title {
  color: var(--color-ink);
  font-size: var(--text-h1-size);
  font-weight: var(--font-weight-semibold);
  line-height: var(--text-h1-lh);
  letter-spacing: -0.01em;
}

.detail__author-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-4);
}

.detail__author {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  min-width: 0;
}

.detail__author-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.detail__author-name {
  color: var(--color-ink);
  font-size: var(--text-body-size);
  font-weight: var(--font-weight-medium);
}

.detail__author-name:hover {
  color: var(--color-brand);
}

.detail__meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-1);
  color: var(--color-text-secondary);
  font-size: var(--text-sm-size);
  line-height: var(--text-sm-lh);
}

.detail__meta-item {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
}

.detail__dot {
  color: var(--color-text-tertiary);
}

.detail__actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-2);
  margin-left: auto;
}

.detail__fav--on {
  border-color: var(--color-rose);
  color: var(--color-rose);
}

.detail__divider {
  height: 1px;
  margin: var(--space-2) 0;
  background: var(--color-border);
}

.detail__tags--foot {
  margin-top: var(--space-12);
}

.detail__author-card {
  margin-top: var(--space-2);
}

/* ≥1280 才腾出目录位（TocAside 组件内部也会在窄屏隐藏） */
@media (min-width: 1280px) {
  .detail__grid {
    grid-template-columns: minmax(0, var(--container-md)) 220px;
    justify-content: center;
  }
}

@media (max-width: 767px) {
  .detail {
    padding: 0 0 var(--space-12);
  }

  /* 移动端贴边：圆角归零、左右无边框，靠上下分割线与页面底色分层 */
  .detail__card {
    padding: var(--space-6) var(--space-5);
    border-width: 1px 0;
    border-radius: 0;
    box-shadow: none;
  }

  .detail__author-card,
  .detail__main > .comments {
    padding: 0 var(--space-4);
  }

  .detail__title {
    font-size: var(--text-h2-size);
    line-height: var(--text-h2-lh);
  }

  .detail__actions {
    width: 100%;
    margin-left: 0;
  }
}
</style>
