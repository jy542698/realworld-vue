/**
 * 时间与阅读时长工具（无第三方依赖）
 *
 * 所有入参都是后端返回的 ISO-8601 字符串（带 Z 的 UTC），
 * 一律 new Date(iso) 让浏览器解析后按本地时区展示，绝不手工加 8 小时。
 */

const MINUTE = 60 * 1000
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR

function pad2(n) {
  return String(n).padStart(2, '0')
}

/**
 * 相对时间：刚刚 / N分钟前 / N小时前 / 昨天 / N天前 / YYYY-MM-DD
 *
 * 六段划分与 PRD P0-18 一一对应。未来时间（两台机器时钟偏差）按「刚刚」处理，
 * 否则会出现「-1分钟前」这种明显的 bug 观感。
 *
 * @param {string} iso ISO-8601 时间串
 * @returns {string} 可直接展示的中文文案，入参非法时返回空串
 */
export function relativeTime(iso) {
  if (!iso) return ''
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''

  const diff = Date.now() - date.getTime()
  if (diff < MINUTE) return '刚刚'

  if (diff < HOUR) return `${Math.floor(diff / MINUTE)}分钟前`
  if (diff < DAY) return `${Math.floor(diff / HOUR)}小时前`
  if (diff < 2 * DAY) return '昨天'
  if (diff < 7 * DAY) return `${Math.floor(diff / DAY)}天前`

  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`
}

/**
 * 绝对日期 YYYY-MM-DD（本地时区），用于 <time> 的 title 提示等场景
 */
export function formatDate(iso) {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`
}

/**
 * 预估阅读时长（分钟，至少 1）
 *
 * 中英文混排分别按「350 字/分钟」与「200 词/分钟」折算后相加：
 * 纯按字符数会高估英文（一个单词十几个字符但读得很快），纯按词会低估中文。
 *
 * @param {string} body Markdown 原文
 * @returns {number} 整数分钟
 */
export function readingMinutes(body) {
  const text = typeof body === 'string' ? body : ''
  if (!text.trim()) return 1

  const cjkCount = (text.match(/[\u4e00-\u9fff]/g) || []).length
  // 英文单词：连续字母数字算一个词（代码里的标识符也算，误差可接受）
  const wordCount = (text.replace(/[\u4e00-\u9fff]/g, ' ').match(/[A-Za-z0-9_]+/g) || []).length

  const minutes = cjkCount / 350 + wordCount / 200
  return Math.max(1, Math.ceil(minutes))
}
