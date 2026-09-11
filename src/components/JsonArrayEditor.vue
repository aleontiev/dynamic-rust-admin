<style lang="scss" scoped>
.JsonArrayEditor {
  .array-index {
    min-width: 32px;
    user-select: none;
  }
}
</style>

<template>
  <div class="JsonArrayEditor" :style="{ paddingLeft: depth > 0 ? '8px' : '0' }">
    <div
      v-for="(item, index) in modelValue"
      :key="index"
      class="row items-start q-py-xs"
    >
      <span class="array-index text-grey-6 text-caption q-mr-sm q-mt-xs">
        [{{ index }}]
      </span>

      <div class="col">
        <!-- Object item -->
        <q-expansion-item
          v-if="isObj(item)"
          default-opened
          dense
          :header-class="'text-body2'"
        >
          <template #header>
            <q-item-section>
              Object ({{ Object.keys(item).length }} keys)
            </q-item-section>
          </template>
          <JsonObjectEditor
            :model-value="item"
            @update:model-value="updateItem(index, $event)"
            :editable="editable"
            :dark="dark"
            :depth="depth + 1"
          />
        </q-expansion-item>

        <!-- Nested array -->
        <q-expansion-item
          v-else-if="Array.isArray(item)"
          default-opened
          dense
          :header-class="'text-body2'"
        >
          <template #header>
            <q-item-section>
              Array ({{ item.length }} items)
            </q-item-section>
          </template>
          <JsonArrayEditor
            :model-value="item"
            @update:model-value="updateItem(index, $event)"
            :editable="editable"
            :dark="dark"
            :depth="depth + 1"
          />
        </q-expansion-item>

        <!-- Primitive item -->
        <div v-else class="row items-center no-wrap">
          <JsonKeyValueRow
            :field-value="item"
            :editable="editable"
            :dark="dark"
            :show-key="false"
            @update:value="updateItem(index, $event)"
          />
        </div>
      </div>

      <q-btn
        v-if="editable"
        flat
        round
        dense
        icon="close"
        size="xs"
        color="grey-6"
        class="q-mt-xs q-ml-xs"
        @click="removeItem(index)"
      />
    </div>

    <div
      v-if="!modelValue || modelValue.length === 0"
      class="text-grey-5 text-caption q-pa-xs"
    >
      Empty array
    </div>

    <div v-if="editable" class="q-mt-xs row q-gutter-sm">
      <q-btn
        flat
        dense
        size="sm"
        icon="add"
        label="Add item"
        color="primary"
        @click="addItem"
      />
      <q-btn
        flat
        dense
        size="sm"
        icon="data_object"
        label="Add object"
        color="secondary"
        @click="addObjectItem"
      />
    </div>
  </div>
</template>

<script>
import { defineAsyncComponent } from "vue";
import JsonKeyValueRow from "./JsonKeyValueRow.vue";

export default {
  name: "JsonArrayEditor",
  components: {
    JsonKeyValueRow,
    JsonObjectEditor: defineAsyncComponent(() => import("./JsonObjectEditor.vue")),
  },
  props: {
    modelValue: { type: Array, default: () => [] },
    editable: { type: Boolean, default: false },
    dark: { type: Boolean, default: false },
    depth: { type: Number, default: 0 },
  },
  emits: ["update:modelValue"],
  setup(props, { emit }) {
    const emitClone = (arr) => emit("update:modelValue", [...arr]);

    const updateItem = (index, value) => {
      const copy = [...props.modelValue];
      copy[index] = value;
      emitClone(copy);
    };

    const removeItem = (index) => {
      const copy = [...props.modelValue];
      copy.splice(index, 1);
      emitClone(copy);
    };

    const addItem = () => emitClone([...props.modelValue, ""]);
    const addObjectItem = () => emitClone([...props.modelValue, {}]);

    const isObj = (val) =>
      val !== null && typeof val === "object" && !Array.isArray(val);

    return { updateItem, removeItem, addItem, addObjectItem, isObj };
  },
};
</script>
