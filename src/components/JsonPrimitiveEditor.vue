<template>
  <div class="JsonPrimitiveEditor row items-center no-wrap">
    <!-- Boolean -->
    <q-toggle v-if="node.type === 'boolean'" dense :disable="!editable" :model-value="node.value === true"
      @update:model-value="$emit('commit-value', $event)" />

    <!-- Null -->
    <div v-else-if="node.type === 'null'" class="text-italic text-grey-6">
      null
    </div>

    <!-- Integer -->
    <q-input
      v-else-if="node.type === 'integer'"
      dense
      :borderless="!inputFocused"
      :outlined="inputFocused"
      hide-bottom-space
      class="primitive-input"
      :readonly="!editable"
      type="number"
      :step="1"
      v-model="localValue"
      @focus="inputFocused = editable"
      @blur="inputFocused = false; commit()"
      @keyup.enter="commit"
    />

    <!-- Float -->
    <q-input
      v-else-if="node.type === 'float'"
      dense
      :borderless="!inputFocused"
      :outlined="inputFocused"
      hide-bottom-space
      class="primitive-input"
      :readonly="!editable"
      type="number"
      :step="'any'"
      v-model="localValue"
      @focus="inputFocused = editable"
      @blur="inputFocused = false; commit()"
      @keyup.enter="commit"
    />

    <!-- String (default) -->
    <q-input
      v-else
      dense
      :borderless="!inputFocused"
      :outlined="inputFocused"
      hide-bottom-space
      class="primitive-input"
      :readonly="!editable"
      v-model="localValue"
      @focus="inputFocused = editable"
      @blur="inputFocused = false; commit()"
      @keyup.enter="commit"
    />
  </div>
</template>

<script>
import { computed, ref, watch } from "vue";

export default {
  name: "JsonPrimitiveEditor",
  props: {
    node: { type: Object, required: true },
    editable: { type: Boolean, default: false },
  },
  emits: ["commit-value"],
  setup(props, { emit }) {
    const isNull = computed(() => props.node.type === "null");
    const inputFocused = ref(false);

    const localValue = ref(
      props.node.value === null || typeof props.node.value === "undefined"
        ? ""
        : props.node.value
    );

    watch(
      () => props.node.value,
      (v) => {
        if (props.node.type === "integer" || props.node.type === "float") {
          localValue.value = typeof v === "number" ? v : 0;
          return;
        }
        localValue.value = v === null || typeof v === "undefined" ? "" : v;
      },
      { immediate: true }
    );

    const commit = () => {
      if (!props.editable) return;
      if (isNull.value) return;
      emit("commit-value", localValue.value);
    };

    return { localValue, commit, inputFocused };
  },
};
</script>

<style lang="scss" scoped>
.primitive-input {
  min-width: 0;
  width: 100%;
  max-width: 100%;
}

.JsonPrimitiveEditor {
  min-width: 0;
  width: 100%;
}
</style>
