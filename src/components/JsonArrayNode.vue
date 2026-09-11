<template>
  <div class="JsonArrayNode">
    <template v-for="(childId, idx) in node.children" :key="childId">
      <div class="row items-start no-wrap q-gutter-xs">
        <q-btn
          v-if="editable"
          flat
          dense
          round
          size="xs"
          icon="add"
          color="primary"
          @click="insertBefore(idx)"
        />

        <JsonNodeEditor
          class="col"
          :node="tree.nodesById[childId]"
          :tree="tree"
          :depth="depth"
          :editable="editable"
          :dark="dark"
          :showKey="false"
          :showIndex="false"
          :index="idx"
          :allowDelete="true"
          @request-key-rename="$emit('request-key-rename', $event)"
          @request-type-change="$emit('request-type-change', $event)"
          @request-value-change="$emit('request-value-change', $event)"
          @request-remove="$emit('request-remove', $event)"
          @request-add-property="$emit('request-add-property', $event)"
          @request-add-array-item="$emit('request-add-array-item', $event)"
        />
      </div>
    </template>

    <!-- Append controls -->
    <div v-if="editable" class="q-mt-xs row q-gutter-sm">
      <q-btn
        flat
        dense
        size="sm"
        icon="add"
        label="Add item"
        color="primary"
        @click="appendItem()"
      />
    </div>
  </div>
</template>

<script>
import { defineAsyncComponent } from "vue";

const JsonNodeEditor = defineAsyncComponent(() => import("./JsonNodeEditor.vue"));

export default {
  name: "JsonArrayNode",
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
    const insertBefore = (index) => {
      emit("request-add-array-item", {
        parentId: props.node.id,
        index,
        initialType: "string",
      });
    };

    const appendItem = () => {
      emit("request-add-array-item", {
        parentId: props.node.id,
        index: null,
        initialType: "string",
      });
    };

    return { insertBefore, appendItem };
  },
};
</script>
