import { reactive } from 'vue'

const STORAGE_KEY = 'realworld_token'

// 简单的全局登录态：token 存 localStorage，刷新页面后还能保持登录
const state = reactive({
  user: null,
  token: localStorage.getItem(STORAGE_KEY) || null
})

// 刷新页面后补全用户信息只做一次（App 挂载 + 任何路由都可能触发，必须防重入）
let hydratePromise = null

/**
 * 写入登录态
 *
 * 注意：后端返回的 user 永远不含 password（只在注册/登录入参里有），
 * 这里显式剥掉 password 字段，避免有人把入参对象直接传进来时
 * 密码被写进 reactive state、进而出现在 devtools / 错误上报里。
 *
 * @param {object} user 后端返回的 user 对象
 * @param {string} token
 */
function setAuth(user, token) {
  const { password, ...safeUser } = user || {}
  state.user = Object.keys(safeUser).length ? safeUser : null
  state.token = token || null
  if (token) {
    localStorage.setItem(STORAGE_KEY, token)
  } else {
    localStorage.removeItem(STORAGE_KEY)
  }
}

function clearAuth() {
  state.user = null
  state.token = null
  localStorage.removeItem(STORAGE_KEY)
}

function isAuthenticated() {
  return !!state.token
}

/**
 * 是否是当前登录用户的资源（文章作者 / 主页主人）
 * @param {string} username
 * @returns {boolean}
 */
function isOwner(username) {
  if (!username) return false
  return !!state.user && state.user.username === username
}

/**
 * 启动时补全用户信息：有 token 但 user 为空（典型场景是刷新页面）。
 *
 * 用动态 import 拿 api/user 而不是顶部静态 import：
 * store/auth ← client.js 是静态依赖，若这里再静态 import api/user
 * （api/user → client → store/auth）就形成三元循环，模块初始化顺序会变得脆弱。
 * 动态 import 只在真正需要补全时加载，也顺带让首屏少一个模块。
 *
 * 失败（token 过期/被吊销）时**清空登录态并吞掉异常**：
 * 这是启动路径，抛出会让整个应用白屏。
 *
 * @returns {Promise<void>}
 */
async function hydrate() {
  if (!state.token || state.user) return
  if (hydratePromise) return hydratePromise

  hydratePromise = (async () => {
    try {
      const { getCurrentUser } = await import('../api/user')
      const { data } = await getCurrentUser()
      if (data?.user) {
        // token 已在 state 里，这里只更新 user，不重新写 localStorage
        state.user = data.user
      } else {
        clearAuth()
      }
    } catch (e) {
      clearAuth()
    } finally {
      hydratePromise = null
    }
  })()

  return hydratePromise
}

export const auth = {
  state,
  setAuth,
  clearAuth,
  isAuthenticated,
  isOwner,
  hydrate
}
