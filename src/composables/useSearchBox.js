/**
 * 搜索框：输入即写 URL（防抖 300ms）
 *
 * 为什么写 URL 而不是本地状态：搜索结果是列表的一种「筛选态」，
 * 与 tag/tab/page 同源。写进 URL 后，刷新、分享、后退都能还原，
 * 也避免出现「输入框里有词但列表还是全量」的双份状态。
 *
 * 用 replace 不用 push：逐字输入会堆出十几个历史记录，用户按后退会被困住。
 */
import { onBeforeUnmount, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const DEBOUNCE_MS = 300

export function useSearchBox() {
  const route = useRoute()
  const router = useRouter()

  const query = ref(readQuery(route))
  let timer = null

  // URL → 输入框：清空筛选、点击「最新」重置、从别的页面跳回首页都要回填
  watch(
    () => route.query.q,
    (value) => {
      const next = typeof value === 'string' ? value : ''
      if (next !== query.value.trim()) query.value = next
    }
  )

  function writeToUrl() {
    const keyword = query.value.trim()
    const current = typeof route.query.q === 'string' ? route.query.q : ''
    const onHome = route.path === '/'

    // 在其他页面（详情/主页/设置）用顶部搜索框：搜索本身就是一次导航，
    // 必须回到首页的列表态，而不是把 ?q= 挂到当前文章页的 URL 上
    if (!onHome) {
      if (!keyword) return
      router.push({ path: '/', query: { q: keyword } })
      return
    }

    if (keyword === current) return

    const next = { ...route.query }
    if (keyword) next.q = keyword
    else delete next.q
    // 换了关键词必须回第 1 页，否则可能停在一个不存在的页号上
    delete next.page
    router.replace({ query: next })
  }

  /** 输入时防抖：每停 300ms 才发一次请求，而不是每个字符一次 */
  function onInput() {
    clearTimeout(timer)
    timer = setTimeout(writeToUrl, DEBOUNCE_MS)
  }

  /** Enter 立即提交（取消防抖等待） */
  function commit() {
    clearTimeout(timer)
    writeToUrl()
  }

  /** Esc 清空 */
  function clear() {
    clearTimeout(timer)
    query.value = ''
    writeToUrl()
  }

  onBeforeUnmount(() => {
    clearTimeout(timer)
  })

  return { query, onInput, commit, clear }
}

function readQuery(route) {
  return typeof route.query.q === 'string' ? route.query.q : ''
}
