<template>
  <div class="editor">
    <!-- 顶部工具栏：sticky 在全局导航之下 -->
    <div class="editor__toolbar">
      <div class="editor__toolbar-inner">
        <div class="editor__toolbar-left">
          <button type="button" class="btn btn--icon" aria-label="返回" @click="goBack">
            <AppIcon name="chevron-left" :size="20" />
          </button>
          <span class="editor__status">{{ isEdit ? '编辑中' : '新建文章' }}</span>
          <DraftPill v-if="isDraft" />
        </div>

        <div class="editor__toolbar-right">
          <div class="editor__segment" role="tablist" aria-label="编辑模式">
            <button
              type="button"
              class="editor__segment-item"
              :class="{ 'editor__segment-item--active': mode === 'write' }"
              role="tab"
              :aria-selected="mode === 'write' ? 'true' : 'false'"
              @click="mode = 'write'"
            >写</button>
            <button
              type="button"
              class="editor__segment-item"
              :class="{ 'editor__segment-item--active': mode === 'preview' }"
              role="tab"
              :aria-selected="mode === 'preview' ? 'true' : 'false'"
              @click="mode = 'preview'"
            >预览</button>
          </div>

          <button
            type="button"
            class="btn btn--ghost btn--pill"
            :disabled="submitting || loading"
            @click="saveDraft"
          >{{ draftButtonLabel }}</button>

          <button
            type="button"
            class="btn btn--primary btn--pill"
            :disabled="submitting || loading"
            @click="publish"
          >
            <span v-if="submitting" class="editor__spinner" aria-hidden="true" />
            {{ submitting ? '处理中…' : isEdit ? '发布' : '发布文章' }}
          </button>
        </div>
      </div>
    </div>

    <div v-if="loading" class="editor__loading">
      <StateLoading variant="detail" :rows="5" />
    </div>

    <div v-else class="editor__panes" :class="`editor__panes--${mode}`">
      <!-- 编辑区 -->
      <section class="editor__pane editor__pane--write">
        <input
          v-model="form.title"
          class="editor__title"
          type="text"
          maxlength="128"
          placeholder="文章标题…"
          aria-label="文章标题"
          @input="errors.title = ''"
        />
        <p v-if="errors.title" class="editor__error">{{ errors.title }}</p>

        <TagInput v-model="form.tagList" class="editor__tags" />

        <textarea
          v-model="form.description"
          class="editor__desc"
          rows="1"
          maxlength="256"
          placeholder="一句话说说这篇讲什么（列表页会显示）"
          aria-label="文章简介"
          @input="errors.description = ''"
        />
        <p v-if="errors.description" class="editor__error">{{ errors.description }}</p>

        <div class="editor__divider" />

        <div class="editor__body-tools">
          <button type="button" class="btn btn--ghost btn--pill" @click="openImageDialog">
            <AppIcon name="plus" :size="16" />
            插入图片
          </button>
        </div>

        <textarea
          ref="bodyRef"
          v-model="form.body"
          class="editor__body"
          placeholder="开始写正文，支持 Markdown…"
          aria-label="文章正文"
          @input="onBodyInput"
        />
        <p v-if="errors.body" class="editor__error">{{ errors.body }}</p>
      </section>

      <!-- 预览区：与发布后完全同一个组件 -->
      <section class="editor__pane editor__pane--preview">
        <div class="editor__preview-card">
          <h1 v-if="form.title" class="editor__preview-title">{{ form.title }}</h1>
          <MarkdownBody :content="form.body" :anchor="false" />
          <p v-if="!form.body.trim()" class="editor__preview-empty">正文预览会出现在这里。</p>
        </div>
      </section>
    </div>

    <ImageUploadDialog
      :open="imageDialogOpen"
      @close="imageDialogOpen = false"
      @inserted="onImageInserted"
    />
  </div>
</template>

<script setup>
/**
 * 编辑器（新建 / 编辑同一个组件）
 *
 * 四个关键行为：
 * 1) 预览与成品用**同一个 MarkdownBody**，不可能出现「预览好看、发布走样」；
 * 2) 客户端先校验（标题/正文非空、长度），不合法就一个请求都不发；
 * 3) 后端返回的 errors.<field> 映射到对应字段下方，映射不到的才弹 Toast，
 *    避免"表单里没红字，只飘一个提示"的割裂；
 * 4) 有未保存改动时拦截路由离开 —— 写了 500 字点一下侧栏就没了是最糟糕的体验。
 */
