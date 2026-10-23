<template>
  <section class="comments">
    <div class="comments__head">
      <h2 class="comments__title">评论 ({{ total }})</h2>
    </div>

    <!-- 未登录：替换掉发表框，给出明确的下一步，而不是留一个点不动的输入框 -->
    <div v-if="!isAuthed" class="comments__signin">
      <router-link :to="{ path: '/login', query: { redirect: route.fullPath } }" class="comments__signin-link">
        登录后参与讨论 →
      </router-link>
    </div>

    <form v-else class="comments__form" @submit.prevent="submit">
      <textarea
        v-model="draft"
        class="input comments__textarea"
        rows="3"
        placeholder="写下你的看法…（⌘/Ctrl + Enter 发布）"
        :disabled="submitting"
        @keydown.meta.enter.prevent="submit"
        @keydown.ctrl.enter.prevent="submit"
      />
      <div class="comments__form-foot">
        <span class="comments__hint">{{ draft.trim().length }}/2000</span>
        <button
          type="submit"
          class="btn btn--primary btn--pill"
          :disabled="submitting || !draft.trim()"
        >{{ submitting ? '发布中…' : '发布' }}</button>
      </div>
    </form>

    <div class="comments__list">
      <StateLoading v-if="isPending" variant="inline" :rows="4" />

      <StateError v-else-if="status === 'error'" @retry="load" />

      <StateEmpty
        v-else-if="!comments.length"
        title="还没有评论"
        description="说说你的想法，让作者知道这篇文章有用。"
      />

      <ul v-else class="comments__items">
        <li v-for="item in comments" :key="item.id" class="comment">
          <Avatar :src="item.author?.image" :username="item.author?.username" :size="32" />

          <div class="comment__body">
            <div class="comment__meta">
              <router-link :to="`/profile/${item.author?.username}`" class="comment__author">
                {{ item.author?.username }}
              </router-link>
              <span class="comment__dot" aria-hidden="true">·</span>
              <time class="comment__time" :datetime="item.createdAt">
                {{ relativeTime(item.createdAt) }}
              </time>
            </div>

            <p class="comment__text">{{ item.body }}</p>

            <div class="comment__foot">
              <button
                type="button"
                class="comment__action"
                :class="{ 'comment__action--on': item.liked }"
                :aria-pressed="item.liked ? 'true' : 'false'"
                :aria-label="item.liked ? '取消点赞' : '点赞'"
                @click="toggleLike(item)"
              >
                <AppIcon :name="item.liked ? 'heart-filled' : 'heart'" :size="14" />
                <span>{{ item.likesCount }}</span>
              </button>

              <button
                v-if="canDelete(item)"
                type="button"
                class="comment__action comment__action--delete"
                @click="remove(item)"
              >删除</button>
            </div>
          </div>
        </li>
      </ul>
    </div>

    <Pager
      v-if="total > PAGE_SIZE"
      :page="page"
      :page-count="pageCount"
      :disabled="status === 'loading'"
      @update:page="onPageChange"
    />
  </section>
</template>

<script setup>
/**
 * 评论区（自管数据，详情页只管插进版面）
 *
 * 三个取舍：
 * 1) 分页 10 条/页，后端已给 commentsCount，翻页只请求当前页，不一次拉全量；
 * 2) 点赞/删除都是乐观更新 + 失败回滚 —— 评论是高频轻操作，等往返会很卡；
 * 3) 新评论插入列表顶部而不是重新拉第一页：用户刚发的必须立刻看见，
 *    重新请求还可能因为排序/分页把刚发的挤到第二页去。
 */
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { addComment, deleteComment, likeComment, listComments, unlikeComment } from '../api/article'
import { auth } from '../store/auth'
import { toast } from '../composables/useToast'
import { extractErrors } from '../utils/errors'
import { relativeTime } from '../utils/time'
import Avatar from './ui/Avatar.vue'
import AppIcon from './ui/AppIcon.vue'
import Pager from './ui/Pager.vue'
import StateLoading from './ui/StateLoading.vue'
import StateEmpty from './ui/StateEmpty.vue'
import StateError from './ui/StateError.vue'

const PAGE_SIZE = 10

const props = defineProps({
  slug: { type: String, required: true }
})

const route = useRoute()
const router = useRouter()

const comments = ref([])
const total = ref(0)
const page = ref(1)
const status = ref('idle')
const draft = ref('')
const submitting = ref(false)

const isAuthed = computed(() => auth.isAuthenticated())
const isPending = computed(() => status.value === 'idle' || status.value === 'loading')
const pageCount = computed(() => Math.max(1, Math.ceil(total.value / PAGE_SIZE)))

function canDelete(item) {
  return auth.isOwner(item.author?.username)
}

async function load() {
  status.value = 'loading'
  try {
    const { data } = await listComments(props.slug, {
      limit: PAGE_SIZE,
      offset: (page.value - 1) * PAGE_SIZE
    })
    comments.value = Array.isArray(data?.comments) ? data.comments : []
    total.value = Number(data?.commentsCount) || comments.value.length
    status.value = 'success'
  } catch (e) {
    const { first } = extractErrors(e)
    toast.error(first)
    comments.value = []
    total.value = 0
    status.value = 'error'
  }
}

