<template>
  <q-dialog
    v-model="isOpen"
    :class="{ dense: dense, 'large right': true }"
    :maximized="dense"
    transition-show="slide-up"
    transition-hide="slide-down"
    position="bottom"
  >
    <q-card>
      <q-toolbar
        style="z-index: 11; top: 0px"
        :class="{
          sticky: !dense,
          fixed: dense,
          'bg-primary': canSave,
          'bg-grey-3 text-black': dark && !canSave,
          'bg-grey-9 text-white': !dark && !canSave,
        }"
        v-close-popup
      >
        <q-icon name="mdi-table-column" size="sm" />
        <q-toolbar-title>
          Fields
        </q-toolbar-title>
        <q-btn flat round dense icon="close" />
      </q-toolbar>
      <q-card-section
        class="q-pb-md"
        :style="{
          paddingLeft: '0px',
          paddingRight: '0px',
          minHeight: dense ? 'calc(100dvh - 52px)' : 'inherit',
        }"
      >
        <div
          :class="{ 'text-h6 q-pl-md q-pb-md': true, 'q-pt-xl q-mt-sm': dense }"
        >
          Showing {{ title.toLowerCase() }}:
        </div>
        <q-list :class="{ 'q-pb-xl': dense }">
          <ResourceFieldTreeItem
            v-for="field in sortedFields"
            :key="field.name"
            :resource="resource"
            :field="field"
            :path="field.name"
            :depth="0"
            :dark="dark"
            :selected="getFieldValue"
            :changed="fieldChanged"
            :disabled="
              field.name === resource.name_field ||
              field.name === resource.id_field
            "
            @toggle="onFieldChange"
          />
        </q-list>
      </q-card-section>
      <div
        :class="{
          'absolute-bottom full-width bottom-bar': true,
          sticky: !dense,
          fixed: dense,
        }"
        style="z-index: 11"
      >
        <ActionBar :dark="dark" right>
          <IconButton
            left
            :dense="dense"
            :dark="dark"
            icon="close"
            label="Cancel"
            v-if="canDiscard"
            @click="discard"
          />
          <IconButton
            :dense="dense"
            :dark="dark"
            icon="mdi-border-none-variant"
            label="None"
            @click="selectNone"
          />
          <IconButton
            :dense="dense"
            :dark="dark"
            icon="restart_alt"
            label="Default"
            @click="selectDefault"
          />
          <IconButton
            :dense="dense"
            :dark="dark"
            icon="done"
            label="Apply"
            v-if="canSave"
            @click="save"
            color="primary"
          />
        </ActionBar>
      </div>
    </q-card>
  </q-dialog>
</template>

<script>
import { watch, computed, ref } from "vue";
import { IconButton, ActionBar } from ".";
import { isEqual } from "../utilities";
import ResourceFieldTreeItem from "./ResourceFieldTreeItem";

export default {
  props: ["dense", "dark", "value", "resource", "fields", "include", "data"],
  components: {
    IconButton,
    ActionBar,
    ResourceFieldTreeItem,
  },
  setup(props, context) {
    const changes = ref({});
    const live = computed(() => {
      const base = { ...props.include };
      const $changes = changes.value;
      Object.entries($changes).forEach(([key, value]) => {
        if (value === null) {
          delete base[key];
        } else {
          base[key] = value;
        }
      });
      return base;
    });
    const isOpen = computed({
      get() {
        return props.value;
      },
      set(newValue) {
        context.emit("input", newValue);
      },
    });
    const canSave = computed(() => Object.entries(changes.value).length > 0);
    const canDiscard = computed(() => Object.entries(changes.value).length > 0);
    const sortedFields = computed(() =>
      props.fields
        .map((x) => x)
        .filter((x) => x.name !== props.resource.id_field)
        .sort((a, b) => {
          if (a.name === props.resource.id_field) {
            return -1;
          }
          if (b.name === props.resource.id_field) {
            return 1;
          }
          if (a.name === props.resource.name_field) {
            return -1;
          }
          if (b.name === props.resource.name_field) {
            return 1;
          }
          return a.name.localeCompare(b.name);
        })
    );
    const title = computed(() => {
      const numVisible = props.resource.getVisibleFieldNames({
        view: "list",
        deferred: false,
        include: live.value,
        read: true,
      }).length;
      const s = numVisible === 1 ? "" : "s";
      return `${numVisible} Field${s}`;
    });
    const getInitialFieldValue = (path, field, depth) => {
      if (
        depth === 0 &&
        (path === props.resource.id_field || path === props.resource.name_field)
      ) {
        return true;
      }
      if (props.include && typeof props.include[path] !== "undefined") {
        return !!props.include[path];
      }
      return depth === 0 && !field.deferred;
    };
    const getFieldValue = (path, field, depth) => {
      if (typeof changes.value[path] !== "undefined") {
        return !!changes.value[path];
      }
      return getInitialFieldValue(path, field, depth);
    };
    const fieldChanged = (path) => typeof changes.value[path] !== "undefined";
    const onFieldChange = ({ path, value, field, depth }) => {
      if (!isEqual(getInitialFieldValue(path, field, depth), !!value)) {
        changes.value[path] = !!value;
      } else if (typeof changes.value[path] !== "undefined") {
        delete changes.value[path];
      }
    };
    const discard = () => {
      // undo the changes
      changes.value = {};
    };
    const selectNone = () => {
      props.fields.forEach((f) => {
        const name = f.name;
        if (
          name === props.resource.id_field ||
          name === props.resource.name_field
        ) {
          return;
        }
        if (
          live.value[f.name] ||
          (typeof live.value[f.name] === "undefined" && !f.deferred)
        ) {
          onFieldChange({ path: f.name, value: false, field: f, depth: 0 });
        }
      });
      Object.entries(live.value)
        .filter(([path, value]) => path.includes(".") && value)
        .forEach(([path]) => {
          const field = props.resource.getPathField(path);
          if (field) {
            onFieldChange({ path, value: false, field, depth: 1 });
          }
        });
    };
    const selectDefault = () => {
      props.fields.forEach((field) => {
        const name = field.name;
        if (
          name === props.resource.id_field ||
          name === props.resource.name_field
        ) {
          return;
        }
        const defaultValue = !field.deferred;
        const currentValue =
          typeof live.value[name] === "undefined"
            ? defaultValue
            : live.value[name];
        if (currentValue !== defaultValue) {
          onFieldChange({
            path: name,
            value: defaultValue,
            field,
            depth: 0,
          });
        }
      });
      Object.entries(live.value)
        .filter(([path, value]) => path.includes(".") && value)
        .forEach(([path]) => {
          const field = props.resource.getPathField(path);
          if (field) {
            onFieldChange({ path, value: false, field, depth: 1 });
          }
        });
    };
    const save = () => {
      context.emit("change", changes.value);
      changes.value = {};
    };
    watch(
      () => [props.resource, props.fields],
      () => (changes.value = {})
    );
    return {
      changes,
      isOpen,
      canSave,
      canDiscard,
      sortedFields,
      title,
      live,
      getFieldValue,
      fieldChanged,
      onFieldChange,
      discard,
      selectNone,
      selectDefault,
      save,
    };
  },
};
</script>
