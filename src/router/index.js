import Vue from 'vue'
import VueRouter from 'vue-router'
import store from '@/stores/main'

import home from '@/components/home'
import about from '@/components/about'
import gallery from '@/components/gallery'
import blog from '@/components/blog'
import contact from '@/components/contact'

Vue.use(VueRouter)

const routes = [
  {
    path: '/',
    name: 'home',
    component: home
  },
  {
    path: '/about',
    name: 'about',
    component: about,
  },
  {
    path: '/gallery',
    name: 'gallery',
    component: gallery,
  },
  {
    path: '/blog',
    name: 'blog',
    component: blog,
  },
  {
    path: '/contact',
    name: 'contact',
    component: contact,
  },
  {
    path: '/login',
    name: 'login',
    component: () => import('@/components/login.vue')
  },
  {
    path: '/admin',
    name: 'admin',
    component: () => import('@/components/admin/AdminDashboard.vue'),
    meta: { requiresAuth: true }
  }
]

const router = new VueRouter({
  routes
})

router.beforeEach(async (to, from, next) => {
  if (to.name === 'login' && store.getters['auth/isAuthenticated']) {
    return next({ name: 'admin' })
  }
  if (!to.meta.requiresAuth) {
    return next()
  }
  if (!store.state.auth.initialized) {
    await store.dispatch('auth/initAuth')
  }
  store.getters['auth/isAuthenticated']
    ? next()
    : next({ name: 'login', query: { redirect: to.fullPath } })
})

export default router
