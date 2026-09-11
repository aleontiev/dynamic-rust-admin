<template>
  <q-item clickable @click="click">
    <q-item-section side>
      <q-icon
        :color="completion && completion.completed ? null : 'primary'"
        :name="
          completion && completion.completed ? 'mdi-check' : 'mdi-exclamation'
        "
      />
    </q-item-section>
    <q-item-section
      class="white-space-pre overflow-hidden"
      :style="{ opacity: completion && completion.completed ? '0.75' : '1' }"
    >
      <span class="ellipsis full-width text-h6"
        ><span v-if="!hideCategory">{{ guide.category }}: </span
        >{{ guide.title }}</span
      >
      <span v-if="false" class="white-space-pre text-subtitle"
        >{{ guide.description.split("\n")[0] }} ...</span
      >
    </q-item-section>
    <q-item-section side v-if="completion && completion.rating" class="text-h7">
      <div class="column items-center justify-center">
        <q-icon name="mdi-star" />
        <span style="font-size: 0.75rem">{{ completion.rating }}</span>
      </div>
    </q-item-section>
  </q-item>
</template>

<script>
export default {
  props: {
    dense: Boolean,
    dark: Boolean,
    guide: Object,
    completion: Object,
    hideCategory: Boolean
  },
  components: {},
  emits: ["click"],
  setup(_, context) {
    const click = () => context.emit("click");
    return {
      click,
    };
  },
};
</script>
