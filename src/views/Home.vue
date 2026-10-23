<template>
  <div class="home">
    <div class="home__layout">
      <div class="home__rail">
        <NavRail :tags="hotTags" />
      </div>

      <main class="home__main">
        <!-- Hero 只在「游客 + 无任何筛选 + 最新」时出现：一旦用户开始筛选，就不该再占版面 -->
        <HeroBanner v-if="showHero" @browse-hot="setTab('hot')" />

        <TabBar :tabs="tabs" :active="tab" @change="onTabChange" />

        <div v-if="q" class="home__notice">
          <span>搜索 “{{ q }}” 的结果（{{ total }} 条）</span>
          <button type="button" class="home__notice-action" @click="setQuery('')">清除</button>
        </div>

        <div v-if="tag" class="home__notice">
          <span>正在筛选标签</span>
          <TagPill :name="tag" active @click="setTag('')" />
          <button type="button" class="home__notice-action" @click="setTag('')">清除</button>
        </div>

        <div class="home__list">
          <StateLoading v-if="isPending" variant="list" :rows="3" />

          <StateError v-else-if="status === 'error'" @retry="refresh" />

          <StateEmpty
            v-else-if="!articles.length"
            :title="emptyState.title"
            :description="emptyState.description"
          >
            <router-link v-if="emptyState.to" :to="emptyState.to" class="btn btn--primary btn--pill">
              {{ emptyState.action }}
            </router-link>
            <button v-else type="button" class="btn btn--ghost btn--pill" @click="emptyState.onClick">
              {{ emptyState.action }}
            </button>
          </StateEmpty>

          <ul v-else class="home__cards">
            <ArticleCard
              v-for="article in articles"
              :key="article.slug"
              :article="article"
              @tag-click="onTagClick"
            />
          </ul>
        </div>

        <Pager
          :page="page"
          :page-count="pageCount"
          :disabled="status === 'loading'"
          @update:page="setPage"
        />
      </main>

      <div class="home__aside">
        <HomeSidebar :hot-tags="hotTags" :tags-loading="tagsLoading" @tag-click="onTagClick" />
      </div>
    </div>
  </div>
</template>

<script setup>
/**
 * 首页
 *
 * 这个页面本身**不持有任何筛选状态**：tab/tag/q/page 全部来自 URL
 * （见 useArticleList / useSearchBox）。视图只做三件事：
 * 1) 把状态映射成 UI（Hero / 命中条 / 三态 / 分页器）；
 * 2) 把用户操作翻译成 setXxx（写 URL）；
 * 3) 决定空态该说什么话。
 */
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { auth } from '../store/auth'
import { getHotTags } from '../api/tag'
import { toast } from '../composables/useToast'
import { useArticleList } from '../composables/useArticleList'
import ArticleCard from '../components/ArticleCard.vue'
import HeroBanner from '../components/home/HeroBanner.vue'
import TabBar from '../components/home/TabBar.vue'
import NavRail from '../components/home/NavRail.vue'
import HomeSidebar from '../components/home/HomeSidebar.vue'
import TagPill from '../components/ui/TagPill.vue'
import Pager from '../components/ui/Pager.vue'
import StateLoading from '../components/ui/StateLoading.vue'
import StateEmpty from '../components/ui/StateEmpty.vue'
import StateError from '../components/ui/StateError.vue'

const tabs = [
  { key: 'following', label: '你的关注' },
  { key: 'latest', label: '最新' },
  { key: 'hot', label: '最热' }
]

const route = useRoute()
const router = useRouter()

const {
  articles,
  total,
  status,
  pageCount,
  page,
  tab,
  tag,
  q,
  refresh,
  setTab,
  setTag,
  setPage,
  setQuery
} = useArticleList()

const showHero = computed(
  () => !auth.isAuthenticated() && !tag.value && !q.value && tab.value === 'latest'
)

// idle 与 loading 走同一个骨架：首屏不该先闪一下空态再变成列表
const isPending = computed(() => status.value === 'idle' || status.value === 'loading')

