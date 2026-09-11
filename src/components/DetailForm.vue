<style lang="scss">
.DetailForm {
  min-height: 50dvh;
}
.DetailForm.dense {
  min-height: 90dvh;
  &.create:not(.inline) {
    padding-top: 50px;
  }
}
</style>
<template>
  <div
    :class="{
      'q-pb-lg DetailForm scroll': true,
      'full-page-content': !embedded || dense,
      dense: dense,
      inline: inline,
      embedded: embedded,
      create: mode === 'create' || mode === 'dialog',
    }"
  >
    <DetailNavigation
      :displayFields="displayFields"
      :mode="mode"
      :saving="saving"
      :embedded="embedded"
      :inline="inline"
      :dense="dense"
      :dark="dark"
      :changes="changes"
      :resource="resource"
      :fields="fields"
      :record="record"
      :focused="focused"
      @change="onFieldsetChange"
      :loading="loading"
      @focus="focus"
      :editing="editing"
      :deleting="deleting"
    />

    <div
      v-if="fieldset !== 'All' || dense || fullWidth"
      :class="{
        'q-pt-sm q-mt-md': dense,
        'q-pt-md': !dense,
        'fields q-pl-md q-pr-sm column items-center q-pb-xl': true,
      }"
    >
      <FieldItem
        :inline="inline"
        :dense="dense"
        :mode="mode"
        :key="field.name"
        v-for="field in allFields"
        :dynamicIcons="dynamicIcons"
        :jsonMode="jsonMode"
        :changes="changes"
        :editing="editing"
        :display="focused ? display : null"
        :fieldViews="fieldViews"
        :relatedView="relatedViews ? relatedViews[field.name] : null"
        :visible="displayFields[field.name]"
        :dark="dark"
        :loading="loading"
        :resource="resource"
        :field="field"
        :record="record"
        @update="changed(field.name, $event)"
        :focused="focused"
        :canFocus="true"
        class="q-mt-sm q-mb-lg row full-width"
        @focus="focus"
        @showAdd="emitShowAdd(field.name)"
        @changeFieldView="emitChangeFieldView"
      />
    </div>
    <div v-else class="fields q-pl-md q-pr-sm row">
      <div class="col-6 column items-center q-pb-xl q-pt-md">
        <FieldItem
          :inline="inline"
          :dense="true"
          :mode="mode"
          :key="field.name"
          v-for="field in leftFields"
          :changes="changes"
          :editing="editing"
          :dynamicIcons="dynamicIcons"
          :jsonMode="jsonMode"
          :display="focused ? display : null"
          :fieldViews="fieldViews"
          :relatedView="relatedViews ? relatedViews[field.name] : null"
          :visible="displayFields[field.name]"
          :dark="dark"
          :loading="loading"
          :resource="resource"
          :field="field"
          :record="record"
          @update="changed(field.name, $event)"
          :focused="focused"
          :canFocus="true"
          class="q-mt-sm q-mb-lg row full-width"
          @focus="focus"
          @showAdd="emitShowAdd(field.name)"
          @changeFieldView="emitChangeFieldView"
        />
      </div>
      <div class="col-6 column items-center q-pb-xl q-pt-md">
        <FieldItem
          :inline="inline"
          :dense="true"
          :mode="mode"
          :key="field.name"
          v-for="field in rightFields"
          :changes="changes"
          :editing="editing"
          :jsonMode="jsonMode"
          :display="focused ? display : null"
          :fieldViews="fieldViews"
          :relatedView="relatedViews ? relatedViews[field.name] : null"
          :visible="displayFields[field.name]"
          :dark="dark"
          :dynamicIcons="dynamicIcons"
          :loading="loading"
          :resource="resource"
          :field="field"
          :record="record"
          @update="changed(field.name, $event)"
          @showAdd="emitShowAdd(field.name)"
          @changeFieldView="emitChangeFieldView"
          :focused="focused"
          :canFocus="true"
          class="q-mt-sm q-mb-lg row full-width"
          @focus="focus"
        />
      </div>
    </div>
  </div>
</template>

<script>
import { watch, onMounted, reactive, ref, computed } from "vue";
import FieldItem from "./FieldItem.vue";
import DetailNavigation from "./DetailNavigation.vue";
import { evaluate, isEqual, isEmpty, getChoiceCascadeInvalidations } from "../utilities";

