/**
 * 文章列表状态机：**URL 是唯一状态源**
 *
 * 设计要点（为什么这样写）：
 * 1) 不存 `tab/tag/q/page` 的 ref —— 它们全部从 route.query 派生。
 *    这样浏览器前进/后退、刷新、分享链接、从详情页点标签跳回，都只有一条代码路径。
 * 2) 所有 setter 只写 URL，请求由 watch 统一触发，避免「点了 Tab 但没发请求」这类漏调。
 * 3) 竞态丢弃：快速切 Tab 时，先发的请求可能后回来，用自增 requestId 判断，
 *    过期响应直接 return，绝不覆盖新数据（这是列表页最容易出现的玄学 bug）。
 */
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getFeed, listArticles } from '../api/article'
import { auth } from '../store/auth'
import { toast } from '../composables/useToast'
import { extractErrors } from '../utils/errors'

/** 每页条数固定 10：与后端默认一致，也与 PRD 的分页器设计一致 */
export const PAGE_SIZE = 10

const TABS = ['following', 'latest', 'hot']

export function useArticleList() {
  const route = useRoute()
  const router = useRouter()

  const articles = ref([])
  const total = ref(0)
  // idle | loading | success | error —— 视图用一张表驱动三态，不用三个布尔量打架
  const status = ref('idle')

  // 竞态令牌：只有最后一次发出的请求允许写结果
  let latestId = 0

  const tab = computed(() => {
    const raw = typeof route.query.tab === 'string' ? route.query.tab : ''
    return TABS.includes(raw) ? raw : 'latest'
  })

  const tag = computed(() => normalizeText(route.query.tag))
  const q = computed(() => normalizeText(route.query.q))

  const page = computed(() => {
    const parsed = Number.parseInt(route.query.page, 10)
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 1
  })

  const pageCount = computed(() => Math.max(1, Math.ceil(total.value / PAGE_SIZE)))

  async function load() {
    const requestId = ++latestId

    // 关注流必须登录：未登录时提示一次并回落到「最新」，
    // 直接把 URL 里的 tab 改掉，避免用户刷新后仍然卡在空列表
    if (tab.value === 'following' && !auth.isAuthenticated()) {
      toast.error('登录后才能查看关注流')
      setTab('latest')
      return
    }

    status.value = 'loading'
    try {
      const offset = (page.value - 1) * PAGE_SIZE
      const { data } =
        tab.value === 'following'
          ? await getFeed({ limit: PAGE_SIZE, offset })
          : await listArticles({
              tag: tag.value,
              q: q.value,
              sort: tab.value === 'hot' ? 'hot' : 'recent',
              limit: PAGE_SIZE,
              offset
            })

      if (requestId !== latestId) return // 已有更新的请求发出，丢弃本次结果

      articles.value = Array.isArray(data?.articles) ? data.articles : []
      total.value = Number(data?.articlesCount) || 0
      status.value = 'success'
    } catch (e) {
      if (requestId !== latestId) return
      const { first } = extractErrors(e)
      toast.error(first)
      articles.value = []
      total.value = 0
      status.value = 'error'
    }
  }

  /**
   * 写回 URL：空值/默认值一律从 query 里删掉，
   * 保证「同一个筛选状态只有一种 URL」，也避免 ?tab=latest&page=1 这类噪音进历史记录
   */
  function writeQuery(patch) {
    const next = { ...route.query, ...patch }
    for (const key of Object.keys(next)) {
      const value = next[key]
      if (value === undefined || value === null || value === '') {
        delete next[key]
        continue
      }
      if (key === 'tab' && value === 'latest') delete next[key]
      if (key === 'page' && String(value) === '1') delete next[key]
    }
    // replace 而不是 push：切 Tab / 翻页不该在浏览器历史里堆出十几条记录，
    // 否则用户按「后退」要按十几次才能离开首页
    router.replace({ query: next })
  }

  /** 切 Tab：必须回到第 1 页，否则会停留在「热门第 3 页」这种不存在的组合 */
  function setTab(nextTab) {
    writeQuery({ tab: TABS.includes(nextTab) ? nextTab : 'latest', page: 1 })
  }

  /** 选标签：同样回到第 1 页；传空则清除标签筛选 */
  function setTag(nextTag) {
    writeQuery({ tag: nextTag || '', page: 1 })
  }

  /** 搜索：写 q，回到第 1 页 */
  function setQuery(nextQuery) {
    writeQuery({ q: nextQuery || '', page: 1 })
  }

  function setPage(nextPage) {
    writeQuery({ page: nextPage })
  }

  /** 手动刷新（错误态点「重试」、发布/删除文章后回来） */
  function refresh() {
    return load()
  }

  watch([tab, tag, q, page], load, { immediate: true })

  return {
    // 状态
    articles,
    total,
    status,
    pageCount,
    pageSize: PAGE_SIZE,
    // 派生查询条件（只读，改它们请用下面的 setter）
    tab,
    tag,
    q,
    page,
    // 动作
    refresh,
    setTab,
    setTag,
    setQuery,
    setPage
  }
}

function normalizeText(value) {
  if (typeof value !== 'string') return ''
  return value.trim()
}
