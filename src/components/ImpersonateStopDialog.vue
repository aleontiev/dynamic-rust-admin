<template>
  <q-dialog
    :persistent="refreshing"
    v-model="isOpen"
    :class="{ 'dense': dense }"
    :full-height="false"
    :fullscreen="false"
    :maximized="false"
    transition-show="fade"
    transition-hide="fade"
  >
    <q-card class="q-dialog-plugin">
      <q-card-section>
        <span class="text-h6">
          <q-icon name="mdi-incognito" class="q-mr-sm"/>
          <span v-if="refreshing">
            Stopping impersonation...
          </span>
          <span v-else>Are you sure you want to stop impersonating "{{application.user?.name}}"?</span>
        </span>
      </q-card-section>
      <q-card-section v-if="refreshing" class="row justify-center">
        <q-spinner color="primary" size="lg"/>
      </q-card-section>
      <q-card-actions align="right" v-if="!refreshing">
        <q-btn @click="onConfirm" color="primary" label="Yes" icon="mdi-check-bold" />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script>
import { computed, ref } from "vue";
import { useStore } from "vuex";
import { setCssVar, useQuasar } from 'quasar';

export default {
  props: ["dense", "dark", "application", "value"],
  components: {},
  emits: ['input'],
  setup(props, context) {
    // global state
    const store = useStore();
    const database = store.$db();
    const Resource = database.model("_resources");
    const $q = useQuasar();

    // local state
    const refreshing = ref(false);

    // methods
    const onConfirm = async () => {
      refreshing.value = true;
      await props.application.stopImpersonate();
      if (props.application?.user?.data?.dark) {
        setCssVar("colorscheme", "dark", document.documentElement);
        $q.dark.set(true);
      } else {
        setCssVar("colorscheme", "light", document.documentElement);
        $q.dark.set(false);
      }
      isOpen.value = false;
      refreshing.value = false;
      $q.notify({
        color: 'primary',
        message: 'Impersonation stopped',
        icon: 'done'
      });
    };
    // computeds
    const isOpen = computed({
      get() {
        return props.value;
      },
      set(next) {
        context.emit("input", next);
      },
    });
    return {
      isOpen,
      refreshing,
      onConfirm
    };
  },
};
</script>
