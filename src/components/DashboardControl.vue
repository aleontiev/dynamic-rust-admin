<style lang="scss">
</style>
<template>
  <span>
    <q-chip v-if="editing" outline clickable :icon="icon" :color="(changed && !selected) ? 'primary': null" :class="{'q-ma-none q-mr-sm': true, 'bg-primary': selected}" size="18px" :dark="dark" @click="click" >
      {{ label }}
    </q-chip>
    <q-select
      behavior="menu"
      ref="menu"
      v-if="inputType === 'select'"
      @focus="focus"
      @blur="blur"
      outlined rounded
      :multiple="multiple"
      use-input
      :use-chips="multiple"
      @filter="filter"
      v-model="value"
      :model-value="value"
      @update:model-value="valueChanged"
      :options="options"
      clearable
      :label="label"
      :dark="dark"
      :dense="true"
      :class="{'align-middle q-mr-sm inline-flex': true, 'display-none': editing}"
    >
      <template v-slot:prepend>
        <q-icon :name="icon" />
      </template>
    </q-select>
    <q-input
      outlined rounded
      v-else-if="inputType === 'text'"
      @focus="focus"
      @blur="blur"
      :label="label"
      :dark="dark"
      :dense="true"
      debounce="500"
      :model-value="value"
      @update:model-value="valueChanged"
      clearable
      :class="{'align-middle q-mr-sm inline-flex': true, 'display-none': editing}"
    >
      <template v-slot:prepend>
        <q-icon :name="icon" />
      </template>
    </q-input>
  </span>
</template>

<script>
import { useQuasar } from 'quasar';
import { onMounted, watch, computed, ref } from 'vue';
import { useStore } from 'vuex';
import { OPERATORS, OPERATOR_MAP, operatorMatches } from '../models/resource';
import { makeOptions, findResource } from '../utilities';

export default {
  props: {
    'dark': Boolean,
    'dense': Boolean,
    'changed': Boolean,
    'selected': Boolean,
    'editing': Boolean,
    'control': null,
  },
  emits: ['remove', 'select', 'change', 'focus', 'blur'],
  setup (props, context) {
    const store = useStore();
    const database = store.$db()
    const Resource = database.model('_resources')
    const click = () => {
      if (props.editing) {
        context.emit('select');
      }
    };
    const mainType = computed(() => (props.control && props.control.type) ? props.control.type.split('.')[0] : null);
    const subType = computed(() => (props.control && props.control.type) ? props.control.type.split('.').slice(1).join('.') : null);

    const options = computed(() => {
      const $type = mainType.value;
      const $subtype = subType.value;
      if ($type === 'resource') {
        return relatedOptions.value;
      } else if ($type === 'field') {
        return fieldOptions.value;
      } else if ($type === 'simple') {
        return simpleOptions.value;
      }
      return [];
    });
    const simpleOptions = ref([]);
    const fieldOptions = ref([]);
    const relatedOptions = ref([]);
    const filter = async (input, done) => {
      if (mainType.value === 'resource') {
        if (!input) {
          if (done) {
            done(() => {
              relatedOptions.value = []
            });
          } else {
            relatedOptions.value = []
          }
          return;
        }
        const resource = Resource.find(name=subType.value);
        const newOptions = await findResource(resource, input);
        if (done) {
          done(() => {
            relatedOptions.value = newOptions;
          });
        } else {
          relatedOptions.value = newOptions;
        }
      } else if (mainType.value === 'field') {
        const field = Resource.getFieldById(subType.value);
        let base = field.choices.map(({id, label}) => ({value: id, label}));
        if (input) {
          base = base.filter(choice => choice.label.toLowerCase().indexOf(input.toLowerCase()) >= 0 || choice.label.indexOf(input) >= 0)
        }
        if (done) {
          done(() => {
            fieldOptions.value = base;
          });
        } else {
          fieldOptions.value = base;
        }
      } else if (mainType.value === 'simple') {
        let base = nextSimpleMenu.value;
        if (!base) {
          base = lastMenu.value;
        }
        if (input && base) {
          base = base.filter(choice => choice.label.toLowerCase().indexOf(input.toLowerCase()) >= 0 || choice.label.indexOf(input) >= 0);
        }
        if (done) {
          done(() => {
            simpleOptions.value = base;
          });
        } else {
          simpleOptions.value = base;
        }
      }
    };
    const operatorOptions = makeOptions(OPERATORS);
    const lastMenu = ref(null);
    const nextSimpleMenu = computed(() => {
      if (mainType.value !== 'simple' || subType.value === 'text' || subType.value === 'number') {
        return null;
      }
      const previous = previousSelections.value;
      if (!previous.length) {
        const pseudofield = {type: subType.value};
        return operatorOptions.filter(operator => operatorMatches(operator, pseudofield, true));
      }
      if (previous.length > 1) {
        // already has 2nd selection
        return null;
      }
      if (previous[0]) {
        const operator = previous[0].id;
        const operatorLabel = previous[0].label;
        const field = OPERATOR_MAP[operator].field;
        return field ? makeOptions(field.choices).map(choice => ({...choice, label: (subType.value === 'number' || ['$last', '$next'].indexOf(operator) >= 0) ? `${operatorLabel} ${choice.label}` : choice.label, operator })) : null;
      }
      return null;
    });
    const previousSelections = ref([]);

    onMounted(() => filter());
    const value = ref(null);
    watch(() => [mainType.value, subType.value], () => filter());
    const inputType = computed(() => {
      if (mainType.value === 'simple' && (subType.value === 'text' || subType.value === 'number')) {
        return 'text';
      }
      return 'select';
    });
    const multiple = computed(() => ['resource', 'field'].includes(mainType.value));
    const menu = ref(null);
    const valueChanged = (next) => {
      value.value = next;
      if (mainType.value === 'simple' && subType.value !== 'text') {
        if (!next) {
          previousSelections.value = [];
        } else {
          previousSelections.value.push(next);
        }
        if (nextSimpleMenu.value && next) {
          // repop
          lastMenu.value = nextSimpleMenu.value;
          menu.value.showPopup();
        } else {
          context.emit('change', next);
        }
      } else {
        context.emit('change', next);
      }
    };
    const focus = () => context.emit('focus');
    const blur = () => context.emit('blur');
    return {
      label: props.control.name,
      icon: props.control.icon,
      focus,
      blur,
      menu,
      valueChanged,
      options,
      inputType,
      multiple,
      filter,
      click,
      value
    }
  }
}
</script>
