<template>
  <!-- aria-live=polite：读屏器会在当前朗读结束后播报，不打断用户 -->
  <div class="toast-host" role="status" aria-live="polite">
    <TransitionGroup name="toast">
      <div
        v-for="item in toast.items"
        :key="item.id"
        class="toast"
        :class="`toast--${item.type}`"
        @mouseenter="toast.pause(item.id)"
        @mouseleave="toast.resume(item.id)"
      >
        <p class="toast__msg">{{ item.message }}</p>
        <button type="button" class="toast__close" aria-label="关闭提示" @click="toast.dismiss(item.id)">
          <AppIcon name="close" :size="14" />
        </button>
      </div>
    </TransitionGroup>
  </div>
</template>

<script setup>
/**
 * Toast 渲染宿主：全局只挂一个，放在 App.vue 根部。
 *
 * 计时逻辑全在 useToast 里（鼠标进入/离开暂停由这里转发），本组件只负责渲染，
 * 这样即使有多个页面同时弹提示，也只有一套队列、一套计时器。
 */
import { toast } from '../composables/useToast'
import AppIcon from './ui/AppIcon.vue'
</script>

<style scoped>
.toast-host {
  position: fixed;
  /*
   * 桌面端固定在**右下角**：
   * 右上角被导航栏、编辑器工具栏（高 64，紧贴 nav 下）、详情页 TOC（sticky top 88）
   * 三方共用，Toast 落在那里必然压住「写/预览」或 TOC 首项；
   * 右侧中部是阅读区，右下角是唯一不与常驻交互元素重叠的位置。
   */
  bottom: var(--space-6);
  right: var(--space-6);
  z-index: var(--z-toast);
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  width: 320px;
  pointer-events: none; /* 容器不挡住页面点击 */
  /* 进出场位移方向：桌面从下往上（8px），移动端从上方下来（-8px） */
  --toast-from-y: 8px;
}

.toast {
  display: flex;
  align-items: flex-start;
  gap: var(--space-2);
  padding: var(--space-3) var(--space-3) var(--space-3) var(--space-4);
  border-radius: var(--radius-md);
  border-left: 3px solid var(--color-brand);
  background: var(--color-surface);
  box-shadow: var(--shadow-md);
  pointer-events: auto;
}

/* 左侧 3px 色条是唯一的语义信号：绿=成功、红=失败、靛蓝=中性 */
.toast--success {
  border-left-color: var(--color-success);
}

.toast--error {
  border-left-color: var(--color-danger);
}

.toast--info {
  border-left-color: var(--color-brand);
}

.toast__msg {
  flex: 1;
  color: var(--color-ink);
  font-size: var(--text-body-size);
  font-weight: var(--font-weight-medium);
  line-height: var(--text-body-lh);
  word-break: break-word;
}

.toast__close {
  flex: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  border-radius: var(--radius-sm);
  color: var(--color-text-tertiary);
}

.toast__close:hover {
  background: var(--color-surface-sunken);
  color: var(--color-ink);
}

/* 进出场：只动 translateY 与 opacity，成本最低且不会被误认为布局抖动 */
.toast-enter-active,
.toast-leave-active {
  transition:
    opacity var(--dur-base) var(--ease-out),
    transform var(--dur-base) var(--ease-out);
}

.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateY(var(--toast-from-y));
}

.toast-leave-active {
  position: absolute;
  right: 0;
  left: 0;
  bottom: 0;
}

/* <768：顶部居中（移动端顶部没有常驻控件与右侧栏，不会遮挡任何东西） */
@media (max-width: 767px) {
  .toast-host {
    top: calc(var(--nav-h) + var(--space-3));
    bottom: auto;
    left: var(--space-4);
    right: var(--space-4);
    width: auto;
    --toast-from-y: -8px;
  }

  .toast-leave-active {
    top: 0;
    bottom: auto;
  }
}
</style>
