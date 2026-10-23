import client from './client'

// 全部标签：GET /tags  -> { tags: ["vue", "spring", ...] }
// 结构保持不变（字符串数组），只是顺序改为按使用文章数降序
export function listTags() {
  return client.get('/tags')
}

/**
 * 热门标签：GET /tags/hot?limit=10 -> { tags: [{ name, count }] }
 * 后端已按 count 降序，前端不要再排序
 *
 * @param {number} limit 条数，后端上限 50
 */
export function getHotTags(limit = 10) {
  return client.get('/tags/hot', { params: { limit } })
}

/**
 * 全量标签统计：GET /tags/stats -> { tags: [{ name, count }] }
 *
 * 与 /tags/hot 的区别：hot 是 top-N（默认 10 条），stats 是全量，供独立标签页展示。
 * 只统计**已发布**文章，仅在草稿里出现的标签不会出现在这里。
 */
export function getTagStats() {
  return client.get('/tags/stats')
}
