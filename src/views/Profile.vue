<template>
  <div class="profile">
    <!-- 加载/错误都还在导航下方的同一位置上，避免骨架与内容错位 -->
    <template v-if="profileStatus === 'loading' || profileStatus === 'idle'">
      <div class="profile__banner" />
      <div class="profile__body">
        <div class="profile__card">
          <StateLoading variant="inline" :rows="3" />
        </div>
      </div>
    </template>

    <div v-else-if="profileStatus === 'error'" class="profile__body">
      <StateError @retry="loadProfile" />
    </div>

    <div v-else-if="profileStatus === 'missing'" class="profile__body">
      <StateEmpty title="用户不存在" description="这个用户名可能拼错了，或者作者已注销。">
        <router-link to="/" class="btn btn--primary btn--pill">回到首页</router-link>
      </StateEmpty>
    </div>

    <template v-else>
      <div class="profile__banner" />

      <div class="profile__body">
        <!-- 资料卡：向上叠 56px，形成"banner 托着卡片"的层次 -->
        <section class="profile__card">
          <Avatar
            class="profile__avatar"
            :src="profile.image"
            :username="profile.username"
            :size="88"
          />

          <div class="profile__info">
            <h1 class="profile__name">{{ profile.username }}</h1>
            <p class="profile__handle">@{{ profile.username }}</p>
            <p class="profile__bio">{{ profile.bio || '这位作者还没有填写简介。' }}</p>

            <p class="profile__stats">
              <span><strong>{{ profile.articlesCount ?? 0 }}</strong> 文章</span>
              <span class="profile__stats-dot" aria-hidden="true">·</span>
              <span><strong>{{ profile.followersCount ?? 0 }}</strong> 关注者</span>
              <span class="profile__stats-dot" aria-hidden="true">·</span>
              <span><strong>{{ profile.followingCount ?? 0 }}</strong> 关注中</span>
            </p>
          </div>

          <div class="profile__action">
            <router-link v-if="isSelf" to="/settings" class="btn btn--ghost btn--pill">
              编辑资料
            </router-link>
            <button
              v-else
              type="button"
              class="btn btn--pill"
              :class="profile.following ? 'btn--ghost' : 'btn--primary'"
              :disabled="followPending"
              @click="toggleFollow"
            >{{ profile.following ? '已关注' : '关注' }}</button>
          </div>
        </section>

        <TabBar :tabs="tabs" :active="tab" class="profile__tabs" @change="onTabChange" />

        <div class="profile__list">
          <StateLoading v-if="articlesPending" variant="list" :rows="3" />

          <StateError v-else-if="articlesStatus === 'error'" @retry="loadArticles" />

          <StateEmpty
            v-else-if="!articles.length"
            :title="tab === 'favorited' ? '还没有收藏文章' : '还没有发布文章'"
            :description="tab === 'favorited' ? '看到好文章点一下 ♡ 就会出现在这里。' : '写下第一篇，让别人认识你。'"
          >
            <router-link v-if="isSelf && tab === 'authored'" to="/editor" class="btn btn--primary btn--pill">
              写第一篇
            </router-link>
            <router-link v-else to="/" class="btn btn--ghost btn--pill">去首页逛逛</router-link>
          </StateEmpty>

          <ul v-else class="profile__cards">
            <ArticleCard
              v-for="item in articles"
              :key="item.slug"
              :article="item"
              compact
              @tag-click="onTagClick"
            />
          </ul>

          <Pager
            v-if="articlesTotal > PAGE_SIZE"
            :page="page"
            :page-count="pageCount"
            :disabled="articlesStatus === 'loading'"
            @update:page="onPageChange"
          />
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
/**
 * 个人主页
 *
 * Tab 状态放在 URL（`?tab=authored|favorited`）：左栏「我的收藏」就是靠
 * `/profile/{me}?tab=favorited` 进来的，页面刷新/分享也都能还原。
 * 「文章 / 收藏」两个列表用的是同一套 listArticles，只是筛选键不同
 * （author / favorited），没有为收藏再开一个接口。
 */
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { listArticles } from '../api/article'
import { follow, getProfile, unfollow } from '../api/profile'
import { auth } from '../store/auth'
import { toast } from '../composables/useToast'
import { extractErrors } from '../utils/errors'
import Avatar from '../components/ui/Avatar.vue'
import TabBar from '../components/home/TabBar.vue'
import ArticleCard from '../components/ArticleCard.vue'
import Pager from '../components/ui/Pager.vue'
import StateLoading from '../components/ui/StateLoading.vue'
import StateEmpty from '../components/ui/StateEmpty.vue'
import StateError from '../components/ui/StateError.vue'

