/**
 * Markdown 渲染管线（markdown-it + highlight.js core）
 *
 * 三条硬约束，改动前先读：
 * 1) html:false —— 这是 XSS 的唯一开关。文章正文来自任何登录用户，
 *    允许原始 HTML 就等于允许 <script>，**一个字符都不许改成 true**。
 * 2) 只 import highlight.js/lib/core + 8 种语言。import 'highlight.js' 会把
 *    190 种语言（~900KB）打进包，首屏直接崩。
 * 3) 不 import 任何 highlight.js 主题 css，配色全部由 styles/article.css 里的
 *    .hljs-* 规则给出（对齐设计令牌）。
 *
 * 体积策略：本文件只应被「文章详情 / 编辑器预览」这条懒加载链路引用，
 * 首页 chunk 里不该出现 markdown-it。
 */
import MarkdownIt from 'markdown-it'
import hljs from 'highlight.js/lib/core'
import javascript from 'highlight.js/lib/languages/javascript'
import typescript from 'highlight.js/lib/languages/typescript'
import java from 'highlight.js/lib/languages/java'
import xml from 'highlight.js/lib/languages/xml'
import css from 'highlight.js/lib/languages/css'
import json from 'highlight.js/lib/languages/json'
import bash from 'highlight.js/lib/languages/bash'
import sql from 'highlight.js/lib/languages/sql'

// 8 种语言覆盖技术写作 95% 场景；xml 同时承担 HTML / Vue 模板高亮
hljs.registerLanguage('javascript', javascript)
hljs.registerLanguage('typescript', typescript)
hljs.registerLanguage('java', java)
hljs.registerLanguage('xml', xml)
hljs.registerLanguage('css', css)
hljs.registerLanguage('json', json)
hljs.registerLanguage('bash', bash)
hljs.registerLanguage('sql', sql)

/** 复制按钮图标（内联 SVG）：v-html 内部挂不了 Vue 组件，只能内联一份 */
const COPY_ICON =
  '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" ' +
  'stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
  '<rect x="9" y="9" width="13" height="13" rx="2"/>' +
  '<path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>'

/**
 * 生成 URL 友好锚点：小写、非字母数字转 -、中文原样保留、首尾不留 -
 * 用 \p{L}\p{N} 而不是 [a-z0-9]，否则中文标题会被清成空串（旧 slug bug 的翻版）
 */
function slugify(text) {
  return String(text)
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '')
}

/** 同一篇文章内标题 id 必须唯一，重复的追加 -1/-2 */
function uniqueId(base, used) {
  const seed = base || 'section'
  if (!used.has(seed)) {
    used.set(seed, 1)
    return seed
  }
  let n = used.get(seed)
  let candidate = ''
  do {
    candidate = `${seed}-${n}`
    n += 1
  } while (used.has(candidate))
  used.set(seed, n)
  used.set(candidate, 1)
  return candidate
}

function highlight(code, lang) {
  const escaped = () => `<pre class="hljs"><code>${md.utils.escapeHtml(code)}</code></pre>`
  if (!lang || !hljs.getLanguage(lang)) {
    return escaped()
  }
  try {
    const html = hljs.highlight(code, { language: lang, ignoreIllegals: true }).value
    return `<pre class="hljs"><code class="language-${lang}">${html}</code></pre>`
  } catch (e) {
    // 高亮失败不能影响阅读：退回纯转义文本（非用户操作，不弹 Toast）
    return escaped()
  }
}

const md = new MarkdownIt({
  html: false, // ★ 安全开关，勿动
  linkify: true,
  breaks: true,
  highlight
})

/**
 * 代码块：包一层容器 + 右上角复制按钮。
 *
 * 为什么在渲染层加按钮而不是渲染后操作 DOM：v-html 会在内容变化时整体替换节点，
 * 手工插入的按钮会被冲掉；让 markdown-it 直接产出按钮，重渲染天然一致。
 * 点击用事件委托挂在容器上（一个 listener 服务所有代码块）。
 */
