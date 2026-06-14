import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      component: () => import('@/components/layout/AppLayout.vue'),
      children: [
        {
          path: '',
          name: 'dashboard',
          component: () => import('@/views/DashboardView.vue'),
          meta: { title: 'Dashboard' },
        },
        {
          path: 'orders',
          name: 'orders',
          component: () => import('@/views/OrderListView.vue'),
          meta: { title: 'Đơn hàng' },
        },
        {
          path: 'shippers',
          name: 'shippers',
          component: () => import('@/views/ShipperListView.vue'),
          meta: { title: 'Shipper' },
        },
        {
          path: 'revenue',
          name: 'revenue',
          component: () => import('@/views/RevenueView.vue'),
          meta: { title: 'Doanh thu' },
        },
      ],
    },
  ],
})

router.beforeEach((to, _from, next) => {
  const title = (to.meta?.title as string) || 'Zalo Delivery CMS'
  document.title = `${title} | Zalo Delivery CMS`
  next()
})

export default router
