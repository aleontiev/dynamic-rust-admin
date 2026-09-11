<style lang="scss">
.IconButton {
  display: flex;
  align-items: center;
  padding: 0.25rem;
  .q-badge--floating {
    top: 1px;
    right: -6px;
  }
  &.left {
    margin-right: auto;
  }
  &.dense {
    flex-direction: column;
    .IconButton--button {
      .q-btn__content {
        flex-direction: column;
      }
      .q-btn__content .block {
        font-size: 0.7rem;
        line-height: 0.75rem;
      }
      .q-icon {
        margin-right: 0px;
      }
    }
  }
  .q-btn__content .block {
    text-transform: none;
  }
  .txt-primary {
    .q-btn__content > span {
      color: var(--q-primary);
    }
  }
  .ico-primary {
    .q-btn__content > i {
      color: var(--q-primary);
    }
  }
}
</style>
<template>
  <div :class="{ IconButton: true, dense: dense, left: left }">
    <q-btn
      :color="color"
      :flat="flat || !color"
      :rounded="!dense"
      :round="dense"
      :disable="disable"
      :disabled="disable"
      :size="size"
      :class="['IconButton--button', 'txt-' + textColor, 'ico-' + iconColor]"
      :icon="icon"
      :label="label"
      @click="click"
    >
      <q-badge
        v-if="badge"
        :color="badgeColor ? badgeColor : 'transparent'"
        :textColor="dark ? 'white' : 'black'"
        floating
        rounded
        >{{ badge }}</q-badge
      >
      <slot />
    </q-btn>
  </div>
</template>

<script>
import { computed } from "vue";

export default {
  emits: ["click"],
  props: {
    color: String,
    textColor: String,
    iconColor: String,
    flat: Boolean,
    dense: Boolean,
    dark: Boolean,
    icon: String,
    label: String,
    left: Boolean,
    center: Boolean,
    disable: Boolean,
    badge: String,
    badgeColor: String,
  },
  setup(props, context) {
    return {
      size: computed(() => (props.dense ? "md" : "lg")),
      click: (e) => {
        context.emit("click", e);
      },
    };
  },
};
</script>
