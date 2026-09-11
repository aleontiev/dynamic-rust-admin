<template>
  <div class="flexrow">
    <q-list v-if="value">
      <FilterItem
        :hasPrevious="hasPrevious"
        :key="index"
        v-for="(f, index) in value"
        :dark="dark"
        :dense="dense"
        :resource="resource"
        :original="original ? original[index] : null"
        :value="f"
        @update="onUpdate(index, $event)"
        @delete="onDelete(index)"
        :editable="!readonly"
      />
    </q-list>
    <q-btn
      label="Add Filter"
      flat
      rounded
      icon="add"
      class="q-mt-lg"
      style="float: right"
      @click="onAdd"
      v-if="canAdd"
    />
  </div>
</template>

<script>
import { computed } from "vue";
import FilterItem from "./FilterItem";
export default {
  props: [
    "dark",
    "dense",
    "resource",
    "value",
    "original",
    "readonly",
    "hasPrevious",
  ],
  emits: ["update", "delete", "add"],
  components: {
    FilterItem,
  },
  setup(props, context) {
    return {
      onUpdate: (index, update) => {
        context.emit("update", { index, update });
      },
      onDelete: (index) => {
        context.emit("delete", { index });
      },
      onAdd: () => {
        context.emit("add");
      },
      canAdd: computed(() => {
        if (props.readonly) {
          return false;
        }
        const $value = props.value;
        if (!$value) {
          return true;
        }
        if ($value.length) {
          const last = $value[$value.length - 1];
          if (Object.keys(last).length === 0) {
            return false;
          }
        }
        return true;
      }),
    };
  },
};
</script>
