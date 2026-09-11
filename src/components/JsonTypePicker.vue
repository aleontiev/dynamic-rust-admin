<template>
  <div class="JsonTypePicker">
    <div v-if="editable" class="type-picker-wrapper">
      <q-select ref="typeSelectRef" dense borderless hide-bottom-space class="type-select-overlay" v-model="localType"
        :options="typeOptions" emit-value map-options behavior="menu">
        <template v-slot:selected-item="scope">
          <span class="type-icon-only">
            <q-icon v-if="scope.opt.value === 'boolean'" name="toggle_on" size="xs" />
            <q-icon v-else :name="typeIconName(scope.opt.value)" size="xs" />
          </span>
        </template>

        <template v-slot:option="scope">
          <q-item v-bind="scope.itemProps">
            <q-item-section side class="col-auto">
              <q-icon v-if="scope.opt.value === 'boolean'" name="toggle_on" size="xs" />
              <q-icon v-else :name="typeIconName(scope.opt.value)" size="xs" />
            </q-item-section>
            <q-item-section>
              <q-item-label>{{ scope.opt.label }}</q-item-label>
            </q-item-section>
          </q-item>
        </template>
      </q-select>

      <q-badge outline color="grey-7" class="type-badge cursor-pointer" @click.stop="onBadgeClick">
        <template v-if="modelValue === 'boolean'">
          <q-icon name="toggle_on" size="xs" />
        </template>
        <template v-else>
          <q-icon :name="typeIconName(modelValue)" size="xs" />
        </template>
      </q-badge>
    </div>

    <q-badge v-else outline color="grey-7" class="type-badge">
      <template v-if="modelValue === 'boolean'">
        <q-icon name="toggle_on" size="xs" />
      </template>
      <template v-else>
        <q-icon :name="typeIconName(modelValue)" size="xs" />
      </template>
    </q-badge>
  </div>
</template>

<script>
import { computed, ref } from "vue";
import { NODE_TYPES } from "./JsonEditorModel";

export default {
  name: "JsonTypePicker",
  props: {
    modelValue: { type: String, default: "string" },
    editable: { type: Boolean, default: false },
  },
  emits: ["update:modelValue"],
  setup(props, { emit }) {
    const typeSelectRef = ref(null);

    const typeIconName = (type) => {
      switch (type) {
        case "integer":
          return "tag";
        case "float":
          return "percent";
        case "array":
          return "data_array";
        case "object":
          return "data_object";
        case "string":
          return "text_fields";
        case "null":
          return "block";
        default:
          return "help";
      }
    };

    const typeOptions = computed(() =>
      NODE_TYPES.map((t) => ({
        label: t === "null" ? "null" : t[0].toUpperCase() + t.slice(1),
        value: t,
      }))
    );

    const localType = computed({
      get() {
        return props.modelValue;
      },
      set(v) {
        emit("update:modelValue", v);
      },
    });

    const onBadgeClick = () => {
      // Trigger the hidden q-select dropdown.
      typeSelectRef.value?.showPopup();
    };

    return { typeOptions, localType, typeIconName, typeSelectRef, onBadgeClick };
  },
};
</script>

<style lang="scss" scoped>
.type-picker-wrapper {
  position: relative;
  display: inline-flex;
  align-items: center;
  height: 40px;
}

.type-select-overlay {
  /* Keep element dimensions/position so the popup anchors nicely. */
  position: absolute;
  top: 0;
  left: 0;
  width: 40px;
  height: 100%;
  opacity: 0;
  pointer-events: none;
}

.type-icon-only {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 26px;
}

.type-icon-option {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono",
    "Courier New", monospace;
  font-size: 0.9rem;
}

.type-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  min-width: 40px;
  min-height: 40px;
  line-height: 1;
  padding-top: 0;
  padding-bottom: 0;
  border-radius: 4px;
}
</style>
