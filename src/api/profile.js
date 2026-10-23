import client from './client'

// 查看资料：GET /profiles/{username}  -> { profile: {...} }
export function getProfile(username) {
  return client.get(`/profiles/${username}`)
}

// 关注：POST /profiles/{username}/follow  -> { profile: {...} }
export function follow(username) {
  return client.post(`/profiles/${username}/follow`)
}

// 取消关注：DELETE /profiles/{username}/follow  -> { profile: {...} }
export function unfollow(username) {
  return client.delete(`/profiles/${username}/follow`)
}
