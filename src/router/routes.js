const routes = [
  {
    path: "/",
    name: 'layout',
    component: () => import("../layouts/MainLayout.vue"),
    children: [{
      path: "", name: 'home', component: () => import("../pages/HomePage.vue")
    }, {
      path: "/:resource/",
      name: 'resource',
      component: () => import("../pages/ResourcePage.vue")
    }, {
      path: "/:resource/:id/",
      name: 'record',
      component: () => import("../pages/RecordPage.vue")
    }],
  },
  // Always leave this as last one,
  // but you can also remove it
  {
    path: "/:catchAll(.*)*",
    name: '404',
    component: () => import("../pages/ErrorNotFound.vue"),
  },
];

export default routes;
