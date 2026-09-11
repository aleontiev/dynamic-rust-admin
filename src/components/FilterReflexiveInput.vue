<style lang="scss">
</style>
<template>
    <div :class="f.class" :key="index" v-for="(f, index) in filters">
      <q-select behavior="menu" :dense="dense" :dark="dark" :label="f.key ? '' : 'Choose a field'" :options="getFilteredOptions(index)" :model-value="values[index]" @update:model-value="onUpdate(index, $event)" :readonly="!editable" use-input input-debounce="0" @filter="(val, update) => onFilterOptions(index, val, update)">
        <template v-slot:selected-item="scope">
          <span v-if="scope.opt" style="white-space: nowrap">
            <q-icon v-if="f.resource && f.resource.getFieldIcon(scope.opt.value)" :name="f.resource.getFieldIcon(scope.opt.value)" size="xs" class="q-mr-xs q-mb-xs"/>
            <span>{{ scope.opt.label }}</span>
          </span>
        </template>
        <template v-slot:option="scope">
          <q-item v-bind="scope.itemProps">
            <q-item-section avatar>
              <q-icon v-if="scope.opt && f.resource && f.resource.getFieldIcon(scope.opt.value)" :name="f.resource.getFieldIcon(scope.opt.value)"/>
            </q-item-section>
            <q-item-section>
              <q-item-label>{{ scope.opt ? scope.opt.label : '' }}</q-item-label>
            </q-item-section>
          </q-item>
        </template>
      </q-select>
    </div>
</template>

<script>
import { computed, ref } from 'vue';
import { makeOptions } from '../utilities';
export default {
  props: ['dark', 'dense', 'resource', 'value', 'editable'],
  emits: ['update'],
  setup (props, context) {
    const parts = computed(() => props.value ? props.value.split('.') : [null])
    const filters = computed(() => {
      let $resource = props.resource;
      const $parts = parts.value;
      const result = $parts.map((part, index) => {
        const $previous = $resource;
        const field = $resource ? $resource.fields[part] : null;
        if ($resource) {
          try {
            $resource = $resource.getRelationFromField(part);
          } catch (error) {
            $resource = null;
          }
        }
        let className;
        className = $parts.length > 2 ? 'col-6' : 'col';
        if (index === $parts.length - 1 && $parts.length % 2) {
          className = 'col-12';
        }
        return {'class': className, key: part, resource: $previous, field};
      });
      return result;
    });
    const options = computed(() => {
      const result = [];
      const $parts = parts.value;
      let $field = null;
      let $resource = props.resource;
      $parts.forEach((part, index) => {
        let partOptions = [];
        if ($resource) {
          partOptions = makeOptions($resource.getFields({ filterable: true }, ['name_field', 'name']));
        }
        result.push(partOptions);

        if (part && part[0] !== '$') {
          // get next $field / $resource
          $field = $resource.fields[part];
          try {
            $resource = $resource.getRelationFromField(part);
          } catch (error) {
            $resource = null;
          }
        }
      });
      return result;
    });
    const pickOption = (options, name) => {
      let result = null;
      options.forEach(option => {
        if (!result && option.value === name) {
          result = option;
        }
      });
      return result;
    };
    const values = computed(() => options.value.map((suboptions, index) => pickOption(suboptions, parts.value[index])));
    const onUpdate = (index, update) => {
      const $update = (update.label && update.value) ? update.value : update;
      let $parts = [...parts.value];
      $parts[index] = $update;
      let len = $parts.length;
      if (index < len - 1) {
        // remove anything that used to follow
        // if a part other than the last part is updated
        $parts = $parts.slice(0, index + 1);
      }
      context.emit('update', $parts.length ? $parts.join('.') : null);
    };

    const filteredOptions = ref({});
    const onFilterOptions = (index, val, update) => {
      update(() => {
        const needle = (val || "").toLowerCase();
        if (!needle) {
          filteredOptions.value = { ...filteredOptions.value, [index]: null };
        } else {
          filteredOptions.value = {
            ...filteredOptions.value,
            [index]: options.value[index].filter(
              (opt) => opt.label.toLowerCase().indexOf(needle) >= 0
            ),
          };
        }
      });
    };
    const getFilteredOptions = (index) => {
      return filteredOptions.value[index] || options.value[index];
    };
    return {
      filters,
      options,
      onUpdate,
      values,
      onFilterOptions,
      getFilteredOptions,
    }
  }
}
</script>
