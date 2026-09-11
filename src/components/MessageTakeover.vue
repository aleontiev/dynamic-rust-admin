<style>
.q-dialog__inner--maximized > div {
  height: 100dvh;
}
.q-dialog__inner--maximized main {
  position: absolute;
  top: 50px;
  bottom: 0px;
  left: 0px;
  right: 0px;
}
</style>
<template>
  <q-dialog
    v-model="isOpen"
    :class="{ dense: dense, 'large right': true }"
    :maximized="true"
    transition-show="fade"
    transition-hide="fade"
  >
    <div>
      <q-toolbar
        style="z-index: 11; top: 0px"
        :class="{
          sticky: !dense,
          fixed: dense,
          'bg-black text-white': dark,
          'bg-grey-9 text-white': !dark,
        }"
        v-close-popup
      >
        <q-icon name="mdi-bell" size="sm" class="q-pl-xs q-pr-xs"/>
        <q-toolbar-title>
          {{ title }}
        </q-toolbar-title>
        <q-btn flat round dense icon="close" />
      </q-toolbar>

      <main
        :class="{
          'q-pa-lg relative': true,
          'bg-dark': dark,
          'bg-white': !dark,
        }"
      >
        <span class="text-h6" v-html="body" />
        <q-item
          class="absolute bottom full-width q-pb-xl q-pl-md"
          style="left: 0; right: 0"
        >
          <q-item-section
            v-for="(bubble, index) in bubbles"
            :key="index"
            class="items-center"
          >
            <q-avatar
              :color="bubble.color"
              size="4rem"
              @click="bubble.click"
              style="cursor: pointer; color: white"
              clickable
            >
              <q-icon v-if="bubble.icon" :name="bubble.icon" />
              <span v-else v-text="bubble.text" style="font-size: 1.25rem" />
              <q-menu
                v-if="bubble.actions && !statusChanging"
                anchor="top left"
                self="bottom left"
                label-style="font-size: 4rem"
                fit
                style="box-shadow: none; width: 64px"
                autoclose
              >
                <div
                  class="row q-pa-none"
                  v-for="(action, index) in bubble.actions"
                  :key="index"
                >
                  <q-avatar
                    :key="index"
                    size="4rem"
                    :color="action.color"
                    :icon="action.icon"
                    @click="action.click"
                    clickable
                    v-close-popup
                  />
                  <div
                    style="opacity: 0.5"
                    class="text-center full-width q-mb-xs q-mt-xs"
                    v-text="action.label"
                    v-if="action.label"
                  />
                </div>
              </q-menu>
            </q-avatar>
            <label
              style="opacity: 0.5"
              class="q-mt-sm text-center"
              v-text="bubble.label"
            />
          </q-item-section>
        </q-item>
      </main>
    </div>
  </q-dialog>
</template>

<script>
import { watch, computed, onMounted, ref } from "vue";
import { openLink } from "../utilities";

export default {
  props: ["dense", "dark", "item", "open", "Message"],
  components: {},
  emits: ["close", "unread", "read", "archived"],
  setup(props, context) {
    const sts = ref(null);
    onMounted(
      () => (sts.value = props.item ? props.item.status.toLowerCase() : null)
    );
    watch(
      () => props.item?.status,
      (val) => (sts.value = val ? val.toLowerCase() : null)
    );

    const handle = (action) => () => {
      sts.value = action;
      context.emit(action);
    };
    const statusChanging = computed(
      () => sts.value !== props.item.status.toLowerCase()
    );
    const allStatusActions = {
      unread: {
        label: "Unread",
        id: "unread",
        icon: "mark_as_unread",
        color: "yellow-8",
        click: handle("unread"),
      },
      read: {
        label: "Read",
        id: "read",
        icon: "mdi-check-circle",
        color: "primary",
        click: handle("read"),
      },
      archived: {
        label: "Archived",
        id: "archived",
        icon: "mdi-archive",
        color: "grey",
        click: handle("archived"),
      },
    };
    const getTimeColor = (time) => {
      if (time.indexOf("mi") >= 0 || time.indexOf("s") >= 0) {
        return "primary";
      }
      if (time.indexOf("h") >= 0) {
        return "secondary";
      }
      if (time.indexOf("d") >= 0 || time.indexOf('w') >= 0) {
        return "blue-9";
      }
      if (time.indexOf("m") >= 0) {
        return "indigo-9";
      }
      return "blue-grey-9";
    };
    const bubbles = computed(() => {
      // Target, Time, Type, More
      const result = [];
      if (!props.item) {
        return [];
      }
      if (props.item.target) {
        result.push({
          color: props.item.color,
          icon: props.item.icon,
          label: props.item.resource.label,
          click: () => openLink(props.item.resource, props.item.target),
        });
      }
      const statusActions = Object.values(allStatusActions)
        .map((value) =>
          value.id !== props.item.status.toLowerCase() ? value : null
        )
        .filter((x) => !!x);

      const statusColor =
        props.item.status === "Unread"
          ? "yellow-8"
          : props.item.status === "Archived"
          ? "grey"
          : "primary";

      const statusIcon =
        props.item.status === "Unread"
          ? "mark_as_unread"
          : props.item.status === "Archived"
          ? "mdi-archive"
          : "mdi-check-circle";

      result.push(
        ...[
          {
            color: getTimeColor(props.item.time),
            label: "Time",
            text: props.item.time,
          },
          {
            color: statusChanging.value ? "grey-8" : statusColor,
            label: statusChanging.value ? "Saving" : props.item.status,
            icon: statusChanging.value ? "mdi-dots-horizontal" : statusIcon,
            actions: statusActions,
          },
          {
            icon: "mdi-dots-horizontal",
            label: "More",
            color: 'black',
            click: () => {
              // console.log(props.item);
              openLink(props.Message, props.item.message);
            }
          },
        ]
      );
      return result;
    });
    return {
      isOpen: computed({
        get() {
          return props.open;
        },
        set(newValue) {
          if (!newValue) {
            context.emit("close");
          }
        },
      }),
      body: computed(() => {
        const body = props.item.body;
        return body;
      }),
      title: computed(() => {
        let target = props.item.resource?.title;
        if (target) {
          target = ` (${target})`;
        } else {
          target = "";
        }
        return `Message${target}`;
      }),
      bubbles,
      statusChanging,
    };
  },
};
</script>