/** 空态文案按「用户此刻的筛选条件」分别给出，而不是永远一句「还没有文章」 */
const emptyState = computed(() => {
  if (q.value) {
    return {
      title: '没有找到相关文章',
      description: `没有匹配 “${q.value}” 的内容，换个关键词试试。`,
      action: '清除搜索',
      onClick: () => setQuery('')
    }
  }
  if (tag.value) {
    return {
      title: '这个标签下还没有文章',
      description: `换个标签，或者成为第一个写 #${tag.value} 的人。`,
      action: '清除标签筛选',
      onClick: () => setTag('')
    }
  }
  if (tab.value === 'following') {
    return {
      title: '你关注的人还没发文',
      description: '去关注几位作者，这里就会出现他们的新文章。',
      action: '看看热门',
      onClick: () => setTab('hot')
    }
  }
  return {
    title: '这里还没有文章',
    description: '成为第一个在这里写下想法的人。',
    action: '写第一篇',
    to: '/editor'
  }
})

/**
 * Tab 切换：「你的关注」未登录时先拦一次。
 * 不拦的话 useArticleList 会先把 tab=following 写进 URL、再回落 latest，
 * 等于白跑两次请求、两次路由替换。
 */
function onTabChange(key) {
  if (key === 'following' && !auth.isAuthenticated()) {
    toast.error('登录后才能查看关注流')
    router.push({ path: '/login', query: { redirect: route.fullPath } })
    return
  }
  setTab(key)
}

/** 点标签：同一个再点一次＝取消筛选（比强迫用户去找「清除」更符合直觉） */
function onTagClick(name) {
  setTag(tag.value === name ? '' : name)
}

// 热门标签只请求一次，左栏与右栏共用（否则首页会并发两个 /tags/hot）
const hotTags = ref([])
const tagsLoading = ref(true)

onMounted(async () => {
  try {
    const { data } = await getHotTags(10)
    hotTags.value = Array.isArray(data?.tags) ? data.tags : []
  } catch (e) {
    // 次要信息：失败就两侧都不显示标签区，不打扰用户
    hotTags.value = []
  } finally {
    tagsLoading.value = false
  }
})
</script>

<style scoped>
.home {
  max-width: var(--container-xl);
  margin: 0 auto;
  padding: 0 var(--space-6) var(--space-16);
}

.home__layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: var(--space-8);
  align-items: start;
}

.home__rail,
.home__aside {
  display: none;
}

.home__main {
  min-width: 0;
}

.home__notice {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-3) 0;
  color: var(--color-text-secondary);
  font-size: var(--text-sm-size);
}

.home__notice-action {
  color: var(--color-brand);
  font-size: var(--text-sm-size);
}

.home__notice-action:hover {
  color: var(--color-brand-strong);
}

/* 列表区最小高度：翻页/切态时页面高度不塌，滚动条不会乱跳 */
.home__list {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  min-height: 60vh;
  padding-top: var(--space-4);
}

.home__cards {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

/* 1024–1279：左栏让位，保留右栏 */
@media (min-width: 1024px) {
  .home__layout {
    grid-template-columns: minmax(0, 1fr) 300px;
    gap: var(--space-8);
  }

  .home__aside {
    display: block;
  }
}

/* ≥1280：三栏 200 / 1fr / 300 */
@media (min-width: 1280px) {
  .home__layout {
    grid-template-columns: 200px minmax(0, 1fr) 300px;
    gap: var(--space-10);
  }

  .home__rail {
    display: block;
  }
}

/* <768：卡片贴边，去掉左右内边距（卡片自身也去掉了圆角与左右边框） */
@media (max-width: 767px) {
  .home {
    padding: 0 0 var(--space-12);
  }

  .home__notice {
    padding: var(--space-3) var(--space-4);
  }

  .home__list {
    padding-top: 0;
    gap: 0;
    min-height: 50vh;
  }

  .home__cards {
    gap: 0;
  }
}
</style>
