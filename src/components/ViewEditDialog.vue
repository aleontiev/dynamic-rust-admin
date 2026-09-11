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
        <q-icon name="edit" size="sm" />
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
          mode="dialog"
          :record="record"
          :key="formKey"
          :resource="formResource"
          :fields="formFields"
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
            label="Cancel"
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
import { useStore } from "vuex";
import { useQuasar } from "quasar";
import { buildSave } from "../utilities";
import { DetailForm, IconButton, ActionBar } from ".";

export default {
  props: ["dense", "dark", "fields", "value", "record"],
  components: {
    IconButton,
    ActionBar,
    DetailForm,
  },
  emits: ["input", "saved"],
  setup(props, context) {
    const store = useStore();
    const database = store.$db();
    const Resource = database.model("_resources");
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
      return resource.value;
    });
    const formFields = computed(() => {
      let result = props.fields;
      if (!props.fields) {
        const $resource = formResource.value;
        if ($resource) {
          const fields = $resource.getFields(null, [
            "required",
            "name_field",
            "section",
          ]);
          result = fields;
        }
      }
      // hide data and resource fields (implicitly editable only)
      return result.filter((f) => f.name !== "data" && f.name !== "resource");
    });

    const record = computed(() => props.record);
    const resource = computed(() => Resource.find((name = "views")));
    const saving = ref(false);
    const then = () => {
      isOpen.value = false;
      context.emit("saved");
    };
    const save = buildSave({
      changes: live,
      quasar: $q,
      saving,
      resource,
      record,
      then,
      updateLocal: true,
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
      title: computed(() => {
        return "Update View";
      }),
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
    };
  },
};
</script>