const defaultFenceRule = md.renderer.rules.fence
md.renderer.rules.fence = (tokens, idx, options, env, self) => {
  const inner = defaultFenceRule(tokens, idx, options, env, self)
  const info = (tokens[idx].info || '').trim()
  const lang = info.split(/\s+/)[0] || ''
  return (
    '<div class="code-block">' +
    `<button type="button" class="code-copy" aria-label="复制代码" data-lang="${md.utils.escapeHtml(lang)}">` +
    COPY_ICON +
    '</button>' +
    inner +
    '</div>'
  )
}

/**
 * 外链：非站内链接一律新窗口打开，并断掉 window.opener（防反向导航钓鱼）
 * 站内链接保持当前窗口，否则站内导航会全变成新标签页
 */
const defaultLinkOpenRule =
  md.renderer.rules.link_open ||
  ((tokens, idx, options, env, self) => self.renderToken(tokens, idx, options))

md.renderer.rules.link_open = (tokens, idx, options, env, self) => {
  const token = tokens[idx]
  const href = token.attrGet('href') || ''
  if (/^https?:\/\//i.test(href)) {
    let sameOrigin = false
    try {
      sameOrigin = typeof window !== 'undefined' && new URL(href).origin === window.location.origin
    } catch (e) {
      // href 非法（例如带空格的伪 URL）按外链处理，是更安全的一侧
      sameOrigin = false
    }
    if (!sameOrigin) {
      token.attrSet('target', '_blank')
      token.attrSet('rel', 'noopener noreferrer')
    }
  }
  return defaultLinkOpenRule(tokens, idx, options, env, self)
}

/** 标题锚点：h2/h3 生成 id，供 TOC 与「复制小节链接」使用 */
// heading_open 在 markdown-it 里没有默认规则（走 Renderer.renderToken 兜底），
// 所以这里必须自己给出 fallback，否则拿到 undefined 会直接崩在渲染阶段
const defaultHeadingOpenRule =
  md.renderer.rules.heading_open ||
  ((tokens, idx, options, env, self) => self.renderToken(tokens, idx, options))
md.renderer.rules.heading_open = (tokens, idx, options, env, self) => {
  const token = tokens[idx]
  const level = Number(token.tag.slice(1))
  if (level === 2 || level === 3) {
    if (!(env.slugs instanceof Map)) env.slugs = new Map()
    const inline = tokens[idx + 1]
    const text = inline && inline.type === 'inline' ? inline.content : ''
    token.attrSet('id', uniqueId(slugify(text), env.slugs))
  }
  return defaultHeadingOpenRule(tokens, idx, options, env, self)
}

/**
 * 从 token 流提取目录项
 * @param {Array} tokens markdown-it token 数组
 * @returns {{ id: string, text: string, level: number }[]}
 */
export function extractToc(tokens) {
  const toc = []
  if (!Array.isArray(tokens)) return toc
  for (let i = 0; i < tokens.length; i += 1) {
    const token = tokens[i]
    if (token.type !== 'heading_open') continue
    const inline = tokens[i + 1]
    const text = inline && inline.type === 'inline' ? inline.content.trim() : ''
    if (!text) continue
    toc.push({
      id: token.attrGet('id') || '',
      text,
      level: Number(token.tag.slice(1))
    })
  }
  return toc
}

/**
 * 渲染 Markdown 为 HTML（单次渲染，不需要目录时用这个）
 * @param {string} src
 * @returns {string} 已转义、可信的 HTML
 */
export function renderMarkdown(src) {
  return md.render(src || '', { slugs: new Map() })
}

/**
 * 一次解析同时拿到 HTML 与目录，避免为了 TOC 再 parse 一遍
 * @param {string} src
 * @returns {{ html: string, toc: { id: string, text: string, level: number }[] }}
 */
export function parseMarkdown(src) {
  const env = { slugs: new Map() }
  const tokens = md.parse(src || '', env)
  return { html: md.renderer.render(tokens, md.options, env), toc: extractToc(tokens) }
}

export default md
