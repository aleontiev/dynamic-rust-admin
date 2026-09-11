import { createStore } from "vuex";

import orm from "@vuex-orm/core";
import persistence from "vuex-persistedstate";

import models from "../models";

const database = new orm.Database();
for (const model of Object.values(models)) {
  database.register(model);
}

export default createStore({
  modules: {},
  plugins: [orm.install(database), persistence({ overwrite: true })],
  // enable strict mode (adds overhead!)
  // for dev mode and --debug builds only
  strict: process.env.DEBUGGING,
});
