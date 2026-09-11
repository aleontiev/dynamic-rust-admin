<template>
  <div class="JsonObjectNode">
    <template v-for="childId in node.children" :key="childId">
      <JsonNodeEditor
        :node="tree.nodesById[childId]"
        :tree="tree"
        :depth="depth"
        :editable="editable"
        :dark="dark"
        :showKey="true"
        :siblingKeys="siblingKeys"
        :allowDelete="true"
        @request-key-rename="$emit('request-key-rename', $event)"
        @request-type-change="$emit('request-type-change', $event)"
        @request-value-change="$emit('request-value-change', $event)"
        @request-remove="$emit('request-remove', $event)"
        @request-add-property="$emit('request-add-property', $event)"
        @request-add-array-item="$emit('request-add-array-item', $event)"
      />
    </template>

    <!-- Add property -->
    <div v-if="editable" class="q-mt-xs">
      <q-btn
        flat
        dense
        size="sm"
        icon="add"
        label="Add item"
        color="primary"
        @click="startAdd"
      />
    </div>
  </div>
</template>

<script>
import { computed } from "vue";
import { defineAsyncComponent } from "vue";

const JsonNodeEditor = defineAsyncComponent(() => import("./JsonNodeEditor.vue"));

export default {
  name: "JsonObjectNode",
  components: { JsonNodeEditor },
  props: {
    node: { type: Object, required: true },
    tree: { type: Object, required: true },
    depth: { type: Number, default: 0 },
    editable: { type: Boolean, default: false },
    dark: { type: Boolean, default: false },
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
    const siblingKeys = computed(() =>
      (props.node.children || [])
        .map((id) => props.tree.nodesById?.[id]?.key)
        .filter((k) => k !== null && typeof k !== "undefined")
    );

    const makeUniqueKey = (base) => {
      const existing = new Set(siblingKeys.value);
      if (!existing.has(base)) return base;
      let i = 2;
      while (existing.has(`${base}_${i}`)) i += 1;
      return `${base}_${i}`;
    };

    const startAdd = () => {
      const key = makeUniqueKey("new_field");
      emit("request-add-property", { parentId: props.node.id, key });
    };

    return { siblingKeys, startAdd };
  },
};
</script>