export default {
  components: {
    FieldItem,
    DetailNavigation,
  },
  props: {
    mode: String, // update or create
    fullWidth: Boolean,
    deleting: Boolean,
    inline: Boolean,
    resource: Object,
    fields: Array,
    record: Object,
    changes: Object,
    focused: String,
    display: String,
    fieldViews: Object,
    relatedViews: Object,
    dense: Boolean,
    dark: Boolean,
    loading: Number,
    saving: Boolean,
    editing: Boolean,
    embedded: Boolean,
    dynamicIcons: Boolean,
    jsonMode: String,
  },
  emits: ["focus", "change", "showAdd", "changeFieldView"],
  setup(props, context) {
    const fieldset = ref("All");
    const displayFields = computed(() => {
      const resource = props.resource;
      const $fieldset = fieldset.value;
      const editing = props.editing;
      const displayed = Object.fromEntries(
        props.fields
          .map((field) => {
            const inFieldset =
              $fieldset === "All" ||
              resource.getFieldSection($fieldset).fields.includes(field.name);
            return [field, inFieldset];
          })
          .filter(([field]) => {
            const changedRecord = { ...props.record, ...props.changes };
            const { resource_field, hide, name } = field;
            if (props.focused && name !== props.focused) {
              return false;
            }
            if (resource_field && resource_field.substr(0, 1) !== '"' && !changedRecord[resource_field]) {
              return false;
            }
            let allowed;
            const canWrite = resource.canWrite(name, props.record, props.mode);
            if (
              hide &&
              field.type !== "many" &&
              (!props.editing || !canWrite) &&
              isEmpty(resource.getValue(props.record, name))
            ) {
              // if field.hide is set, the field will not be displayed if it is empty and not writeable
              // many-relations are loaded lazily and decide their own visibility in FieldItem
              return false;
            }
            if (props.mode === "create" || props.mode === "dialog") {
              allowed = canWrite;
            } else {
              allowed = editing
                ? resource.canRead(name, props.record, props.mode) || canWrite
                : resource.canRead(name, props.record);
            }
            let dependenciesMet = true;
            if (field.depends && !props.focused) {
              try {
                dependenciesMet = evaluate(field.depends, changedRecord);
              } catch (e) {
                dependenciesMet = false;
              }
            }
            return allowed && dependenciesMet;
          })
          .map(([field, inFieldset]) => [field.name, inFieldset])
      );
      return displayed;
    });
    const live = reactive({});
    const recordData = ref(null);
    const reset = (force) => {
      if (!live.value) {
        live.value = {};
      }
      if (!props.record) {
        live.value = {};
        return;
      }
      const newData = props.record;
      if (!force && isEqual(recordData.value, newData)) {
        return;
      }
      changes.value = {};
      recordData.value = newData;
      live.value = Object.fromEntries(
        props.fields.map((field) => [
          field.name,
          props.resource.getValue(props.record, field.name),
        ])
      );
    };
    onMounted(() => {
      reset();
    });
    watch(
      () => [props.resource, props.record],
      () => {
        reset();
      }
    );
    watch(
      () => [props.editing],
      () => {
        if (!props.editing) {
          reset(true);
        }
      }
    );
    const changes = ref({});

    const strictJsonEqual = (a, b) => {
      const normalize = (x) => (typeof x === "undefined" ? null : x);
      a = normalize(a);
      b = normalize(b);

      if (a === b) return true;
      if (typeof a !== typeof b) return false;
      if (a === null || b === null) return a === b;

      if (Array.isArray(a)) {
        if (!Array.isArray(b)) return false;
        if (a.length !== b.length) return false;
        return a.every((v, i) => strictJsonEqual(v, b[i]));
      }

      if (typeof a === "object") {
        if (typeof b !== "object" || b === null) return false;
        const aKeys = Object.keys(a).sort();
        const bKeys = Object.keys(b).sort();
        if (aKeys.length !== bKeys.length) return false;
        for (let i = 0; i < aKeys.length; i += 1) {
          if (aKeys[i] !== bKeys[i]) return false;
        }
        return aKeys.every((k) => strictJsonEqual(a[k], b[k]));
      }

      return false;
    };

    const deltaChanges = (field, value) => {
      const resource = props.resource;
      const record = props.record;
      const original = resource.getValue(record, field);

      const fieldDef = props.fields?.find((f) => f.name === field);
      const isJsonField =
        fieldDef && (fieldDef.type === "object" || fieldDef.type === "json");
      const equals = isJsonField ? strictJsonEqual(original, value) : isEqual(original, value);

      if (!equals) {
        changes.value[field] = value;
      } else {
        if (typeof changes.value[field] !== "undefined") {
          delete changes.value[field];
        }
      }
    };
    const allFields = computed(() =>
      props.fields.filter((x) => x.name !== props.resource.id_field)
    );
    return {
      fieldset,
      onFieldsetChange: (value) => {
        fieldset.value = value;
      },
      displayFields,
      focusedField: computed(() => {
        let result = null;
        props.fields.forEach((field) => {
          if (field.name === props.focused) {
            result = field;
          }
        });
        return result;
      }),
      changed: (field, value) => {
        if (!live.value) {
          reset();
        }
        live.value[field] = value;
        deltaChanges(field, value);
        // console.log('form.changed', field, value, changes.value);
        for (const name of getChoiceCascadeInvalidations(
          props.fields,
          props.record,
          changes.value
        )) {
          deltaChanges(name, null);
          live.value[name] = null;
        }
        context.emit("change", changes.value);
      },
      focus: (e) => {
        context.emit("focus", e);
      },
      allFields,
      leftFields: computed(() =>
        !props.dense
          ? allFields.value.slice(0, Math.floor(allFields.value.length / 2))
          : []
      ),
      rightFields: computed(() =>
        !props.dense
          ? allFields.value.slice(
              Math.floor(allFields.value.length / 2),
              allFields.value.length
            )
          : []
      ),
      emitShowAdd: (e) => {
        context.emit("showAdd", e);
      },
      emitChangeFieldView: (field, view) => {
        context.emit("changeFieldView", field, view);
      },
    };
  },
};
</script>
