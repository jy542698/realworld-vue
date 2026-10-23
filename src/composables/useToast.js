/**
 * Toast 队列（模块级单例）
 *
 * 为什么是模块级 reactive 而不是 provide/inject：
 * 1) 任意位置（包括 axios 拦截器、router 守卫）都能直接 import 调用；
 * 2) 拦截器不是组件，拿不到 inject 上下文。
 *
 * 为什么本文件**不能** import client.js：
 * client.js 要 import 本文件来弹 401 提示，如果这里再 import client，
 * 就形成 ESM 循环依赖，模块初始化顺序会变得不可预测。方向只允许 client → toast。
 */
import { reactive } from 'vue'

const MAX_VISIBLE = 3
const DURATION = 2500

// 队列本身是响应式的（用于渲染）；计时器句柄故意放在普通 Map 里，
// 避免把 timer id 也变成响应式数据引发无意义的渲染。
const items = reactive([])
const timers = new Map()
let seed = 0

function clearTimer(id) {
  const timer = timers.get(id)
  if (timer) {
    clearTimeout(timer)
    timers.delete(id)
  }
}

function startTimer(id) {
  clearTimer(id)
  timers.set(
    id,
    setTimeout(() => {
      dismiss(id)
    }, DURATION)
  )
}

/**
 * 关闭一条 Toast
 * @param {number} id
 */
export function dismiss(id) {
  clearTimer(id)
  const index = items.findIndex((item) => item.id === id)
  if (index !== -1) items.splice(index, 1)
}

/**
 * 显示一条 Toast
 * @param {string} message 文案
 * @param {'success'|'error'|'info'} type 类型，决定左侧色条
 * @returns {number} 该条 Toast 的 id
 */
export function show(message, type = 'info') {
  const text = typeof message === 'string' ? message : String(message ?? '')
  if (!text.trim()) return -1

  // 超过上限先挤掉最老的一条，保证视觉上永远不超过 3 条
  while (items.length >= MAX_VISIBLE) {
    dismiss(items[0].id)
  }

  seed += 1
  const id = seed
  items.push({ id, message: text, type })
  startTimer(id)
  return id
}

/** 鼠标悬停时暂停自动消失——用户正在读，不该被抽走 */
export function pause(id) {
  clearTimer(id)
}

/** 移出后重新计时（重新给完整的 2.5s，而不是剩余时间，避免「刚移开就消失」） */
export function resume(id) {
  if (items.some((item) => item.id === id)) startTimer(id)
}

export const toast = {
  items,
  show,
  dismiss,
  pause,
  resume,
  success: (message) => show(message, 'success'),
  error: (message) => show(message, 'error'),
  info: (message) => show(message, 'info')
}

/** 组合式写法入口（组件里 `const { toast } = useToast()` 或直接 import） */
export function useToast() {
  return { toast, items, show, dismiss }
}
