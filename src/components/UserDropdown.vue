<style lang="scss">
.impersonating {
  border: 3px solid $yellow-8;
}
</style>
<template>
  <q-avatar
    :class="{ 'bg-lava': true, impersonating: impersonating }"
    @click="isOpen = !isOpen"
    role="button"
    aria-label="Account menu"
    style="cursor: pointer"
  >
    <q-img
      style="object-fit: contain; width: 100%; height: 100%"
      v-if="application.user?.photo"
      :src="application.user?.photo"
      fit="contain"
    />
    <span v-else>{{ userInitials }}</span>

    <q-menu
      v-model="isOpen"
      :offset="[10, 10]"
      no-parent-event
      style="overflow-x: hidden"
    >
      <q-list>
        <q-item
          v-for="item in items"
          clickable
          :key="item.id"
          @click="item.click"
        >
          <q-item-section side>
            <q-icon :name="item.icon()" />
          </q-item-section>
          <q-item-section class="text-h6 unbold no-wrap white-space-pre">
            <span v-text="item.label()" />
          </q-item-section>
        </q-item>
      </q-list>
    </q-menu>
  </q-avatar>
  <ImpersonateDialog
    :value="showImpersonateDialog"
    @input="showImpersonateDialog = $event"
    :application="application"
    :dark="dark"
    :dense="dense"
  />
  <ImpersonateStopDialog
    :value="showImpersonateStop"
    @input="showImpersonateStop = $event"
    :application="application"
    :dark="dark"
    :dense="dense"
  />
</template>

<script>
import { computed, ref } from "vue";
import { useQuasar } from "quasar";
import { useRoute, useRouter } from "vue-router";
import ImpersonateDialog from "./ImpersonateDialog";
import ImpersonateStopDialog from "./ImpersonateStopDialog";
import api from "../api";
import { FEATURES } from "../config";

export default {
  components: {
    ImpersonateDialog,
    ImpersonateStopDialog,
  },
  props: {
    application: null,
    dark: Boolean,
    dense: Boolean,
  },
  emits: ["close"],
  setup(props) {
    const $q = useQuasar();
    const isOpen = ref(false);
    const showImpersonateDialog = ref(false);
    const showImpersonateStop = ref(false);

    const router = useRouter();
    const route = useRoute();
    const promptLogout = () => {
      $q.dialog({
        title: "Please Confirm",
        class: props.dense ? "dense" : "",
        message: "Are you sure you want to logout?",
        ok: "Yes",
        cancel: "No",
      }).onOk(async () => {
        await api.logout();
      });
    };

    const openImpersonationDialog = () => {
      showImpersonateDialog.value = true;
    };
    const stopImpersonating = async () => {
      isOpen.value = false;
      showImpersonateStop.value = true;
    };
    const items = computed(() => {
      const application = props.application;
      const user = application?.user || {};
      const result = [
        {
          id: "theme",
          label: () => (props.dark ? "Light" : "Dark"),
          icon: () => (props.dark ? "light_mode" : "dark_mode"),
          click: async () => await application.toggleTheme($q),
        },
        {
          id: "profile",
          label: () => "Profile",
          icon: () => "manage_accounts",
          click: () =>
            window.location.replace(`/users/${user ? user.id : ""}/`),
        },
        {
          id: "help",
          label: () => "Help",
          icon: () => "help",
          click: () => {
            const query = { ...route.query, help: 1 };
            router.replace({ name: route.name, query, path: route.path });
            isOpen.value = false;
          },
        },
        {
          id: "guides",
          label: () => "Guides",
          icon: () => "mdi-book-open-variant",
          click: () => {
            const query = { ...route.query, guide: "*" };
            router.replace({ name: route.name, query, path: route.path });
            isOpen.value = false;
          },
        },
      ];
      if (user.impersonator) {
        result.push({
          id: "unimpersonate",
          label: () => "Stop",
          icon: () => "mdi-incognito",
          click: stopImpersonating,
        });
      } else if (user.can_impersonate) {
        result.push({
          id: "impersonate",
          label: () => "Impersonate",
          icon: () => "mdi-incognito",
          click: () => {
            isOpen.value = false;
            openImpersonationDialog();
          },
        });
      }
      result.push({
        id: "logout",
        label: () => "Logout",
        icon: () => "logout",
        click: promptLogout,
      });
      // Home is a drawer link; on a desktop the theme switch and help sit in
      // the header, so the menu keeps guides, profile and logout.
      const shown = result.filter(
        (item) => props.dense || !["theme", "help"].includes(item.id)
      );
      return FEATURES.coreOnly
        ? shown.filter((item) => ["theme", "profile", "logout"].includes(item.id))
        : shown;
    });
    const userInitials = computed(() => {
      return props.application?.user?.name.substr(0, 1);
    });
    const impersonating = computed(() => {
      return !!props.application?.user?.impersonator;
    });
    return {
      isOpen,
      userInitials,
      items,
      impersonating,
      showImpersonateDialog,
      showImpersonateStop,
    };
  },
};
</script>
