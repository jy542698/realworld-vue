import axios from 'axios'
import { auth } from '../store/auth'
import { toast } from '../composables/useToast'

/**
 * 全局 axios 实例
 *
 * 依赖方向（不可反转）：api/* → client.js → { store/auth, composables/useToast }
 * useToast 绝不 import 本文件，否则 401 提示会和拦截器形成循环依赖。
 */
const client = axios.create({
  baseURL: '/api',
  // 15s：后端列表查询最慢也在百毫秒级，超过 15s 基本可判定为网络异常，
  // 不给用户「转圈 1 分钟」的糟糕体验
  timeout: 15000
})

// 请求拦截器：已登录时自动带上 Token（RealWorld 规范要求 'Token ' 前缀，不是 Bearer）
client.interceptors.request.use((config) => {
  if (auth.state.token) {
    config.headers.Authorization = `Token ${auth.state.token}`
  }
  return config
})

// 响应拦截器：统一处理登录态失效
client.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status
    if (status === 401) {
      // 记住「原本是否有 token」：匿名用户访问受保护接口本来就会 401，
      // 那种情况弹「登录已过期」会让人莫名其妙。
      const hadToken = !!auth.state.token
      auth.clearAuth()
      if (hadToken) {
        toast.error('登录已过期，请重新登录')
      }
      // 不做自动跳转：用户可能正在公开列表页滚动，强制弹走会丢失浏览上下文；
      // 需要登录的操作会在各自页面里提示或由守卫处理。
    }
    return Promise.reject(error)
  }
)

export default client
