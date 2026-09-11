<style lang="scss">
.ChangeField {
  padding-top: 20px;
  padding-left: 0px;
  padding-right: 0px;
  .q-field .q-field__native {
    white-space: nowrap;
  }
}
</style>
<template>
  <q-item :class="{'ChangeField': true, 'dense': dense}">
    <div class="column full-width no-wrap">
      <div class="row full-width" v-if="!fieldName">
        <q-item-section>
          <div class="row FieldSelect full-width">
            <q-select :readonly="disable" class="full-width" :dense="dense" :dark="dark" label="Choose a field" :options="options" :model-value="fieldName" @update:model-value="onSelect(index, $event)">
                <template v-slot:option="scope">
                  <q-item v-bind="scope.itemProps">
                    <q-item-section avatar>
                      <q-icon :name="resource.getFieldIcon(scope.opt.value)"/>
                    </q-item-section>
                    <q-item-section>
                      <q-item-label>{{ scope.opt.label }}</q-item-label>
                    </q-item-section>
                  </q-item>
                </template>
            </q-select>
          </div>
        </q-item-section>
        <q-item-section side v-if="!disable">
          <q-btn flat round icon="close" @click="$emit('delete')" color="grey-7"/>
        </q-item-section>
      </div>
      <div v-else class="row full-width">
        <q-item-section class="full-width">
          <FieldItem class="row full-width" :dark="dark" :dense="dense" :field="field" :resource="resource" :changes="record" :record="record" @update="onUpdate" :visible="true" :inline="true" :editing="true" :readonly="disable"/>
        </q-item-section>
        <q-item-section side v-if="!disable">
          <q-btn flat round icon="close" @click="$emit('delete')" color="grey-7"/>
        </q-item-section>
      </div>
    </div>
  </q-item>
</template>

<script>
import { computed, ref } from 'vue';
import FieldItem from './FieldItem';
export default {
  props: {
    'dark': Boolean, 'dense': Boolean, 'resource': Object, 'value': null, 'disable': Boolean
  },
  emits: ['update', 'delete'],
  components: {
    FieldItem
  },
  setup (props, context) {
    const options = computed(() => props.resource.getFields({ write: true }).map(f => ({label: f.label, value: f.name})));
    const field = computed(() => {
      const resource = props.resource;
      const $fieldName = fieldName.value;
      return $fieldName ? resource.getField($fieldName) : null;
    });
    const fieldName = computed(() => {
      const value = props.value;
      return (value && Object.keys(value).length) ? Object.keys(value)[0] : null;
    });
    const fieldValue = computed(() => (props.value && fieldName.value) ? props.value[fieldName.value] : null);
    const record = computed(() => {
      if (!fieldName.value) {
        return {};
      }
      return {
        [fieldName.value]: fieldValue.value
      };
    });
    const onSelect = (index, update) => {
      const $update = (update.label && update.value) ? update.value : update;
      context.emit('update', {[$update]: null});
    };
    const onUpdate = update => {
      const $update = update;
      if (fieldName.value) {
        const newValue = {[fieldName.value]: $update};
        context.emit('update', newValue);
      }
    };

    return {
      options,
      onSelect,
      onUpdate,
      fieldName,
      fieldValue,
      record,
      field,
    }
  }
}
</script>