import { computed, nextTick, onMounted, reactive, ref } from 'vue'
import { onBeforeRouteLeave, useRoute, useRouter } from 'vue-router'
import { createArticle, getArticle, updateArticle } from '../api/article'
import { auth } from '../store/auth'
import { toast } from '../composables/useToast'
import { extractErrors, pickFieldError } from '../utils/errors'
import AppIcon from '../components/ui/AppIcon.vue'
import TagInput from '../components/TagInput.vue'
import MarkdownBody from '../components/ui/MarkdownBody.vue'
import StateLoading from '../components/ui/StateLoading.vue'
import DraftPill from '../components/ui/DraftPill.vue'
import ImageUploadDialog from '../components/editor/ImageUploadDialog.vue'

const route = useRoute()
const router = useRouter()

const form = reactive({
  title: '',
  description: '',
  body: '',
  tagList: []
})

const errors = reactive({ title: '', description: '', body: '' })
const mode = ref('write')
const loading = ref(false)
const submitting = ref(false)
const bodyRef = ref(null)
// 已保存内容的快照，用来判断「有没有未保存的改动」
const snapshot = ref('')
// 已保存的文章状态：null = 还没保存过（新建）。
// 不能用 "DRAFT" 当新建的默认值 —— 那会让按钮一打开就显示「更新草稿」，
// 还显示一个草稿胶囊，而这时后端根本还没有这篇草稿。
const savedStatus = ref(null)
const imageDialogOpen = ref(false)
// 打开插图对话框前必须记下光标位置：对话框抢走焦点后 textarea 的 selection 会丢，
// 插图时就没法知道该插在哪一段。
const savedSelection = ref({ start: 0, end: 0 })

const isEdit = computed(() => typeof route.params.slug === 'string' && !!route.params.slug)
// 只有「已保存的草稿」才显示草稿胶囊
const isDraft = computed(() => savedStatus.value === 'DRAFT')
/**
 * 草稿按钮文案按当前状态区分，避免歧义：
 * - 没保存过 → 存草稿
 * - 已是草稿 → 更新草稿
 * - 已发布   → 转为草稿（对已发布文章说「存草稿」会让人以为会另存一份）
 */
const draftButtonLabel = computed(() => {
  if (savedStatus.value === 'DRAFT') return '更新草稿'
  if (savedStatus.value === 'PUBLISHED') return '转为草稿'
  return '存草稿'
})
const isDirty = computed(() => serialize(form) !== snapshot.value)

function serialize(source) {
  return JSON.stringify({
    title: source.title,
    description: source.description,
    body: source.body,
    tagList: source.tagList
  })
}

function onBodyInput() {
  autoGrow()
  errors.body = ''
}

function autoGrow() {
  const el = bodyRef.value
  if (!el) return
  el.style.height = 'auto'
  el.style.height = `${el.scrollHeight}px`
}

/** 打开插图对话框前先记住光标：对话框会抢走焦点 */
function openImageDialog() {
  const el = bodyRef.value
  savedSelection.value = {
    start: el?.selectionStart ?? form.body.length,
    end: el?.selectionEnd ?? form.body.length
  }
  imageDialogOpen.value = true
}

/** 在光标处插入 Markdown 图片语法，并把光标移到插入内容之后，方便接着写 */
function onImageInserted(url) {
  const md = `\n![图片](${url})\n`
  const { start, end } = savedSelection.value
  form.body = form.body.slice(0, start) + md + form.body.slice(end)
  errors.body = ''
  nextTick(() => {
    const el = bodyRef.value
    if (!el) return
    el.focus()
    const pos = start + md.length
    el.setSelectionRange(pos, pos)
    autoGrow()
  })
}

function goBack() {
  if (window.history.length > 1) router.back()
  else router.push('/')
}

/**
 * 客户端校验。
 *
 * @param {boolean} publishing true = 要发布（标题/正文必填）；false = 存草稿（只校验长度）
 *
 * 草稿允许什么都不填 —— 用户可能只是想先把一段想法存下来，
 * 这时候卡「标题不能为空」就是在阻止他保存。
 */
function validate(publishing) {
  errors.title = ''
  errors.description = ''
  errors.body = ''

  const title = form.title.trim()
  const body = form.body.trim()
  const description = form.description.trim()

  if (title.length > 128) errors.title = '标题不能超过 128 个字符'
  else if (publishing && !title) errors.title = '标题不能为空'

  if (description.length > 256) errors.description = '简介不能超过 256 个字符'

  if (publishing && !body) errors.body = '正文不能为空'

  return !errors.title && !errors.description && !errors.body
}

function saveDraft() {
  return submit(false)
}

function publish() {
  return submit(true)
}

