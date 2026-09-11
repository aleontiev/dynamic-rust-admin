<style lang="scss" scoped>
.JsonKeyValueRow {
  min-height: 32px;
  .key-input {
    max-width: 180px;
    min-width: 80px;
  }
  .value-input {
    min-width: 100px;
  }
}
</style>

<template>
  <div class="JsonKeyValueRow row items-center q-py-xs q-gutter-sm no-wrap">
    <q-input
      v-if="editable && showKey"
      :model-value="fieldKey"
      dense
      borderless
      class="key-input text-weight-medium"
      @change="onKeyChange"
      :error="hasDuplicateKey"
      :error-message="hasDuplicateKey ? 'Duplicate key' : ''"
      hide-bottom-space
    />
    <span
      v-else-if="showKey"
      class="key-input text-weight-medium ellipsis"
      :class="dark ? 'text-grey-4' : 'text-grey-8'"
    >
      {{ fieldKey }}
    </span>

    <span v-if="showKey" class="text-grey-5">:</span>

    <!-- Boolean -->
    <q-toggle
      v-if="valueType === 'boolean'"
      :model-value="fieldValue"
      :disable="!editable"
      dense
      class="col"
      @update:model-value="$emit('update:value', $event)"
    />

    <!-- Null -->
    <div v-else-if="fieldValue === null || fieldValue === undefined" class="col row items-center">
      <span class="text-italic text-grey-5">null</span>
      <q-btn
        v-if="editable"
        flat
        dense
        size="xs"
        label="Set value"
        color="primary"
        class="q-ml-sm"
        @click="$emit('update:value', '')"
      />
    </div>

    <!-- Number -->
    <q-input
      v-else-if="valueType === 'number'"
      :model-value="fieldValue"
      :readonly="!editable"
      type="number"
      dense
      borderless
      class="col value-input"
      hide-bottom-space
      @update:model-value="$emit('update:value', Number($event))"
    />

    <!-- String (default) -->
    <q-input
      v-else
      :model-value="String(fieldValue ?? '')"
      :readonly="!editable"
      dense
      borderless
      class="col value-input"
      hide-bottom-space
      @update:model-value="$emit('update:value', $event)"
    />

    <q-btn
      v-if="editable && showKey"
      flat
      round
      dense
      icon="close"
      size="xs"
      color="grey-6"
      @click="$emit('remove')"
    />
  </div>
</template>

<script>
import { computed } from "vue";

export default {
  name: "JsonKeyValueRow",
  props: {
    fieldKey: { type: String, default: "" },
    fieldValue: { default: null },
    editable: { type: Boolean, default: false },
    dark: { type: Boolean, default: false },
    showKey: { type: Boolean, default: true },
    existingKeys: { type: Array, default: () => [] },
  },
  emits: ["update:key", "update:value", "remove"],
  setup(props, { emit }) {
    const valueType = computed(() => {
      if (props.fieldValue === null || props.fieldValue === undefined)
        return "null";
      return typeof props.fieldValue;
    });

    const hasDuplicateKey = computed(() => {
      if (!props.fieldKey) return false;
      return (
        props.existingKeys.filter((k) => k === props.fieldKey).length > 1
      );
    });

    const onKeyChange = (event) => {
      const newKey =
        typeof event === "string" ? event : event?.target?.value ?? "";
      if (newKey && newKey !== props.fieldKey) {
        emit("update:key", newKey);
      }
    };

    return {
      valueType,
      hasDuplicateKey,
      onKeyChange,
    };
  },
};
</script>
