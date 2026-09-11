<template>
  <div :class="['JsonTreeEditor', { 'JsonTreeEditor--shallow': isShallow, 'JsonTreeEditor--readonly': !editable }]">
    <JsonNodeEditor
      :node="tree.nodesById[rootId]"
      :tree="tree"
      :depth="0"
      :editable="editable"
      :dark="dark"
      :showKey="false"
      :showIndex="false"
      :siblingKeys="[]"
      :allowDelete="false"
      @request-key-rename="$emit('request-key-rename', $event)"
      @request-type-change="$emit('request-type-change', $event)"
      @request-value-change="$emit('request-value-change', $event)"
      @request-remove="$emit('request-remove', $event)"
      @request-add-property="$emit('request-add-property', $event)"
      @request-add-array-item="$emit('request-add-array-item', $event)"
    />
  </div>
</template>

<script>
import { computed, defineAsyncComponent } from "vue";

const JsonNodeEditor = defineAsyncComponent(() => import("./JsonNodeEditor.vue"));

export default {
  name: "JsonTreeEditor",
  components: { JsonNodeEditor },
  props: {
    tree: { type: Object, required: true },
    rootId: { type: String, required: true },
    editable: { type: Boolean, default: false },
    dark: { type: Boolean, default: false },
  },
  setup(props) {
    const isShallow = computed(() => {
      const root = props.tree.nodesById[props.rootId];
      if (!root) return true;
      if (root.type !== "object" && root.type !== "array") return true;
      return (root.children || []).every((childId) => {
        const child = props.tree.nodesById[childId];
        return child && child.type !== "object" && child.type !== "array";
      });
    });
    return { isShallow };
  },
  emits: [
    "request-key-rename",
    "request-type-change",
    "request-value-change",
    "request-remove",
    "request-add-property",
    "request-add-array-item",
  ],
};
</script>

<style lang="scss" scoped>
.JsonTreeEditor {
  overflow-x: auto;
  overflow-y: visible;
  -webkit-overflow-scrolling: touch;
  padding-top: 8px;
}

.JsonTreeEditor--shallow :deep(.JsonNodeEditor--branch)::before,
.JsonTreeEditor--shallow :deep(.JsonNodeEditor--branch)::after {
  display: none;
}

.JsonTreeEditor--readonly {
  padding-top: 0;
}

.JsonTreeEditor :deep(.JsonNodeEditor) {
  min-width: 560px;
}

@media (min-width: 768px) {
  .JsonTreeEditor :deep(.JsonNodeEditor) {
    min-width: 0;
  }
}
</style>
