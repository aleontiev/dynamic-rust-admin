<template>
  <q-menu
    v-model="isOpen"
    :offset="[45, -40]"
    no-parent-event
    style="overflow-x: hidden"
    :class="{ 'dvw-100': dense, 'text-black': !dark, 'text-white': dark }"
  >
    <q-list>
      <q-item
        clickable
        :class="{
          'bg-black': dark,
          'bg-white': !dark,
          'q-pr-none': dense,
          'q-pt-none q-pb-none sticky': true,
        }"
        style="top: 0px; z-index: 5"
        @click="isOpen = false"
      >
        <q-item-section side>
          <q-icon :name="getIcon(view)" :color="dark ? 'white' : 'black'" />
        </q-item-section>
        <q-item-section class="text-h6 unbold no-wrap white-space-pre">
          <span v-if="view" class="ellipsis">
            {{ view.name }}
          </span>
          <span v-else>
            {{ resource.title }}
          </span>
        </q-item-section>
        <q-item-section side>
          <div class="row">
            <q-btn
              flat
              round
              icon="keyboard_arrow_up"
              :color="dark ? 'white' : 'black'"
            />
          </div>
        </q-item-section>
      </q-item>
      <q-item
        v-for="item in items"
        clickable
        :key="item.name"
        @click="click(item)"
        :class="{ 'q-pr-none': dense }"
      >
        <q-item-section side>
          <q-icon :name="getIcon(item)" />
        </q-item-section>
        <q-item-section class="text-h6 unbold no-wrap white-space-pre">
          {{ item.name }}
        </q-item-section>
      </q-item>
    </q-list>
  </q-menu>
</template>

<script>
import { computed, ref } from "vue";

export default {
  components: {},
  props: {
    value: Boolean,
    view: Object,
    views: Object,
    resource: Object,
    dark: Boolean,
    dense: Boolean,
  },
  emits: ["select", "input", "close"],
  setup(props, context) {
    const viewKey = computed(() => (props.view ? props.view.id : null));
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
      const views = Object.entries(props.views).sort((a, b) => {
        if (a[1].is_shared && !b[1].is_shared) {
          return -1;
        } else if (!a[1].is_shared && b[1].is_shared) {
          return 1;
        }
        return a[1].name.localeCompare(b[1].name);
      });
      const defaultView = {
        id: null,
        data: { filters: null, fields: null, chart: null },
        name: props.resource.title,
      };
      const result = [];
      if (viewKey.value) {
        // push an entry for the core if there is a real view selected
        // otherwise, the core view is the selected one
        result.push(defaultView);
      }
      views.forEach(([key, value]) => {
        if (viewKey.value !== key) {
          result.push(value);
        }
      });
      return result;
    });
    const click = (item) => {
      const views = Object.entries(props.views).filter(
        ([key, value]) => value.id === item.id
      );
      const key = views.length ? views[0][0] : item.id;
      context.emit("select", key);
    };
    const selectedView = ref(null);
    const openViewDialog = (key) => {
      selectedView.value = props.views[key];
      if (selectedView.value) {
        viewDialogOpen.value = true;
      }
    };

    const viewDialogOpen = ref(false);

    const getIcon = (item) => {
      if (!item || !item.id) {
        return `mdi-${props.resource.icon}`;
      }
      if (item.data && item.data.chart) {
        const chart = item.data.chart;
        if (chart.display && chart.display !== "table") {
          if (chart.type === "value") {
            if (chart.by || chart.by_ex || chart.over || chart.over_ex) {
              return "mdi-table";
            }
            return "mdi-numeric";
          } else if (chart.type === "donut") {
            return "mdi-chart-donut";
          } else if (chart.type === "bar" || chart.type === "line") {
            return "mdi-poll";
          }
        } else {
          return "mdi-table-large";
        }
      }
      return "mdi-table-large";
    };
    return {
      isOpen,
      items,
      click,
      openViewDialog,
      viewDialogOpen,
      selectedView,
      getIcon,
    };
  },
};
</script>
