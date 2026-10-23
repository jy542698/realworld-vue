import { createRouter, createWebHistory } from 'vue-router'

/**
 * 路由表
 *
 * 全部视图改懒加载（`() => import()`）：
 * - 首页不再背着编辑器、详情页、markdown-it 一起下载；
 * - MarkdownBody 内部的动态 import 会因此形成独立的 markdown chunk，
 *   首屏 JS 里不会出现 markdown-it（架构 §9 R7 的验收口径）。
 */
const routes = [
  { path: '/', name: 'home', component: () => import('../views/Home.vue'), meta: { title: '首页' } },
  { path: '/login', name: 'login', component: () => import('../views/Login.vue'), meta: { title: '登录' } },
  {
    path: '/register',
    name: 'register',
    component: () => import('../views/Register.vue'),
    meta: { title: '注册' }
  },
  {
    path: '/editor',
    name: 'editor',
    component: () => import('../views/Editor.vue'),
    meta: { requiresAuth: true, title: '写文章' }
  },
  {
    path: '/editor/:slug',
    name: 'editor-edit',
    component: () => import('../views/Editor.vue'),
    meta: { requiresAuth: true, title: '编辑文章' }
  },
  {
    path: '/article/:slug',
    name: 'article',
    component: () => import('../views/ArticleDetail.vue'),
    meta: { title: '文章' }
  },
  {
    path: '/profile/:username',
    name: 'profile',
    component: () => import('../views/Profile.vue'),
    meta: { title: '个人主页' }
  },
  {
    path: '/settings',
    name: 'settings',
    component: () => import('../views/Settings.vue'),
    meta: { requiresAuth: true, title: '设置' }
  },
  // catch-all 必须放最后，否则会抢占上面所有路由
  {
    path: '/:pathMatch(.*)*',
    name: 'not-found',
    component: () => import('../views/NotFound.vue'),
    meta: { title: '页面不存在' }
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes,
  /**
   * 滚动行为：
   * - 浏览器前进/后退 → 恢复原位置（savedPosition）
   * - 带 hash（详情页目录点击）→ 滚到锚点，并留出 sticky 导航高度
   * - 其余 → 回顶部
   */
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) return savedPosition
    if (to.hash && to.hash.length > 1) {
      return { el: to.hash, top: 80, behavior: 'smooth' }
    }
    return { top: 0 }
  }
})

// 守卫：需要登录但没 token → 去登录页，并把原地址塞进 ?redirect 以便回跳
// 直接读 localStorage 而不是 import store：守卫在模块初始化期就要可用，
// 避免 router ↔ store ↔ api/client 之间的循环依赖
router.beforeEach((to) => {
  if (to.meta.requiresAuth && !localStorage.getItem('realworld_token')) {
    return { name: 'login', query: { redirect: to.fullPath } }
  }
  return true
})

// 标题随路由变化；文章详情/个人主页会在组件内用更具体的标题覆盖
router.afterEach((to) => {
  const base = 'Conduit'
  document.title = to.meta.title ? `${to.meta.title} · ${base}` : base
})

export default router
