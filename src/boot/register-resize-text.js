import { boot } from 'quasar/wrappers'
import VueResizeText from 'vue3-resize-text';
import { createHead } from '@vueuse/head';
// "async" is optional;
// more info on params: https://v2.quasar.dev/quasar-cli/boot-files
export default boot(async ({app} /* { app, router, ... } */) => {
  // something to do
  app.directive('ResizeText', VueResizeText.ResizeText);
  app.use(createHead());
})
