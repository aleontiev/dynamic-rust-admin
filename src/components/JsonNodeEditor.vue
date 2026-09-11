<template>
  <div class="JsonNodeEditor" :class="{
    'JsonNodeEditor--branch': isBranch,
    'JsonNodeEditor--dark': dark,
  }" :style="{ paddingLeft: depth > 0 ? `${depth * 14}px` : '0' }">
    <div v-if="editable || showKey || showIndex || isPrimitive" class="row items-center json-row q-gutter-xs">
      <!-- Array index label -->
      <span v-if="showIndex" class="text-grey-6 text-caption array-index q-mr-xs">
        {{ index }}
      </span>

      <!-- Type -->
      <JsonTypePicker v-if="editable" class="q-mr-xs type-picker-slot" :model-value="node.type" :editable="editable"
        @update:modelValue="onTypeChange" />

      <!-- Object key -->
      <template v-if="showKey">
        <q-input v-if="editable" v-model="localKey" dense :borderless="!keyInputFocused" :outlined="keyInputFocused"
          hide-bottom-space class="text-weight-medium key-input" :error="hasDuplicateKey"
          :error-message="hasDuplicateKey ? 'Duplicate key' : ''" @focus="keyInputFocused = editable"
          @blur="keyInputFocused = false; commitKeyRename()" @keyup.enter="commitKeyRename" />
        <span v-else class="text-weight-medium ellipsis key-input">
          {{ node.key }}
        </span>
        <span class="text-grey-5">:</span>
      </template>
      <!-- Value / container summary -->
      <template v-if="isPrimitive">
        <JsonPrimitiveEditor class="value-slot" :node="node" :editable="editable" @commit-value="onValueChange"
          width="100%" />
      </template>
      <template v-else></template>

      <!-- Remove -->
      <q-btn v-if="editable && allowDelete" flat round dense icon="close" size="xs" color="grey-6"
        @click="$emit('request-remove', node.id)" />
    </div>

    <!-- Children -->
    <div v-if="node.type === 'object'" class="q-mt-xs">
      <JsonObjectNode :node="node" :tree="tree" :depth="depth + 1" :editable="editable" :dark="dark"
        @request-key-rename="$emit('request-key-rename', $event)"
        @request-type-change="$emit('request-type-change', $event)"
        @request-value-change="$emit('request-value-change', $event)" @request-remove="$emit('request-remove', $event)"
        @request-add-property="$emit('request-add-property', $event)"
        @request-add-array-item="$emit('request-add-array-item', $event)" />
    </div>
    <div v-else-if="node.type === 'array'" class="q-mt-xs">
      <JsonArrayNode :node="node" :tree="tree" :depth="depth + 1" :editable="editable" :dark="dark"
        @request-key-rename="$emit('request-key-rename', $event)"
        @request-type-change="$emit('request-type-change', $event)"
        @request-value-change="$emit('request-value-change', $event)" @request-remove="$emit('request-remove', $event)"
        @request-add-property="$emit('request-add-property', $event)"
        @request-add-array-item="$emit('request-add-array-item', $event)" />
    </div>
  </div>
</template>

<script>
import { computed, ref, watch } from "vue";
import JsonTypePicker from "./JsonTypePicker.vue";
import JsonPrimitiveEditor from "./JsonPrimitiveEditor.vue";
import { defineAsyncComponent } from "vue";

const JsonObjectNode = defineAsyncComponent(() => import("./JsonObjectNode.vue"));
const JsonArrayNode = defineAsyncComponent(() => import("./JsonArrayNode.vue"));

export default {
  name: "JsonNodeEditor",
  components: {
    JsonObjectNode,
    JsonArrayNode,
    JsonTypePicker,
    JsonPrimitiveEditor,
  },
  props: {
    node: { type: Object, required: true },
    tree: { type: Object, required: true },
    depth: { type: Number, default: 0 },
    editable: { type: Boolean, default: false },
    dark: { type: Boolean, default: false },
    showKey: { type: Boolean, default: false },
    showIndex: { type: Boolean, default: false },
    index: { type: Number, default: null },
    siblingKeys: { type: Array, default: () => [] },
    allowDelete: { type: Boolean, default: true },
  },
  emits: [
    "request-key-rename",
    "request-type-change",
    "request-value-change",
    "request-remove",
    "request-add-property",
    "request-add-array-item",
  ],
  setup(props, { emit }) {
    const localKey = ref(props.node.key || "");
    const keyInputFocused = ref(false);
    watch(
      () => props.node.key,
      (v) => {
        localKey.value = v || "";
      }
    );

    const isPrimitive = computed(
      () => props.node.type !== "object" && props.node.type !== "array"
    );

    const isBranch = computed(
      () => props.node.type === "object" || props.node.type === "array"
    );

    const hasDuplicateKey = computed(() => {
      if (!props.showKey) return false;
      const next = (localKey.value || "").trim();
      if (!next) return false;
      // If it's changing away from current key, check for duplicates.
      return props.siblingKeys.some(
        (k) => k === next && k !== props.node.key
      );
    });

    const onTypeChange = (t) => {
      emit("request-type-change", { nodeId: props.node.id, type: t });
    };

    const onValueChange = (v) => {
      emit("request-value-change", { nodeId: props.node.id, value: v });
    };

    const commitKeyRename = () => {
      if (!props.showKey || !props.editable) return;
      const next = (localKey.value || "").trim();
      const oldKey = props.node.key || "";
      if (!next || next === oldKey || hasDuplicateKey.value) return;
      emit("request-key-rename", { nodeId: props.node.id, key: next });
    };

    return {
      localKey,
      isBranch,
      isPrimitive,
      onTypeChange,
      onValueChange,
      commitKeyRename,
      hasDuplicateKey,
      keyInputFocused,
    };
  },
};
</script>

<style lang="scss" scoped>
.JsonNodeEditor {
  position: relative;
  overflow: visible;
  margin-bottom: 4px;

  .array-index {
    min-width: 44px;
  }

  .key-input {
    max-width: 180px;
    min-width: 80px;
  }

  .json-row {
    flex-wrap: nowrap;
    min-width: 0;
    min-height: 40px;
    padding-top: 2px;
    padding-bottom: 2px;
  }

  .value-slot {
    flex: 1 1 0;
    min-width: 0;
  }

  .type-picker-slot {
    align-self: center;
    margin-top: 0;
    flex: 0 0 auto;
  }
}

@media (max-width: 600px) {
  .JsonNodeEditor {
    .json-row {
      align-items: center;
    }

    .key-input {
      min-width: 64px;
      max-width: 120px;
      align-self: center;
    }

    .type-picker-slot {
      align-self: center;
    }

    .value-slot {
      align-self: center;
    }

    .json-row>.text-grey-5 {
      align-self: center;
    }
  }
}

.JsonNodeEditor:last-child {
  margin-bottom: 0;
}

.JsonNodeEditor--branch::before {
  content: "";
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  border-left: 1px solid rgba(0, 0, 0, 0.12);
  pointer-events: none;
}

.JsonNodeEditor--branch::after {
  content: "";
  position: absolute;
  left: 0;
  top: 18px;
  width: 14px;
  border-top: 1px solid rgba(0, 0, 0, 0.12);
  pointer-events: none;
}

.JsonNodeEditor--dark.JsonNodeEditor--branch::before {
  border-left-color: rgba(255, 255, 255, 0.18);
}

.JsonNodeEditor--dark.JsonNodeEditor--branch::after {
  border-top-color: rgba(255, 255, 255, 0.18);
}
</style>
