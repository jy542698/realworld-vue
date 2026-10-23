<template>
  <li class="draft-card card card--pad">
    <div class="draft-card__head">
      <DraftPill />
      <time class="draft-card__time" :datetime="article.updatedAt">
        {{ relativeTime(article.updatedAt) }}更新
      </time>
    </div>

    <router-link :to="`/editor/${article.slug}`" class="draft-card__title">
      {{ article.title || '无标题草稿' }}
    </router-link>

    <p v-if="article.description" class="draft-card__desc">{{ article.description }}</p>

    <div class="draft-card__actions">
      <router-link
        :to="`/editor/${article.slug}`"
        class="btn btn--ghost btn--pill"
      >继续编辑</router-link>
      <button
        type="button"
        class="btn btn--primary btn--pill"
        :disabled="pending"
        @click="publish"
      >{{ pending ? '处理中…' : '发布' }}</button>
      <button
        type="button"
        class="btn btn--danger btn--pill"
        :disabled="pending"
        @click="remove"
      >删除</button>
    </div>
  </li>
</template>

<script setup>
/**
 * 草稿箱卡片。
 *
 * 与 ArticleCard 分开是刻意的：草稿没有收藏/浏览量/标签点击这些公开语义，
 * 硬塞进 ArticleCard 会让那个组件背上两套行为分支。
 *
 * 「发布」直接调 updateArticle(slug, { draft: false })：
 * 后端要求发布时标题与正文都非空，草稿如果还没写完会返回 400
 * （「发布前必须填写标题」），这里把错误原文 toast 出来并引导去编辑，不静默失败。
 */
import { ref } from 'vue'
import { deleteArticle, updateArticle } from '../../api/article'
import { extractErrors } from '../../utils/errors'
import { relativeTime } from '../../utils/time'
import { toast } from '../../composables/useToast'
import DraftPill from '../ui/DraftPill.vue'

const props = defineProps({
  article: { type: Object, required: true }
})

const emit = defineEmits(['changed'])

const pending = ref(false)

async function publish() {
  if (pending.value) return
  pending.value = true
  try {
    await updateArticle(props.article.slug, { draft: false })
    toast.success('已发布')
    emit('changed')
  } catch (e) {
    const { first } = extractErrors(e)
    toast.error(first)
  } finally {
    pending.value = false
  }
}

async function remove() {
  if (pending.value) return
  if (!window.confirm('删除后无法恢复，确定删除这篇草稿吗？')) return
  pending.value = true
  try {
    await deleteArticle(props.article.slug)
    toast.success('草稿已删除')
    emit('changed')
  } catch (e) {
    const { first } = extractErrors(e)
    toast.error(first)
  } finally {
    pending.value = false
  }
}
</script>

<style scoped>
.draft-card {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.draft-card__head {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.draft-card__time {
  color: var(--color-text-tertiary);
  font-size: var(--text-xs-size);
  line-height: var(--text-xs-lh);
}

.draft-card__title {
  overflow: hidden;
  color: var(--color-ink);
  font-size: var(--text-h4-size);
  font-weight: var(--font-weight-semibold);
  line-height: var(--text-h4-lh);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.draft-card__title:hover {
  color: var(--color-brand);
}

.draft-card__desc {
  display: -webkit-box;
  overflow: hidden;
  color: var(--color-text-secondary);
  font-size: var(--text-sm-size);
  line-height: var(--text-sm-lh);
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 1;
  line-clamp: 1;
}

.draft-card__actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
  margin-top: var(--space-1);
}
</style>