/**
 * 保存文章。
 *
 * @param {boolean} publishing true = 发布，false = 存草稿
 *
 * 存草稿成功后**留在编辑器**（不跳详情页）：继续写才是最可能的下一步，
 * 而且首次存草稿要把 URL 从 /editor 换成 /editor/{slug}，
 * 否则再点一次「存草稿」会又新建一篇。
 */
async function submit(publishing) {
  if (submitting.value) return
  if (!validate(publishing)) {
    // 把焦点送到第一个出错的字段，键盘用户不用自己去摸
    if (errors.title) document.querySelector('.editor__title')?.focus()
    else if (errors.body) bodyRef.value?.focus()
    return
  }

  submitting.value = true
  const payload = {
    title: form.title.trim(),
    description: form.description.trim(),
    body: form.body,
    tagList: form.tagList,
    draft: !publishing
  }

  try {
    const { data } = isEdit.value
      ? await updateArticle(route.params.slug, payload)
      : await createArticle(payload)

    const saved = data?.article
    if (!saved?.slug) {
      toast.error('保存失败，请稍后重试')
      return
    }
    savedStatus.value = saved.status || (publishing ? 'PUBLISHED' : 'DRAFT')
    // 保存成功后快照同步，离开保护不再拦截
    snapshot.value = serialize(form)

    if (publishing) {
      toast.success(isEdit.value ? '已发布' : '文章已发布')
      router.push(`/article/${saved.slug}`)
    } else {
      toast.success('已保存到草稿箱')
      if (!isEdit.value) router.replace(`/editor/${saved.slug}`)
    }
  } catch (e) {
    const { fieldMap, first } = extractErrors(e)
    const titleError = pickFieldError(fieldMap, 'title')
    const bodyError = pickFieldError(fieldMap, 'body')
    const descError = pickFieldError(fieldMap, 'description')

    if (titleError || bodyError || descError) {
      errors.title = titleError
      errors.description = descError
      errors.body = bodyError
    } else {
      toast.error(first)
    }

    if (e?.response?.status === 403) {
      // 越权（不是作者）：直接把用户送回文章页，别让他在这儿反复试
      router.replace(`/article/${route.params.slug}`)
    }
  } finally {
    submitting.value = false
  }
}

async function loadArticle(slug) {
  loading.value = true
  try {
    const { data } = await getArticle(slug)
    const article = data?.article
    if (!article) {
      toast.error('文章不存在')
      router.replace('/')
      return
    }
    if (!auth.isOwner(article.author?.username)) {
      toast.error('只能编辑自己的文章')
      router.replace(`/article/${slug}`)
      return
    }
    form.title = article.title || ''
    form.description = article.description || ''
    form.body = article.body || ''
    form.tagList = Array.isArray(article.tagList) ? [...article.tagList] : []
    savedStatus.value = article.status || 'PUBLISHED'
    snapshot.value = serialize(form)
    await nextTick()
    autoGrow()
  } catch (e) {
    const { first } = extractErrors(e)
    toast.error(first)
    router.replace('/')
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  // 先把 Markdown 渲染器拉起来（与详情页共用同一个 chunk），
  // 避免用户首次点「预览」时正文区空一帧再出内容
  await import('../utils/markdown').catch(() => null)

  if (isEdit.value) {
    await loadArticle(route.params.slug)
  } else {
    snapshot.value = serialize(form)
  }
})

onBeforeRouteLeave(() => {
  if (!isDirty.value) return true
  return window.confirm('有未保存的内容，确定离开吗？')
})
</script>

<style scoped>
.editor {
  max-width: var(--container-xl);
  margin: 0 auto;
  padding-bottom: var(--space-16);
}

.editor__toolbar {
  position: sticky;
  top: var(--nav-h);
  z-index: 10;
  margin: 0 calc(var(--space-6) * -1);
  padding: 0 var(--space-6);
  border-bottom: 1px solid var(--color-border);
  background: var(--color-surface);
}

.editor__toolbar-inner {
  display: flex;
  align-items: center;
  gap: var(--space-4);
  height: 64px;
}

.editor__toolbar-left {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  min-width: 0;
}

.editor__status {
  color: var(--color-text-secondary);
  font-size: var(--text-sm-size);
}

.editor__toolbar-right {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  margin-left: auto;
}

/* 写 / 预览 分段控件 */
.editor__segment {
  display: inline-flex;
  padding: 2px;
  border-radius: var(--radius-full);
  background: var(--color-surface-sunken);
}

.editor__segment-item {
  padding: var(--space-1) var(--space-4);
  border-radius: var(--radius-full);
  color: var(--color-text-secondary);
  font-size: var(--text-sm-size);
  transition:
    background var(--dur-fast) var(--ease-out),
    color var(--dur-fast) var(--ease-out);
}