async function submit() {
  const body = draft.value.trim()
  if (!body || submitting.value) return

  if (!auth.isAuthenticated()) {
    toast.error('登录后才能发表评论')
    router.push({ path: '/login', query: { redirect: route.fullPath } })
    return
  }

  submitting.value = true
  try {
    const { data } = await addComment(props.slug, body)
    if (data?.comment) {
      // 只在第一页时插入顶部（在第二页插进去会出现在错误的页码上）
      if (page.value === 1) comments.value = [data.comment, ...comments.value]
      total.value += 1
    }
    draft.value = ''
    toast.success('评论已发布')
  } catch (e) {
    const { first } = extractErrors(e)
    toast.error(first)
  } finally {
    submitting.value = false
  }
}

function requireLogin() {
  toast.error('登录后才能操作')
  router.push({ path: '/login', query: { redirect: route.fullPath } })
}

async function toggleLike(item) {
  if (!auth.isAuthenticated()) {
    requireLogin()
    return
  }
  const before = { liked: item.liked, likesCount: item.likesCount }
  item.liked = !before.liked
  item.likesCount = before.liked ? Math.max(0, before.likesCount - 1) : before.likesCount + 1

  try {
    const { data } = before.liked
      ? await unlikeComment(props.slug, item.id)
      : await likeComment(props.slug, item.id)
    if (data?.comment) {
      item.liked = !!data.comment.liked
      item.likesCount = Number(data.comment.likesCount) || 0
    }
  } catch (e) {
    item.liked = before.liked
    item.likesCount = before.likesCount
    const { first } = extractErrors(e)
    toast.error(first)
  }
}

async function remove(item) {
  if (!window.confirm('确定删除这条评论吗？')) return
  try {
    await deleteComment(props.slug, item.id)
    comments.value = comments.value.filter((c) => c.id !== item.id)
    total.value = Math.max(0, total.value - 1)
    toast.success('评论已删除')
  } catch (e) {
    const { first } = extractErrors(e)
    toast.error(first)
  }
}

function onPageChange(next) {
  page.value = next
  load()
}

onMounted(load)

// 同一路由内切换文章（detail 组件会复用）：评论必须跟着换，否则会显示上一篇文章的评论
watch(
  () => props.slug,
  () => {
    page.value = 1
    comments.value = []
    total.value = 0
    status.value = 'idle'
    load()
  }
)
</script>

<style scoped>
.comments {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  margin-top: var(--space-10);
}

.comments__title {
  color: var(--color-ink);
  font-size: var(--text-h3-size);
  font-weight: var(--font-weight-semibold);
  line-height: var(--text-h3-lh);
}

.comments__signin {
  padding: var(--space-4);
  border: 1px dashed var(--color-border-strong);
  border-radius: var(--radius-md);
  text-align: center;
}

.comments__signin-link {
  color: var(--color-brand);
  font-size: var(--text-sm-size);
}

.comments__form {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.comments__textarea {
  min-height: 88px;
  resize: vertical;
}

.comments__form-foot {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: var(--space-3);
}

.comments__hint {
  color: var(--color-text-tertiary);
  font-size: var(--text-xs-size);
  font-variant-numeric: tabular-nums;
}

.comments__items {
  display: flex;
  flex-direction: column;
}

/* 评论项：左头像 + 右内容 + 底部分割线（比卡片套卡片轻得多） */
.comment {
  display: flex;
  gap: var(--space-3);
  padding: var(--space-4) 0;
  border-bottom: 1px solid var(--color-border);
}

.comment__body {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  min-width: 0;
  flex: 1;
}

.comment__meta {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  color: var(--color-text-secondary);
  font-size: var(--text-sm-size);
  line-height: var(--text-sm-lh);
}

.comment__author {
  color: var(--color-text);
  font-weight: var(--font-weight-medium);
}

.comment__author:hover {
  color: var(--color-brand);
}

.comment__dot {
  color: var(--color-text-tertiary);
}

.comment__time {
  color: var(--color-text-secondary);
}

.comment__text {
  color: var(--color-text);
  font-size: var(--text-body-size);
  line-height: var(--text-body-lh);
  white-space: pre-wrap;
  word-break: break-word;
}

.comment__foot {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}

.comment__action {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  height: 28px;
  padding: 0 var(--space-2);
  border-radius: var(--radius-sm);
  color: var(--color-text-tertiary);
  font-size: var(--text-xs-size);
  font-variant-numeric: tabular-nums;
  transition:
    color var(--dur-fast) var(--ease-out),
    background var(--dur-fast) var(--ease-out);
}

.comment__action:hover {
  background: var(--color-surface-sunken);
  color: var(--color-ink);
}

.comment__action--on {
  color: var(--color-rose);
}

.comment__action--delete:hover {
  background: var(--color-danger-soft);
  color: var(--color-danger);
}

@media (max-width: 767px) {
  .comments {
    margin-top: var(--space-8);
  }
}
</style>
