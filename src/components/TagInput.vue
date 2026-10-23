<template>
  <div class="tag-input">
    <TagPill
      v-for="tag in modelValue"
      :key="tag"
      :name="tag"
      closable
      @remove="removeTag"
    />

    <input
      ref="inputRef"
      v-model="draft"
      class="tag-input__field"
      type="text"
      :placeholder="modelValue.length ? '' : '添加标签，回车确认'"
      :maxlength="maxLength"
      aria-label="添加标签"
      @keydown="onKeydown"
      @blur="commitDraft"
    />
  </div>
</template>

<script setup>
/**
 * 标签输入（胶囊化）
 *
 * 交互约定与主流编辑器一致：
 * - 回车 / 逗号 → 成胶囊（中文输入法下按逗号是最顺手的分词方式）
 * - 空输入按 Backspace → 删掉最后一个胶囊（不用去点 × ）
 * - 失焦也提交，避免用户打完字直接点「发布」导致标签丢失
 *
 * 上限与后端校验保持一致（10 个 / 每个 32 字符），超限在**输入侧**就拦住，
 * 不要等提交后由后端返回 400 —— 那时候用户已经离开这个字段了。
 */
import { ref } from 'vue'
import { toast } from '../composables/useToast'
import TagPill from './ui/TagPill.vue'

const props = defineProps({
  modelValue: { type: Array, default: () => [] },
  max: { type: Number, default: 10 },
  maxLength: { type: Number, default: 32 }
})

const emit = defineEmits(['update:modelValue'])

const draft = ref('')
const inputRef = ref(null)

function commitDraft() {
  const raw = draft.value.trim().replace(/^,|,$/g, '')
  if (!raw) {
    draft.value = ''
    return
  }

  // 支持一次粘贴多个逗号分隔的标签
  const parts = raw
    .split(/[,，]/)
    .map((item) => item.trim())
    .filter(Boolean)

  const next = [...props.modelValue]
  for (const part of parts) {
    if (next.length >= props.max) {
      toast.error(`最多添加 ${props.max} 个标签`)
      break
    }
    if (part.length > props.maxLength) {
      toast.error(`单个标签不能超过 ${props.maxLength} 个字符`)
      continue
    }
    if (next.includes(part)) continue // 去重，不打扰用户
    next.push(part)
  }

  draft.value = ''
  if (next.length !== props.modelValue.length) {
    emit('update:modelValue', next)
  }
}

function onBackspace(event) {
  if (draft.value || !props.modelValue.length) return
  event.preventDefault()
  emit('update:modelValue', props.modelValue.slice(0, -1))
}

/**
 * 键盘统一入口：不在模板里用 @keydown.enter / @keydown.delete 分开写，
 * 因为「逗号」在 Vue 的事件修饰符语法里是分隔符，写不出来。
 */
function onKeydown(event) {
  if (event.key === 'Enter' || event.key === ',' || event.key === '，') {
    event.preventDefault()
    commitDraft()
    return
  }
  if (event.key === 'Backspace' || event.key === 'Delete') {
    onBackspace(event)
  }
}

function removeTag(name) {
  emit(
    'update:modelValue',
    props.modelValue.filter((tag) => tag !== name)
  )
}
</script>

<style scoped>
.tag-input {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-2);
  min-height: 32px;
}

.tag-input__field {
  flex: 1;
  min-width: 160px;
  height: 24px;
  border: 0;
  background: none;
  color: var(--color-ink);
  font-size: var(--text-sm-size);
}

.tag-input__field:focus {
  outline: none;
}

.tag-input__field::placeholder {
  color: var(--color-text-tertiary);
}
</style>
