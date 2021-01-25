import Vue from 'vue'
import VueRouter from 'vue-router'

import home from '@/components/home'
import about from '@/components/about'
import gallery from '@/components/gallery'
import blog from '@/components/blog'

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
]

const router = new VueRouter({
  routes
})

export default router
