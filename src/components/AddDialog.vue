<template>
  <q-dialog
    v-model="isOpen"
    :class="{ dense: dense, 'right large': true, fullheight: true }"
    :maximized="dense"
    transition-show="slide-up"
    transition-hide="slide-down"
    position="bottom"
  >
    <q-card :class="{ 'overflow-hidden': focused }">
      <q-toolbar
        style="z-index: 100; top: 0px"
        :class="{
          sticky: !dense,
          fixed: dense,
          'bg-primary': canSave || saving,
          'bg-grey-3 text-black': dark && !(canSave || saving),
          'bg-grey-9 text-white': !dark && !(canSave || saving),
        }"
        v-close-popup
      >
        <q-icon name="add" size="sm" />
        <q-toolbar-title>
          {{ title }}
        </q-toolbar-title>
        <q-btn flat round dense icon="close" v-if="!saving" />
      </q-toolbar>
      <q-card-section
        :class="{'q-pt-none': !dense, 'q-plr-none': true, 'q-pt-xl': dense}"
        :style="{ minHeight: dense ? 'calc(100dvh - 52px)' : 'inherit' }"
      >
        <DetailForm
          inline
          :record="liveRecord"
          :key="formKey"
          :resource="formResource"
          :fields="formFields"
          mode="create"
          :focused="focused"
          :dark="dark"
          :dense="dense"
          fullWidth
          :changes="live"
          :editing="true"
          :saving="saving"
          @change="update"
          @focus="focus"
        />
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
            icon="close"
            label="Clear"
            v-if="canDiscard"
            @click="discard"
          />
          <IconButton
            :dense="dense"
            icon="done"
            label="Save"
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
import { computed, ref } from "vue";
import { useQuasar } from "quasar";
import { DetailForm, IconButton, ActionBar } from ".";
import { buildAdd } from "../utilities";

export default {
  props: ["dense", "dark", "resource", "fields", "value", "record", "field"],
  components: {
    IconButton,
    ActionBar,
    DetailForm,
  },
  emits: ["input", "added"],
  setup(props, context) {
    const live = ref({});
    const $q = useQuasar();
    const focused = ref(null);
    const focus = (field) => {
      focused.value = field;
    };
    const update = (changes) => {
      live.value = changes;
    };
    const discard = () => {
      update({});
      formKey.value = formKey.value + 1;
    };
    const canSave = computed(
      () => live.value && Object.entries(live.value).length > 0 && !saving.value
    );
    const canDiscard = canSave;
    const formKey = ref(1);
    const formResource = computed(() => {
      if (props.field) {
        return props.resource.getRelationFromField(props.field);
      }
      return props.resource;
    });
    const formFields = computed(() => {
      if (!props.fields) {
        const $resource = formResource.value;
        if ($resource) {
          const fields = $resource.getFields(null, [
            "required",
            "name_field",
            "section",
          ]);
          if (props.field) {
            // TODO: use metadata about inverse relations instead of relying on this
            return fields.filter(
              (field) => field.name !== props.resource.singular
            );
          }
          return fields;
        }
      }
      return props.fields;
    });

    const field = computed(() => props.field);
    const record = computed(() => props.record);
    const resource = computed(() => props.resource);
    const saving = ref(false);
    const then = (newRecord) => {
      context.emit("added", newRecord);
      isOpen.value = false;
    };
    const save = buildAdd({
      data: live,
      quasar: $q,
      saving,
      resource,
      field,
      record,
      then,
    });
    const isOpen = computed({
      get() {
        return props.value;
      },
      set(next) {
        context.emit("input", next);
      },
    });
    const title = computed(() => {
      return `New ${formResource.value.label}`;
    });
    const liveRecord = ref({});
    return {
      isOpen,
      formKey,
      update,
      title,
      live,
      save,
      discard,
      canSave,
      canDiscard,
      focus,
      focused,
      saving,
      formResource,
      formFields,
      liveRecord
    };
  },
};
</script>