const route = useRoute()
const router = useRouter()

const PAGE_SIZE = 10

const profile = ref(null)
const profileStatus = ref('idle')
const articles = ref([])
const articlesStatus = ref('idle')
const articlesTotal = ref(0)
const followPending = ref(false)
// 「收藏」Tab 的条数（profile 接口只给 articlesCount，收藏数要靠列表响应带回来）
const favoritedTotal = ref(null)

const username = computed(() => (typeof route.params.username === 'string' ? route.params.username : ''))
const tab = computed(() => (route.query.tab === 'favorited' ? 'favorited' : 'authored'))
const page = computed(() => {
  const parsed = Number.parseInt(route.query.page, 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1
})
const pageCount = computed(() => Math.max(1, Math.ceil(articlesTotal.value / PAGE_SIZE)))
const isSelf = computed(() => auth.isOwner(username.value))
const articlesPending = computed(
  () => articlesStatus.value === 'idle' || articlesStatus.value === 'loading'
)

const tabs = computed(() => [
  { key: 'authored', label: `文章 (${profile.value?.articlesCount ?? 0})` },
  {
    key: 'favorited',
    label: favoritedTotal.value === null ? '收藏' : `收藏 (${favoritedTotal.value})`
  }
])

async function loadProfile() {
  if (!username.value) {
    profileStatus.value = 'missing'
    return
  }
  profileStatus.value = 'loading'
  try {
    const { data } = await getProfile(username.value)
    profile.value = data?.profile || null
    profileStatus.value = profile.value ? 'success' : 'missing'
    document.title = `${username.value} · Conduit`
  } catch (e) {
    if (e?.response?.status === 404) {
      profileStatus.value = 'missing'
      return
    }
    const { first } = extractErrors(e)
    toast.error(first)
    profileStatus.value = 'error'
  }
}

async function loadArticles() {
  if (!username.value) return
  articlesStatus.value = 'loading'
  try {
    const params =
      tab.value === 'favorited'
        ? { favorited: username.value, limit: PAGE_SIZE, offset: (page.value - 1) * PAGE_SIZE }
        : { author: username.value, limit: PAGE_SIZE, offset: (page.value - 1) * PAGE_SIZE }
    const { data } = await listArticles(params)
    articles.value = Array.isArray(data?.articles) ? data.articles : []
    articlesTotal.value = Number(data?.articlesCount) || 0
    if (tab.value === 'favorited') {
      favoritedTotal.value = articlesTotal.value
    }
    articlesStatus.value = 'success'
  } catch (e) {
    const { first } = extractErrors(e)
    toast.error(first)
    articles.value = []
    articlesTotal.value = 0
    articlesStatus.value = 'error'
  }
}

async function toggleFollow() {
  if (!auth.isAuthenticated()) {
    toast.error('登录后才能关注')
    router.push({ path: '/login', query: { redirect: route.fullPath } })
    return
  }
  if (!profile.value || followPending.value) return

  const before = !!profile.value.following
  followPending.value = true
  profile.value.following = !before
  profile.value.followersCount = Math.max(
    0,
    (profile.value.followersCount ?? 0) + (before ? -1 : 1)
  )

  try {
    const { data } = before
      ? await unfollow(username.value)
      : await follow(username.value)
    if (data?.profile) profile.value = { ...profile.value, ...data.profile }
  } catch (e) {
    profile.value.following = before
    profile.value.followersCount = Math.max(
      0,
      (profile.value.followersCount ?? 0) + (before ? 1 : -1)
    )
    const { first } = extractErrors(e)
    toast.error(first)
  } finally {
    followPending.value = false
  }
}

/** Tab 只写 URL（authored 是默认值，不写进 URL 保持链接干净）；切 Tab 回第 1 页 */
function onTabChange(key) {
  const next = { ...route.query }
  if (key === 'favorited') next.tab = 'favorited'
  else delete next.tab
  delete next.page
  router.replace({ query: next })
}

function onPageChange(nextPage) {
  const next = { ...route.query }
  if (nextPage > 1) next.page = nextPage
  else delete next.page
  router.replace({ query: next })
}

function onTagClick(tag) {
  router.push({ path: '/', query: { tag } })
}

watch(username, () => {
  // 换用户时清掉上一页的状态，避免闪出别人的数据
  profile.value = null
  articles.value = []
  articlesTotal.value = 0
  favoritedTotal.value = null
  profileStatus.value = 'idle'
  articlesStatus.value = 'idle'
  loadProfile()
  loadArticles()
}, { immediate: true })

watch([tab, page], loadArticles)
</script>

<style scoped>
.profile {
  max-width: var(--container-xl);
  margin: 0 auto;
  padding: 0 0 var(--space-16);
}

.profile__banner {
  height: 160px;
  margin: var(--space-6) var(--space-6) 0;
  border-radius: var(--radius-lg);
  background: linear-gradient(135deg, var(--color-brand-soft) 0%, var(--color-surface-sunken) 100%);
}

.profile__body {
  padding: 0 var(--space-6);
}

.profile__card {
  display: flex;
  align-items: flex-start;
  gap: var(--space-6);
  /* 向上叠 56px：banner 与资料卡形成层次，而不是两张并排的白块 */
  margin-top: -56px;
  padding: 28px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-xl);
  background: var(--color-surface);
  box-shadow: var(--shadow-md);
}

