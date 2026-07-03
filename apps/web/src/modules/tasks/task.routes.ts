import type { RouteRecordRaw } from 'vue-router'

export const taskRoutes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'tasks',
    component: () => import('./views/TasksView.vue'),
  },
]
