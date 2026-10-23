<template>
  <section class="author-card">
    <div class="author-card__body">
      <Avatar :src="profile?.image" :username="username" :size="56" />

      <div class="author-card__info">
        <router-link :to="`/profile/${username}`" class="author-card__name">{{ username }}</router-link>
        <p class="author-card__bio">{{ profile?.bio || '这位作者还没有填写简介。' }}</p>
        <!-- 统计拿不到就整块不显示：宁可缺一行，也不要出现「0 篇文章」的假数据 -->
        <p v-if="statsText" class="author-card__stats">{{ statsText }}</p>
      </div>
    </div>

    <div class="author-card__action">
      <router-link v-if="isSelf" to="/settings" class="btn btn--ghost btn--pill">
        编辑资料 →
      </router-link>
      <button
        v-else
        type="button"
        class="btn btn--pill"
        :class="following ? 'btn--ghost' : 'btn--primary'"
        :disabled="pending"
        @click="toggleFollow"
      >{{ following ? '已关注' : '关注' }}</button>
    </div>
  </section>
</template>

<script setup>
/**
 * 详情页文末作者卡
 *
 * 关注状态由父组件持有（`following` prop），本组件只负责发请求并回抛 `update:following`：
 * 头像行与文末卡显示的是同一个「是否已关注」，两处各自持有一份状态必然会不同步。
 */
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getProfile, follow, unfollow } from '../api/profile'
import { auth } from '../store/auth'
import { toast } from '../composables/useToast'
import { extractErrors } from '../utils/errors'
import Avatar from './ui/Avatar.vue'

const props = defineProps({
  username: { type: String, required: true },
  following: { type: Boolean, default: false }
})

const emit = defineEmits(['update:following'])

const route = useRoute()
const router = useRouter()

const profile = ref(null)
const pending = ref(false)

const isSelf = computed(() => auth.isOwner(props.username))

// 只展示接口真实返回的两个数，不臆造「获赞」之类的指标
const statsText = computed(() => {
  if (!profile.value) return ''
  const { articlesCount, followersCount } = profile.value
  if (typeof articlesCount !== 'number' || typeof followersCount !== 'number') return ''
  return `${articlesCount} 篇文章 · ${followersCount} 关注者`
})

async function toggleFollow() {
  if (!auth.isAuthenticated()) {
    toast.error('登录后才能关注作者')
    router.push({ path: '/login', query: { redirect: route.fullPath } })
    return
  }
  if (pending.value) return

  const before = props.following
  pending.value = true
  emit('update:following', !before) // 乐观更新

  try {
    await (before ? unfollow(props.username) : follow(props.username))
    // 关注/取关会改变 followersCount，顺手刷新一次统计
    await loadProfile()
  } catch (e) {
    emit('update:following', before) // 回滚
    const { first } = extractErrors(e)
    toast.error(first)
  } finally {
    pending.value = false
  }
}

async function loadProfile() {
  try {
    const { data } = await getProfile(props.username)
    profile.value = data?.profile || null
  } catch (e) {
    // 作者卡是次要信息：拿不到资料就不显示 bio/统计，卡片本身仍然可用
    profile.value = null
  }
}

onMounted(loadProfile)
</script>

<style scoped>
.author-card {
  display: flex;
  align-items: flex-start;
  gap: var(--space-4);
  padding: var(--space-6);
  border-radius: var(--radius-lg);
  background: var(--color-surface-sunken);
}

.author-card__body {
  display: flex;
  gap: var(--space-4);
  min-width: 0;
}

.author-card__info {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  min-width: 0;
}

.author-card__name {
  color: var(--color-ink);
  font-size: var(--text-h3-size);
  font-weight: var(--font-weight-semibold);
  line-height: var(--text-h3-lh);
}

.author-card__name:hover {
  color: var(--color-brand);
}

.author-card__bio {
  display: -webkit-box;
  overflow: hidden;
  color: var(--color-text-secondary);
  font-size: var(--text-body-size);
  line-height: var(--text-body-lh);
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  line-clamp: 2;
}

.author-card__stats {
  color: var(--color-text-tertiary);
  font-size: var(--text-sm-size);
  line-height: var(--text-sm-lh);
}

.author-card__action {
  flex: none;
  margin-left: auto;
}

@media (max-width: 767px) {
  .author-card {
    flex-direction: column;
    padding: var(--space-4);
  }

  .author-card__action {
    margin-left: 0;
  }
}
</style>
