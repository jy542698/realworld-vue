<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="upload"
      role="dialog"
      aria-modal="true"
      aria-labelledby="upload-title"
      @click.self="close"
    >
      <div class="upload__card">
        <header class="upload__head">
          <h2 id="upload-title" class="upload__title">插入图片</h2>
          <button type="button" class="btn btn--icon" aria-label="关闭" @click="close">
            <AppIcon name="close" :size="18" />
          </button>
        </header>

        <label
          class="upload__drop"
          :class="{ 'upload__drop--over': dragging, 'upload__drop--busy': uploading }"
          @dragenter.prevent="dragging = true"
          @dragover.prevent="dragging = true"
          @dragleave.prevent="dragging = false"
          @drop.prevent="onDrop"
        >
          <input
            type="file"
            class="upload__input"
            accept="image/jpeg,image/png,image/gif,image/webp"
            :disabled="uploading"
            @change="onPick"
          />
          <AppIcon name="plus" :size="24" />
          <span class="upload__main">{{ uploading ? '上传中…' : '拖拽图片到这里，或点击选择' }}</span>
          <span class="upload__hint">支持 JPEG / PNG / GIF / WebP，最大 5MB</span>
        </label>

        <p v-if="error" class="upload__error" role="alert">{{ error }}</p>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
/**
 * 正文插图上传对话框。
 *
 * 两层校验是刻意的：
 * - 前端先判类型与大小 → 选错文件立刻报错，**一个字节都不上传**（省流量、反馈快）；
 * - 后端仍然会独立再校验一次（按文件魔数，不信任客户端 MIME）→ 前端校验只是体验优化，不是安全边界。
 *
 * 真正的大小/类型上限以后端配置为准，这里写成常量只是为了让提示文案具体。
 */
import { ref, watch } from 'vue'
import { uploadImage } from '../../api/image'
import { extractErrors } from '../../utils/errors'
import AppIcon from '../ui/AppIcon.vue'

const props = defineProps({
  open: { type: Boolean, default: false }
})

const emit = defineEmits(['close', 'inserted'])

const MAX_BYTES = 5 * 1024 * 1024
const ALLOWED = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']

const dragging = ref(false)
const uploading = ref(false)
const error = ref('')

// 每次打开都清掉上一次的错误，避免"上次失败的红字"残留在新一次操作里
watch(
  () => props.open,
  (value) => {
    if (value) error.value = ''
    else dragging.value = false
  }
)

function close() {
  if (uploading.value) return
  emit('close')
}

function onPick(event) {
  const file = event.target.files?.[0]
  // 清空 input，保证「选同一个文件两次」仍然会触发 change
  event.target.value = ''
  handle(file)
}

function onDrop(event) {
  dragging.value = false
  const file = event.dataTransfer?.files?.[0]
  handle(file)
}

async function handle(file) {
  if (!file || uploading.value) return

  if (!ALLOWED.includes(file.type)) {
    error.value = '不支持的图片类型，仅支持 JPEG / PNG / GIF / WebP'
    return
  }
  if (file.size > MAX_BYTES) {
    const mb = (file.size / 1024 / 1024).toFixed(1)
    error.value = `图片超过大小上限（最大 5MB），当前 ${mb}MB`
    return
  }

  error.value = ''
  uploading.value = true
  try {
    const { data } = await uploadImage(file)
    const url = data?.image?.url
    if (!url) {
      error.value = '上传失败，请重试'
      return
    }
    emit('inserted', url)
    emit('close')
  } catch (e) {
    error.value = extractErrors(e).first
  } finally {
    uploading.value = false
  }
}
</script>

<style scoped>
.upload {
  position: fixed;
  inset: 0;
  z-index: var(--z-drawer);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-6);
  background: color-mix(in srgb, var(--color-ink) 40%, transparent);
}

.upload__card {
  width: 100%;
  max-width: 480px;
  padding: var(--space-6);
  border-radius: var(--radius-xl);
  background: var(--color-surface);
  box-shadow: var(--shadow-lg);
}

.upload__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--space-4);
}

.upload__title {
  color: var(--color-ink);
  font-size: var(--text-h4-size);
  font-weight: var(--font-weight-semibold);
  line-height: var(--text-h4-lh);
}

.upload__drop {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-10) var(--space-6);
  border: 1px dashed var(--color-border-strong);
  border-radius: var(--radius-lg);
  background: var(--color-surface-sunken);
  color: var(--color-text-secondary);
  text-align: center;
  cursor: pointer;
  transition:
    border-color var(--dur-fast) var(--ease-out),
    background var(--dur-fast) var(--ease-out);
}

/* 悬停/拖入只换描边与底色，不改变尺寸，避免鼠标一动就抖动 */
.upload__drop--over {
  border-color: var(--color-brand);
  background: var(--color-brand-soft);
}

.upload__drop--busy {
  cursor: progress;
  opacity: 0.7;
}

.upload__input {
  display: none;
}

.upload__main {
  color: var(--color-text);
  font-size: var(--text-body-size);
  line-height: var(--text-body-lh);
}

.upload__hint {
  color: var(--color-text-tertiary);
  font-size: var(--text-sm-size);
  line-height: var(--text-sm-lh);
}

.upload__error {
  margin-top: var(--space-3);
  color: var(--color-danger);
  font-size: var(--text-sm-size);
  line-height: var(--text-sm-lh);
}

@media (max-width: 767px) {
  .upload {
    align-items: flex-end;
    padding: 0;
  }

  .upload__card {
    max-width: none;
    border-radius: var(--radius-xl) var(--radius-xl) 0 0;
  }
}
</style>
