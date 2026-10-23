<template>
  <section class="hero">
    <div class="hero__inner">
      <h1 class="hero__title">写作、分享、被看见。</h1>
      <p class="hero__subtitle">在这里记录你的技术思考，让同行读到它。</p>
      <div class="hero__actions">
        <router-link to="/register" class="btn btn--primary btn--pill btn--lg">开始写作</router-link>
        <button type="button" class="btn btn--ghost btn--pill btn--lg" @click="$emit('browse-hot')">
          浏览热门
        </button>
      </div>
    </div>
  </section>
</template>

<script setup>
/**
 * 首页 Hero（仅未登录 + 无筛选 + tab=latest 时由 Home 决定是否渲染）
 *
 * 背景不用图片：一张 hero 图就是首屏最大的 LCP 负担。
 * 用「品牌浅色 → 透明的 135° 渐变 + 24px 点阵」表达同样的层次，零请求。
 * 点阵色用 color-mix 从 --color-ink 取 4% 透明度，不引入裸 rgba。
 */
defineEmits(['browse-hot'])
</script>

<style scoped>
.hero {
  background-image:
    radial-gradient(
      color-mix(in srgb, var(--color-ink) 4%, transparent) 1px,
      transparent 1px
    ),
    linear-gradient(135deg, var(--color-brand-soft) 0%, transparent 72%);
  background-size:
    24px 24px,
    100% 100%;
}

/**
 * 水平内边距必须由 Hero 自己带：
 * <768 时父容器（.home）为了让卡片贴边会把水平 padding 置 0，
 * 如果 Hero 依赖父容器，标题就会贴到屏幕边缘（QA 截图可复现）。
 * 这里给 24px（桌面）/ 16px（移动），正好与卡片内部的文字左边缘对齐。
 *
 * 不用 margin:auto 居中：Hero 与下方文章列表同属中列，
 * 一旦居中，1024–1279（中列比 720 宽）时 Hero 文案会比卡片缩进一截，视觉上"跑偏"。
 */
.hero__inner {
  max-width: var(--container-md);
  padding: var(--space-16) var(--space-6);
}

.hero__title {
  color: var(--color-ink);
  font-size: var(--text-display-size);
  font-weight: var(--font-weight-semibold);
  line-height: var(--text-display-lh);
  letter-spacing: -0.02em;
}

.hero__subtitle {
  margin-top: var(--space-3);
  color: var(--color-text-secondary);
  font-size: var(--text-bodyLg-size);
  line-height: var(--text-bodyLg-lh);
}

.hero__actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-3);
  margin-top: var(--space-4);
}

/* 移动端收起为紧凑版：只留标题 + 主按钮（副按钮在窄屏是干扰） */
@media (max-width: 767px) {
  .hero__inner {
    /* 与贴边卡片的内部 padding 保持一致（16px），标题不会贴屏 */
    padding: var(--space-10) var(--space-4);
  }

  .hero__title {
    font-size: var(--text-h1-size);
    line-height: var(--text-h1-lh);
  }

  .hero__subtitle {
    font-size: var(--text-body-size);
    line-height: var(--text-body-lh);
  }

  .hero__actions .btn--ghost {
    display: none;
  }
}
</style>
