import client from './client'

// 注册：POST /users  body: { user: { username, email, password } }
export function register(user) {
  return client.post('/users', { user })
}

// 登录：POST /users/login  body: { user: { email, password } }
export function login(user) {
  return client.post('/users/login', { user })
}

// 获取当前登录用户：GET /user（需要 Token）
export function getCurrentUser() {
  return client.get('/user')
}

// 更新当前登录用户资料：PUT /user  body: { user: { bio, image, ... } }
export function updateUser(user) {
  return client.put('/user', { user })
}
