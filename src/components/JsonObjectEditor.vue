<style lang="scss" scoped>
.JsonObjectEditor {
  .nested-header {
    font-size: 0.9em;
  }
}
</style>

<template>
  <div class="JsonObjectEditor" :style="{ paddingLeft: depth > 1 ? '16px' : '0' }">
    <template v-for="key in keys" :key="key">
      <!-- Nested object -->
      <q-expansion-item v-if="isObj(modelValue[key])" default-opened dense
        header-class="text-weight-medium nested-header">
        <template #header>
          <q-item-section>
            <div class="row items-center q-gutter-xs">
              <q-input v-if="editable" :model-value="key" dense borderless class="text-weight-medium"
                style="max-width: 160px" hide-bottom-space @change="renameKey(key, $event)" />
              <span v-else>{{ key }}</span>
              <q-badge outline color="grey-7" :label="Object.keys(modelValue[key]).length" />
            </div>
          </q-item-section>
          <q-item-section side v-if="editable">
            <q-btn flat round dense icon="close" size="xs" color="grey-6" @click.stop="removeKey(key)" />
          </q-item-section>
        </template>
        <JsonObjectEditor :model-value="modelValue[key]" @update:model-value="updateChild(key, $event)"
          :editable="editable" :dark="dark" :depth="depth + 1" />
      </q-expansion-item>

      <!-- Nested array -->
      <q-expansion-item v-else-if="Array.isArray(modelValue[key])" default-opened dense
        header-class="text-weight-medium nested-header">
        <template #header>
          <q-item-section>
            <div class="row items-center q-gutter-xs">
              <q-input v-if="editable" :model-value="key" dense borderless class="text-weight-medium"
                style="max-width: 160px" hide-bottom-space @change="renameKey(key, $event)" />
              <span v-else>{{ key }}</span>
              <q-badge outline color="grey-7" :label="modelValue[key].length" />
            </div>
          </q-item-section>
          <q-item-section side v-if="editable">
            <q-btn flat round dense icon="close" size="xs" color="grey-6" @click.stop="removeKey(key)" />
          </q-item-section>
        </template>
        <JsonArrayEditor :model-value="modelValue[key]" @update:model-value="updateChild(key, $event)"
          :editable="editable" :dark="dark" :depth="depth + 1" />
      </q-expansion-item>

      <!-- Primitive value -->
      <JsonKeyValueRow v-else :field-key="key" :field-value="modelValue[key]" :editable="editable" :dark="dark"
        :existing-keys="keys" @update:key="renameKey(key, $event)" @update:value="updateChild(key, $event)"
        @remove="removeKey(key)" />
    </template>

    <div v-if="editable" class="q-mt-xs q-ml-sm">
      <q-btn flat dense size="sm" icon="add" label="Add field" color="primary" @click="addKey" />
    </div>
  </div>
</template>

<script>
import { computed } from "vue";
import JsonArrayEditor from "./JsonArrayEditor.vue";
import JsonKeyValueRow from "./JsonKeyValueRow.vue";

export default {
  name: "JsonObjectEditor",
  components: { JsonArrayEditor, JsonKeyValueRow },
  props: {
    modelValue: { type: Object, default: () => ({}) },
    editable: { type: Boolean, default: false },
    dark: { type: Boolean, default: false },
    depth: { type: Number, default: 0 },
  },
  emits: ["update:modelValue"],
  setup(props, { emit }) {
    const keys = computed(() => Object.keys(props.modelValue || {}));

    const emitUpdate = (obj) => emit("update:modelValue", { ...obj });

    const updateChild = (key, value) => {
      emitUpdate({ ...props.modelValue, [key]: value });
    };

    const removeKey = (key) => {
      const copy = { ...props.modelValue };
      delete copy[key];
      emitUpdate(copy);
    };

    const renameKey = (oldKey, event) => {
      const newKey =
        typeof event === "string" ? event : event?.target?.value ?? "";
      if (!newKey || newKey === oldKey) return;
      if (keys.value.includes(newKey)) return;
      const entries = Object.entries(props.modelValue).map(([k, v]) =>
        k === oldKey ? [newKey, v] : [k, v]
      );
      emit("update:modelValue", Object.fromEntries(entries));
    };

    const addKey = () => {
      let name = "new_field";
      let counter = 1;
      while (keys.value.includes(name)) {
        name = `new_field_${counter++}`;
      }
      emitUpdate({ ...props.modelValue, [name]: "" });
    };

    const isObj = (val) =>
      val !== null && typeof val === "object" && !Array.isArray(val);

    return { keys, updateChild, removeKey, renameKey, addKey, isObj };
  },
};
</script>
