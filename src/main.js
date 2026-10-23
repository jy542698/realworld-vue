import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
// 唯一样式入口：tokens → base → components → article
import './styles/index.css'

createApp(App).use(router).mount('#app')
