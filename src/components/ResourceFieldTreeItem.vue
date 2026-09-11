<template>
  <div>
    <q-item class="q-pr-none" :style="{ paddingLeft: `${depth * 20 + 16}px` }">
      <q-item-section side>
        <q-checkbox
          toggle-order="ft"
          :class="{ primary: changed(path) }"
          :dark="dark"
          :color="changed(path) ? 'primary' : 'grey-7'"
          :model-value="selected(path, field, depth)"
          :disable="disabled"
          @update:model-value="toggle"
        />
      </q-item-section>
      <q-item-section>
        <div class="row items-center">
          <q-icon
            :name="resource.getFieldIcon(field.name)"
            size="sm"
            class="q-mr-md"
            :color="dark ? 'grey-4' : 'grey-8'"
          />
          <span v-text="field.label" />
        </div>
      </q-item-section>
      <q-item-section side v-if="relatedResource">
        <q-btn
          flat
          round
          dense
          :icon="expanded ? 'expand_less' : 'chevron_right'"
          :aria-label="`${expanded ? 'Collapse' : 'Expand'} ${field.label}`"
          @click.stop="expanded = !expanded"
        />
      </q-item-section>
    </q-item>
    <q-slide-transition>
      <div v-if="expanded && relatedResource">
        <ResourceFieldTreeItem
          v-for="child in children"
          :key="`${path}.${child.name}`"
          :resource="relatedResource"
          :field="child"
          :path="`${path}.${child.name}`"
          :depth="depth + 1"
          :dark="dark"
          :selected="selected"
          :changed="changed"
          @toggle="$emit('toggle', $event)"
        />
      </div>
    </q-slide-transition>
  </div>
</template>

<script>
import { computed, ref } from "vue";

export default {
  name: "ResourceFieldTreeItem",
  props: {
    resource: Object,
    field: Object,
    path: String,
    depth: Number,
    dark: Boolean,
    selected: Function,
    changed: Function,
    disabled: Boolean,
  },
  emits: ["toggle"],
  setup(props, context) {
    const expanded = ref(false);
    const relatedResource = computed(() => {
      if (props.field.type !== "one" && props.field.type !== "many") {
        return null;
      }
      return props.resource.getRelation(props.field.related);
    });
    const children = computed(() => {
      if (!expanded.value || !relatedResource.value) {
        return [];
      }
      return relatedResource.value.getFields({ read: true }, [
        "name_field",
        "name",
      ]);
    });
    const toggle = (value) => {
      context.emit("toggle", {
        path: props.path,
        value,
        field: props.field,
        depth: props.depth,
      });
    };
    return {
      expanded,
      relatedResource,
      children,
      toggle,
    };
  },
};
</script>
