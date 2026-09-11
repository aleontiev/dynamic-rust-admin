<template>
  <!-- notice dialogRef here -->
  <q-dialog ref="dialogRef" @hide="onDialogHide" :class="{'dense': dense}">
    <q-card class="q-dialog-plugin">
      <q-card-section class="text-h6">Save View</q-card-section>
      <q-card-section v-if="viewLabel">Save your settings into {{ viewLabel }}</q-card-section>
      <q-card-section>
        <q-select behavior="menu" input-debounce="0" ref="selectRef" @keydown.enter.prevent="onEnter" new-value-mode="add" label="View name" use-input :options="options" @filter="filterFn" v-model="value" @input-value="inputChanged"/>
      </q-card-section>
      <q-card-actions align="right">
        <q-btn flat label="Cancel" @click="onCancelClick" />
        <q-btn v-if="value" flat color="primary" :label="okLabel" @click="onOKClick" />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script>
import { useDialogPluginComponent } from 'quasar'
import { useStore } from 'vuex';
import { computed, ref, onMounted, watch } from 'vue';

export default {
  props: {
    // ...your custom props
    currentView: null,
    resource: String,
    dense: Boolean
  },

  emits: [
    // need to specify some events that your
    // component will emit through useDialogPluginComponent()
    ...useDialogPluginComponent.emits
  ],

  setup (props) {
    const store = useStore();
    const database = store.$db();
    const Resource = database.model('_resources');

    const options = ref([]);
    const baseOptions = computed(() => {
      const View = Resource.find(name='views');
      return Object.entries(View.getRecords(v => v.resource === props.resource)).map(
        ([viewId, view]) => ({id: viewId, label: view.name})
      );
    });
    const filterFn = (val, update) => {
      if (val === '') {
        update(() => {
          options.value = baseOptions.value;
        })
      } else {
        update(() => {
          const needle = val.toLowerCase()
          options.value = baseOptions.value.filter(v => v.label.toLowerCase().indexOf(needle) > -1)
        });
      }
    };
    const value = ref(null);
    const input = ref(null);
    const inputChanged = (val) => {
      input.value = val;
    };
    onMounted(() => {
      options.value = baseOptions.value
      if (props.currentView) {
        value.value = {id: props.currentView.id, label: props.currentView.name, name: props.currentView.name};
      }
    });
    const okLabel = computed(() => {
      return (value.value && value.value.id) ? 'Save' : 'Add New';
    });
    const { dialogRef, onDialogHide, onDialogOK, onDialogCancel } = useDialogPluginComponent()
    // dialogRef      - Vue ref to be applied to QDialog
    // onDialogHide   - Function to be used as handler for @hide on QDialog
    // onDialogOK     - Function to call to settle dialog with "ok" outcome
    //                    example: onDialogOK() - no payload
    //                    example: onDialogOK({ /*.../* }) - with payload
    // onDialogCancel - Function to call to settle dialog with "cancel" outcome
    const viewLabel = computed(() => {
      if (!value.value && !input.value) {
        return null;
      }
      const existing = (!props.currentView || !value.value || (props.currentView.id !== value.value.id)) ? 'an existing': 'the current';
      const result = (!value.value || !value.value.id) ? (input.value ? `a new view, called "${input.value}"` : `a new view, called "${value.value}"`) : `${existing} view, called "${value.value.label ? value.value.label : value.value}"`
      if (!value.value || !value.value.id && input.value) {
        return result + ' (press Enter)';
      }
      return result;
    });
    const onEnter = (e) => {
      selectRef.value.add(input.value, false);
      selectRef.value.hidePopup();
      selectRef.value.blur();
      input.value = '';
    };
    const selectRef = ref(null);
    return {
      dialogRef,
      onDialogHide,
      onOKClick () {
        if (!input.value && !value.value) {
          return false;
        }
        // either the input value or some other value
        const name = value.value ? (
            value.value.name ? value.value.name : (
              value.value.label ? value.value.label : value.value
            )
        ) : input.value;
        if (!name) {
          return false;
        }
        const id = (!value.value || !value.value.id) ? null : value.value.id;
        onDialogOK({ name, id })
      },
      onCancelClick: onDialogCancel,
      options,
      filterFn,
      inputChanged,
      input,
      okLabel,
      value,
      viewLabel,
      onEnter,
      selectRef
    }
  }
}
</script>
