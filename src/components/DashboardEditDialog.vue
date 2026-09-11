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
          :key="record.id"
          :resource="resource"
          :fields="formFields"
          :focused="focused"
          :dark="dark"
          :dense="dense"
          fullWidth
          :changes="changes"
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
import { computed, ref } from "vue";
import { useStore } from "vuex";
import { useQuasar } from "quasar";
import { DetailForm, IconButton, ActionBar } from ".";

export default {
  props: ["dense", "dark", "fields", "value", "record", "changes"],
  components: {
    IconButton,
    ActionBar,
    DetailForm,
  },
  emits: ["input", "save", "update"],
  setup(props, context) {
    const store = useStore();
    const database = store.$db();
    const Resource = database.model("_resources");
    const $q = useQuasar();
    const focused = ref(null);
    const focus = (field) => {
      focused.value = field;
    };
    const update = (changes) => {
      context.emit("update", changes);
    };
    const discard = () => {
      update({});
    };
    const canSave = computed(
      () =>
        props.changes &&
        Object.entries(props.changes).length > 0 &&
        !saving.value
    );
    const canDiscard = canSave;
    const formFields = computed(() => {
      let result = props.fields;
      if (!props.fields) {
        const $resource = resource.value;
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

    const resource = computed(() => Resource.find("dashboards"));
    const saving = ref(false);
    const save = () => {
      context.emit("input", false);
      context.emit("save");
    };
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
      update,
      title: "Dashboard Settings",
      save,
      discard,
      canSave,
      canDiscard,
      focus,
      focused,
      saving,
      resource,
      formFields,
    };
  },
};
</script>
