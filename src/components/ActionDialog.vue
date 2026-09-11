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
          'bg-primary': canSave,
          'bg-grey-3 text-black': dark && !canSave,
          'bg-grey-9 text-white': !dark && !canSave,
        }"
        v-close-popup
      >
        <q-icon :name="actionTodo.icon" size="sm" />
        <q-toolbar-title>
          {{ toTitleCase(actionTodo.name).replace("_", " ") }}
        </q-toolbar-title>
        <q-btn flat round dense icon="close" v-if="!saving" />
      </q-toolbar>
      <q-card-section
        :class="{ 'q-pt-none': !dense, 'q-plr-none': true, 'q-pt-xl': dense }"
        :style="{ minHeight: dense ? 'calc(100dvh - 52px)' : 'inherit' }"
      >
        <DetailForm
          inline
          :record="liveRecord"
          :key="formKey"
          :resource="actionResource"
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
            :dense="dense"
            icon="restart_alt"
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
import { reactive, computed, ref } from "vue";
import { useQuasar } from "quasar";
import { useStore } from "vuex";
import { DetailForm, IconButton, ActionBar, Filter } from ".";
import { buildAction, toTitleCase } from "../utilities";

export default {
  props: ["dense", "dark", "resource", "value", "record", "actionTodo"],
  components: {
    IconButton,
    ActionBar,
    DetailForm,
  },
  emits: ["input", "added"],
  setup(props, context) {
    const store = useStore();
    const database = store.$db();
    const Resource = database.model("_resources");
    const Action = null;
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
    const canSave = computed(() => true);
    const canDiscard = computed(
      () => live.value && Object.entries(live.value).length > 0 && !saving.value
    );
    const formKey = ref(1);
    const formResource = computed(() => {
      if (props.field) {
        return props.resource.getRelationFromField(props.field);
      }
      return props.resource;
    });
    const action = computed(() => {
      return props.actionTodo;
    });
    const actionResource = computed(() => {
      let actionItem = null;
      const $resource = action.value;
      const $fields = Object.fromEntries(
        Object.entries($resource.parameters).map(([key, value]) => {
          return [key, { ...value, ui: true }];
        })
      );
      if ($resource) {
        actionItem = new Resource({
          name: $resource.name,
          singular: $resource.name,
          name_field: $resource.name,
          fields: $fields,
        });
      }
      return actionItem;
    });

    const formFields = computed(() => {
      if (!props.fields) {
        const $resource = actionResource.value;
        if ($resource) {
          const fields = $resource.getFields()[0];
          return [fields];
        }
      }
      return props.fields;
    });

    const field = computed(() => props.field);
    const record = computed(() => props.record);
    const resource = computed(() => props.resource);
    const saving = ref(false);
    const then = () => {
      isOpen.value = false;
    };

    const save = buildAction({
      quasar: $q,
      saving,
      resource,
      data: live,
      field,
      record,
      then,
      action: action,
    });

    const isOpen = computed({
      get() {
        return props.value;
      },
      set(next) {
        context.emit("input", next);
      },
    });
    return {
      isOpen,
      formKey,
      update,
      live,
      save,
      discard,
      canSave,
      canDiscard,
      focus,
      focused,
      saving,
      formResource,
      actionResource,
      formFields,
      liveRecord: ref({}),
      toTitleCase,
    };
  },
};
</script>
