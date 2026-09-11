<template>
  <q-menu
    v-model="isOpen"
    :offset="[45, -40]"
    no-parent-event
    style="overflow-x: hidden"
    :class='{"dvw-100": dense}'
  >
    <q-list>
      <q-item
        clickable
        :class="{
          'bg-black text-white': dark,
          'text-black bg-white': !dark,
          'q-pt-none q-pb-none sticky': true,
        }"
        style="top: 0px; z-index: 5"
        @click="isOpen = false"
      >
        <q-item-section side>
          <q-icon
            :name="getIcon(dashboard)"
            :color="dark ? 'white' : 'black'"
            size="sm"
          />
        </q-item-section>
        <q-item-section class="text-h6 unbold no-wrap white-space-pre">
          <span v-if="dashboard">
            {{ dashboard.name }}
          </span>
          <span v-else>Home</span>
        </q-item-section>
        <q-item-section side>
          <div class="row">
            <q-icon v-if="!dashboard" class="q-mr-sm" size="sm" />
            <q-btn
              @click.stop.prevent="openNewDashboardDialog"
              flat
              round
              icon="add"
              :color="dark ? 'white': 'black'"
            />
          </div>
        </q-item-section>
      </q-item>
      <q-item
        v-for="item in items"
        clickable
        :key="item.name"
        @click="click(item)"
      >
        <q-item-section side>
          <q-icon :name="getIcon(item)" />
        </q-item-section>
        <q-item-section class="text-h6 unbold no-wrap white-space-pre">
          {{ item.name }}
        </q-item-section>
        <q-item-section side>
          <div class="row">
            <q-icon class="q-mr-sm" size="sm" />
          </div>
        </q-item-section>
      </q-item>
    </q-list>
  </q-menu>
</template>

<script>
import { computed, ref } from "vue";
import { useQuasar } from "quasar";
import { toTitleCase, toAPICase } from "../utilities";

export default {
  components: {},
  props: {
    value: Boolean,
    dashboard: Object,
    dashboards: Object,
    dark: Boolean,
    dense: Boolean,
  },
  emits: ["remove", "select", "input", "add", "close"],
  setup(props, context) {
    const $q = useQuasar();
    const dashboardKey = computed(() =>
      props.dashboard ? props.dashboard.id : null
    );
    const isOpen = computed({
      get() {
        return props.value;
      },
      set(newValue) {
        context.emit("input", newValue);
        if (!newValue) {
          context.emit("close");
        }
      },
    });
    const items = computed(() => {
      const dashboards = Object.entries(props.dashboards).sort((a, b) => {
        if (a[1].is_shared && !b[1].is_shared) {
          return -1;
        } else if (b[1].is_shared && !a[1].is_shared) {
          return 1;
        }
        return a[1].name.localeCompare(b[1].name);
      });
      const result = [];
      if (dashboardKey.value) {
        // push an entry for the core if there is a real dashboard selected
        // otherwise, the core dashboard is the selected one
        result.push({ id: null, name: "Home" });
      }
      dashboards.forEach(([key, value]) => {
        if (dashboardKey.value !== key) {
          result.push(value);
        }
      });
      return result;
    });
    const click = (item) => {
      if (item.id === null) {
        context.emit("select", null);
      } else {
        const dashboards = Object.entries(props.dashboards).filter(
          ([key, value]) => value.id === item.id
        );
        const key = dashboards.length ? dashboards[0][0] : item.id;
        context.emit("select", key);
      }
    };
    const change = (payload) => {
      context.emit("change", payload);
    };
    const remove = (payload) => {
      const last = Object.keys(props.dashboards).length === 1;
      context.emit("remove", payload);
      if (last) {
        isOpen.value = false;
      }
    };
    const selectedDashboard = ref(null);
    const openDashboardDialog = (key) => {
      selectedDashboard.value = props.dashboards[key];
      if (selectedDashboard.value) {
        dashboardDialogOpen.value = true;
      }
    };

    const dashboardDialogOpen = ref(false);

    const openNewDashboardDialog = () => {
      let classes = "";
      if (props.dense) {
        classes = `${classes} dense`;
      }
      $q.dialog({
        title: "+ New Dashboard",
        color: "primary",
        class: classes,
        message: "What do you want to call this dashboard?",
        prompt: {
          model: "",
          type: "text",
          isValid: (x) => !!x,
        },
      }).onOk(async (name) => {
        context.emit("add", name);
      });
    };
    const getIcon = (item) => {
      if (item && item.id) {
        if (item.is_scheduled) {
          return item.is_shared
            ? "mdi-file-clock"
            : "mdi-file-clock-outline";
        }
        return item.is_shared
          ? "mdi-view-dashboard"
          : "mdi-view-dashboard-outline";
      }
      return "home";
    };
    return {
      isOpen,
      getIcon,
      items,
      click,
      change,
      remove,
      openDashboardDialog,
      dashboardDialogOpen,
      selectedDashboard,
      openNewDashboardDialog,
    };
  },
};
</script>