/* 4px 白描边让头像从卡片上"浮"起来 */
.profile__avatar {
  border: 4px solid var(--color-surface);
  box-shadow: var(--shadow-xs);
}

.profile__info {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  min-width: 0;
  flex: 1;
}

.profile__name {
  color: var(--color-ink);
  font-size: var(--text-h2-size);
  font-weight: var(--font-weight-semibold);
  line-height: var(--text-h2-lh);
}

.profile__handle {
  color: var(--color-text-tertiary);
  font-size: var(--text-sm-size);
  line-height: var(--text-sm-lh);
}

.profile__bio {
  display: -webkit-box;
  overflow: hidden;
  margin-top: var(--space-1);
  color: var(--color-text);
  font-size: var(--text-body-size);
  line-height: var(--text-body-lh);
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  line-clamp: 2;
}

.profile__stats {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-2);
  margin-top: var(--space-2);
  color: var(--color-text-secondary);
  font-size: var(--text-sm-size);
  line-height: var(--text-sm-lh);
}

.profile__stats strong {
  color: var(--color-ink);
  font-weight: var(--font-weight-semibold);
  font-variant-numeric: tabular-nums;
}

.profile__stats-dot {
  color: var(--color-text-tertiary);
}

.profile__action {
  flex: none;
}

.profile__tabs {
  margin-top: var(--space-8);
}

.profile__list {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  min-height: 40vh;
  padding-top: var(--space-4);
}

.profile__cards {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

@media (max-width: 767px) {
  .profile__banner {
    height: 120px;
    margin: var(--space-4) var(--space-4) 0;
  }

  .profile__body {
    padding: 0;
  }

  .profile__card {
    flex-direction: column;
    margin: -40px var(--space-4) 0;
    padding: var(--space-5);
    border-radius: var(--radius-lg);
  }

  .profile__action {
    width: 100%;
  }

  .profile__tabs {
    margin: var(--space-5) var(--space-4) 0;
  }

  .profile__list {
    padding-top: 0;
  }

  .profile__cards {
    gap: 0;
  }
}
</style>