.editor__segment-item--active {
  background: var(--color-surface);
  color: var(--color-ink);
  font-weight: var(--font-weight-medium);
  box-shadow: var(--shadow-xs);
}

.editor__spinner {
  width: 14px;
  height: 14px;
  border: 2px solid var(--color-text-tertiary);
  border-top-color: var(--color-surface);
  border-radius: var(--radius-full);
  animation: editor-spin 0.7s linear infinite;
}

@keyframes editor-spin {
  to {
    transform: rotate(360deg);
  }
}

.editor__loading {
  max-width: var(--container-md);
  margin: var(--space-8) auto 0;
  padding: 0 var(--space-6);
}

.editor__panes {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: var(--space-8);
  padding: var(--space-8) var(--space-6) 0;
}

.editor__pane {
  min-width: 0;
}

/* <1024 单栏：由「写/预览」切换，未选中的那一栏不渲染 */
.editor__panes--write .editor__pane--preview {
  display: none;
}

.editor__panes--preview .editor__pane--write {
  display: none;
}

.editor__title {
  width: 100%;
  padding: var(--space-2) 0;
  border: 0;
  border-bottom: 1px solid var(--color-border);
  border-radius: 0;
  background: none;
  color: var(--color-ink);
  font-family: var(--font-sans);
  font-size: var(--text-h1-size);
  font-weight: var(--font-weight-semibold);
  line-height: var(--text-h1-lh);
  transition: border-color var(--dur-fast) var(--ease-out);
}

.editor__title:focus {
  outline: none;
  border-bottom-color: var(--color-brand);
}

.editor__title::placeholder {
  color: var(--color-text-tertiary);
}

.editor__tags {
  margin-top: var(--space-4);
}

.editor__desc {
  width: 100%;
  margin-top: var(--space-4);
  padding: var(--space-1) 0;
  border: 0;
  background: none;
  color: var(--color-text-secondary);
  font-family: var(--font-sans);
  font-size: var(--text-body-size);
  line-height: var(--text-body-lh);
  resize: none;
}

.editor__desc:focus {
  outline: none;
}

.editor__desc::placeholder {
  color: var(--color-text-tertiary);
}

.editor__divider {
  height: 1px;
  margin: var(--space-4) 0;
  background: var(--color-border);
}

/* 正文上方的小工具条：目前只有「插入图片」，后续加粗体/链接都往这里放 */
.editor__body-tools {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
  margin-bottom: var(--space-3);
}

.editor__body {
  width: 100%;
  min-height: 60vh;
  padding: 0;
  overflow: hidden;
  border: 0;
  background: none;
  color: var(--color-text);
  font-family: var(--font-sans);
  font-size: var(--text-bodyLg-size);
  line-height: var(--text-bodyLg-lh);
  resize: none;
}

.editor__body:focus {
  outline: none;
}

.editor__body::placeholder {
  color: var(--color-text-tertiary);
}

.editor__error {
  margin-top: var(--space-1);
  color: var(--color-danger);
  font-size: var(--text-sm-size);
  line-height: var(--text-sm-lh);
}

.editor__pane--preview {
  padding: var(--space-6);
  border-radius: var(--radius-lg);
  background: var(--color-surface-sunken);
}

.editor__preview-card {
  padding: var(--space-8);
  border-radius: var(--radius-md);
  background: var(--color-surface);
}

.editor__preview-title {
  margin-bottom: var(--space-4);
  color: var(--color-ink);
  font-size: var(--text-h1-size);
  font-weight: var(--font-weight-semibold);
  line-height: var(--text-h1-lh);
}

.editor__preview-empty {
  color: var(--color-text-tertiary);
  font-size: var(--text-sm-size);
}

/* ≥1024：左右分栏，预览常驻并跟随滚动 */
@media (min-width: 1024px) {
  .editor__panes {
    grid-template-columns: minmax(0, 720px) minmax(0, 1fr);
    gap: var(--space-10);
  }

  .editor__panes--write .editor__pane--preview,
  .editor__panes--preview .editor__pane--write {
    display: block;
  }

  .editor__pane--preview {
    position: sticky;
    top: calc(var(--nav-h) + 64px + var(--space-4));
    max-height: calc(100vh - var(--nav-h) - 64px - var(--space-8));
    overflow-y: auto;
  }
}

@media (max-width: 767px) {
  .editor__toolbar {
    margin: 0;
    padding: 0 var(--space-4);
  }

  .editor__panes {
    padding: var(--space-5) var(--space-4) 0;
  }

  .editor__title {
    font-size: var(--text-h2-size);
    line-height: var(--text-h2-lh);
  }
}
</style>
