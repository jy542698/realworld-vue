import client from './client'

/** 只保留有值的查询键：空串/undefined/null 不发给后端 */
function cleanParams(source) {
  const params = {}
  for (const key of ['tag', 'author', 'favorited', 'q', 'sort', 'limit', 'offset']) {
    const value = source[key]
    if (value === undefined || value === null || value === '') continue
    params[key] = value
  }
  return params
}

/**
 * 文章列表：GET /articles -> { articles: [...], articlesCount: 过滤后总数 }
 *
 * @param {object} params { tag, author, favorited, q, sort, limit, offset }
 */
export function listArticles(params = {}) {
  return client.get('/articles', { params: cleanParams(params) })
}

/**
 * 关注流：GET /articles/feed -> { articles, articlesCount }
 * 必须登录，未登录后端返回 401。
 *
 * @param {object} params { limit, offset }
 */
export function getFeed({ limit, offset } = {}) {
  return client.get('/articles/feed', { params: cleanParams({ limit, offset }) })
}

// 单篇文章：GET /articles/{slug}  -> { article: {...} }（后端会顺手把 viewCount +1）
export function getArticle(slug) {
  return client.get(`/articles/${slug}`)
}

// 发布文章：POST /articles  body: { article: {...} }
export function createArticle(article) {
  return client.post('/articles', { article })
}

// 更新文章：PUT /articles/{slug}  body: { article: {...} }
export function updateArticle(slug, article) {
  return client.put(`/articles/${slug}`, { article })
}

// 删除文章：DELETE /articles/{slug}
export function deleteArticle(slug) {
  return client.delete(`/articles/${slug}`)
}

// 收藏：POST /articles/{slug}/favorite  -> { article: {...} }
export function favoriteArticle(slug) {
  return client.post(`/articles/${slug}/favorite`)
}

// 取消收藏：DELETE /articles/{slug}/favorite  -> { article: {...} }
export function unfavoriteArticle(slug) {
  return client.delete(`/articles/${slug}/favorite`)
}

/**
 * 评论列表：GET /articles/{slug}/comments?limit=&offset=
 * -> { comments: [...], commentsCount: 总数 }
 *
 * @param {string} slug
 * @param {object} paging { limit, offset }
 */
export function listComments(slug, { limit, offset } = {}) {
  return client.get(`/articles/${slug}/comments`, { params: cleanParams({ limit, offset }) })
}

// 发表评论：POST /articles/{slug}/comments  body: { comment: { body } }
export function addComment(slug, body) {
  return client.post(`/articles/${slug}/comments`, { comment: { body } })
}

// 删除评论：DELETE /articles/{slug}/comments/{id}
export function deleteComment(slug, id) {
  return client.delete(`/articles/${slug}/comments/${id}`)
}

// 点赞评论：POST /articles/{slug}/comments/{id}/like  -> { comment: {...} }
export function likeComment(slug, id) {
  return client.post(`/articles/${slug}/comments/${id}/like`)
}

// 取消点赞：DELETE /articles/{slug}/comments/{id}/like  -> { comment: {...} }
export function unlikeComment(slug, id) {
  return client.delete(`/articles/${slug}/comments/${id}/like`)
}
