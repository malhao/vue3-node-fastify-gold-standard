import { createRouter, createWebHistory } from 'vue-router'
import { taskRoutes } from '../modules/tasks/task.routes'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [...taskRoutes],
})

export default router
