<template>
  <div class="JsonModeSwitcher column no-wrap">
    <q-btn-toggle v-model="localMode" no-caps dense rounded unelevated size="md" toggle-color="primary"
      class="text-grey-8 q-mb-sm q-px-xs" :options="[
        { label: 'Visual', value: 'visual' },
        { label: 'Raw JSON', value: 'raw' }
      ]" />

    <q-tab-panels v-model="localMode" animated class="bg-transparent">
      <q-tab-panel name="visual">
        <slot name="visual" />
      </q-tab-panel>
      <q-tab-panel name="raw">
        <slot name="raw" />
      </q-tab-panel>
    </q-tab-panels>
  </div>
</template>

<script>
import { computed } from "vue";

export default {
  name: "JsonModeSwitcher",
  props: {
    modelValue: { type: String, default: "visual" },
    editable: { type: Boolean, default: false },
  },
  emits: ["update:modelValue"],
  setup(props, { emit }) {
    const localMode = computed({
      get() {
        return props.modelValue;
      },
      set(v) {
        emit("update:modelValue", v);
      },
    });

    return { localMode };
  },
};
</script>
