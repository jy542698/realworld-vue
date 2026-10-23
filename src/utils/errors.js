/**
 * 后端错误体 → 前端可用结构
 *
 * 后端约定（契约冻结）：{"errors": {"body": ["中文文案"], "title": ["标题不能为空"]}}
 * - body 恒存在（兜底文案）
 * - 字段名键是可选的增强，用于表单 inline 提示
 *
 * 三层返回值各有用处：
 *   fieldMap —— 字段级提示（errors.title[0]）
 *   first    —— Toast 一句话（最常用）
 *   list     —— 需要一次性展示全部错误时（登录页 alert 条）
 */

const NETWORK_FALLBACK = '网络异常，请稍后重试'

/**
 * @param {unknown} err axios 抛出的错误对象（或其他任意异常）
 * @returns {{ fieldMap: Record<string, string[]>, list: string[], first: string }}
 */
export function extractErrors(err) {
  const e = err?.response?.data?.errors
  if (!e) return { fieldMap: {}, list: [NETWORK_FALLBACK], first: NETWORK_FALLBACK }

  const list = Object.values(e).flat().filter(Boolean)
  return { fieldMap: e, list, first: list[0] || '操作失败' }
}

/**
 * 取某个字段的第一条错误（没有则返回空串，模板里可直接放进 v-if）
 *
 * @param {Record<string, string[]>} fieldMap
 * @param {string} field 后端字段名，如 'title' / 'email' / 'body'
 * @returns {string}
 */
export function pickFieldError(fieldMap, field) {
  const value = fieldMap?.[field]
  if (!value) return ''
  return Array.isArray(value) ? value[0] || '' : String(value)
}
