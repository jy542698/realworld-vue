import client from './client'

/**
 * 上传图片：POST /images（multipart/form-data，字段名固定为 `file`）
 *
 * @returns {Promise} 响应体 { image: { url, contentType, size } }
 *   url 形如 `/api/images/42bf5ffd....png`，可直接作为 <img src> 使用
 *
 * 两个容易踩的点：
 * 1. **不要手动设置 Content-Type**。multipart 必须由浏览器自己生成
 *    `multipart/form-data; boundary=----WebKitFormBoundary...`，手写会丢 boundary，
 *    后端解析不出文件，报 400「上传请求格式不正确」。
 * 2. 传的是 FormData 而不是普通对象。axios 检测到 FormData 会自动切 multipart。
 */
export function uploadImage(file) {
  const form = new FormData()
  form.append('file', file)
  return client.post('/images', form)
}
