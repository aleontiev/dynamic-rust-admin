import {
  createRouter,
  createMemoryHistory,
  createWebHistory,
  createWebHashHistory,
} from "vue-router";
import defaultRoutes from "./routes";
import store from "../store";

/*
 * If not building with SSR mode, you can
 * directly export the Router instantiation;
 *
 * The function below can be async too; either use
 * async/await or return a Promise which resolves
 * with the Router instance.
 */

export function createAdminRouter(routes = defaultRoutes) {
  const createHistory = process.env.SERVER
    ? createMemoryHistory
    : process.env.VUE_ROUTER_MODE === "history"
    ? createWebHistory
    : createWebHashHistory;

  const Router = createRouter({
    // scrollBehavior: () => ({ left: 0, top: 0 }),
    routes,

    // Leave this as is and make changes in quasar.conf.js instead!
    // quasar.conf.js -> build -> vueRouterMode
    // quasar.conf.js -> build -> publicPath
    history: createHistory(
      process.env.MODE === "ssr" ? void 0 : process.env.VUE_ROUTER_BASE
    ),
  });

  const db = store.$db();
  for (const entity of db.entities) {
    const model = db.model(entity.name);
    if (model.setupInstance) {
      model.setupInstance();
    }
  }

  Router.beforeEach(async (to, from, next) => {
    if (to.path === "/" && to.hash && to.hash.substr(0, 2) === "#/") {
      return next(to.hash.substr(1, to.hash.length - 1));
    }
    if (to.path.substr(0, 3) === "/#/") {
      return next({
        path: to.path.substr(2, to.path.length - 1),
        query: to.query,
      });
    }
    return next();
  });
  return Router;
}
