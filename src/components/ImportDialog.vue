<template>
  <q-dialog
    v-model="isOpen"
    :class="{ dense: dense, 'right large': true, fullheight: true }"
    :maximized="dense"
    transition-show="slide-up"
    transition-hide="slide-down"
    position="bottom"
  >
    <q-card>
      <q-toolbar
        style="z-index: 100; top: 0px"
        :class="{
          sticky: !dense,
          fixed: dense,
          'bg-primary': canStart,
          'text-black': dark && !canStart,
          'text-white': !dark || canStart,
          'bg-grey-1': dark && !canStart,
          'bg-grey-9': !dark && !canStart,
        }"
        v-close-popup
      >
        <q-icon name="mdi-import" size="sm" />
        <q-toolbar-title>
          {{ title }}
        </q-toolbar-title>
        <q-btn flat round dense icon="close" />
      </q-toolbar>
      <q-card-section
        :class="{
          'q-pt-none': !dense || !record,
          'q-plr-none': true,
          'q-pt-xl': dense,
        }"
        :style="{ minHeight: dense ? 'calc(100dvh)' : 'calc(100% - 50px)' }"
      >
        <div
          v-if="record"
          class="absolute q-pa-md"
          :style="{
            height: '40px',
            right: '0px',
            top: dense ? '45px' : '-10px',
          }"
        >
          <q-btn round flat icon="close" size="md" @click="onClose" />
        </div>
        <div v-if="record">
          <div
            :class="{
              'row full-width q-pa-md q-mt-sm': true,
              dark: dark,
              'bg-white': !dark,
              'bg-dark': dark,
              dense: dense,
            }"
            style="top: 56px; z-index: 5"
          >
            <div class="column col-xs col-auto q-mr-sm">
              <q-icon name="mdi-import" size="md" color="primary" />
            </div>
            <div
              :class="{ column: true, 'col-xs-10': dense, 'col-xs-11': !dense }"
            >
              <div class="full-width clickable q-mb-md text-primary">CSV</div>
              <div
                style="min-height: 120px"
                :class="{
                  dark: dark,
                  'border-file primary q-pa-md row justify-center items-center': true,
                }"
              >
                <div
                  :class="{
                    'items-center justify-center column row': true,
                    'text-grey-7': !dark,
                    'text-grey-5': dark,
                  }"
                >
                  <q-icon
                    name="mdi-file-table-outline"
                    class="q-mb-xs"
                    size="md"
                  />
                  <span>{{ importFields.length }} x {{ numRows }}</span>
                </div>
              </div>
              <div
                class="row full-width q-pt-md q-pl-none q-pr-none q-pb-none text-h7 text-grey-7"
              >
                Please map each column in the CSV:<br />
                To ignore the column, choose "Ignore"
              </div>
            </div>
          </div>
          <DetailForm
            inline
            embedded
            dynamicIcons
            :record="record"
            :resource="importResource"
            :fields="importFields"
            :focused="focused"
            :dark="dark"
            :dense="dense"
            mode="create"
            fullWidth
            :changes="changes"
            :editing="true"
            :saving="saving"
            @change="onUpdate"
            @focus="onFocus"
          />
        </div>
        <div
          v-else
          :class="{
            'q-pa-md row column items-center justify-center absolute full-height full-width': true,
            'text-red': !!fileError && !dragging,
            'text-black': dark && dragging,
            'text-white': !dark && dragging,
            'bg-primary': dragging,
          }"
          v-bind="getRootProps()"
          style="overflow: hidden"
        >
          <q-icon size="10rem" name="upload_file" />
          <div class="text-h6">Add a CSV</div>
          <input v-bind="getInputProps()" />
          <div
            v-if="fileError && !dragging"
            class="text-red-5 text-h6 q-pb-xl absolute row items-center justify-center"
            style="bottom: 0px; left: 0px; right: 0px"
          >
            {{ fileError }}
          </div>
        </div>
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
            icon="restart_alt"
            label="Reset"
            v-if="canDiscard"
            @click="onDiscard"
          />
          <IconButton
            :dense="dense"
            icon="done"
            label="Start"
            v-if="canStart"
            @click="onStart"
            color="primary"
          />
        </ActionBar>
      </div>
    </q-card>
  </q-dialog>
</template>

<script>
import { useQuasar } from "quasar";
import { watch, ref, computed } from "vue";
import { useStore } from "vuex";
import { IconButton, DetailForm, ActionBar } from ".";
import { useDropzone } from "vue3-dropzone";
import { getCurrentURL, getErrorMessage } from "../utilities";

export default {
  props: ["dense", "dark", "resource", "value"],
  components: {
    ActionBar,
    IconButton,
    DetailForm,
  },
  emits: ["input"],
  setup(props, context) {
    const store = useStore();
    const database = store.$db();
    const Resource = database.model("_resources");
    const $q = useQuasar();

    // state
    const fileError = ref(null);
    const numRows = ref(null);
    const dragging = ref(false);
    const columns = ref(null);
    const record = ref(null);
    const changes = ref({});
    const saving = ref(false);
    const focused = ref(null);
    const file = ref(null);

    // methods
    const getColumnName = (name) => {
      if (
        name.substr(0, 1) === '"' &&
        name.substr(name.length - 1, 1) === '"'
      ) {
        return name.substr(1, name.length - 2);
      }
      return name.trim();
    };
    const reset = (cols, args = null) => {
      columns.value = cols;
      file.value = args && args.file ? args.file : null;
      if (cols && cols.length) {
        const $record = {};
        cols.forEach((col) => {
          const initialValue = !!props.resource.fields[col] ? col : null;
          $record[col] = initialValue;
        });
        numRows.value = args ? args.numRows : null;
        record.value = $record;
      } else {
        numRows.value = null;
        record.value = null;
      }
      changes.value = {};
    };
    const close = () => {
      if (!saving.value) {
        isOpen.value = false;
      }
    };
    const onClose = () => {
      if (Object.keys(changes.value).length) {
        $q.dialog({
          title: "Please Confirm",
          class: props.dense ? "dense" : "",
          message: `Are you sure you want to discard this file? Your mapping progress will be lost!`,
          ok: "Yes",
          cancel: "No",
        }).onOk(() => reset());
      } else {
        reset();
      }
    };
    const onDrop = (acceptFiles, rejectReasons) => {
      if (rejectReasons && rejectReasons.length) {
        fileError.value = getErrorMessage(rejectReasons);
      } else {
        const reader = new FileReader();
        const csvFile = acceptFiles[0];
        reader.readAsBinaryString(csvFile);
        reader.onloadend = (evt) => {
          const result = evt.currentTarget.result;
          const rows = result.split("\n");
          const numRows = rows.filter((x) => !!x).length - 1;
          const firstRow = rows[0];
          if (firstRow) {
            const cols = firstRow.split(",").map((c) => getColumnName(c));
            const colSet = new Set(cols);
            if (colSet.size === cols.length) {
              fileError.value = null;
              reset(cols, { file: csvFile, numRows });
            } else {
              fileError.value = "Repeated column in CSV header";
              reset();
            }
          }
        };
      }
      dragging.value = false;
    };
    const onDragEnter = () => {
      dragging.value = true;
    };
    const onDiscard = () => {
      const $changes = changes.value;
      Object.keys($changes).forEach((key) => {
        delete $changes[key];
      });
    };
    const onStart = () => {
      let classes = "";
      if (props.dense) {
        classes = `${classes} dense`;
      }
      const verb = "Import";
      const DocumentModel = Resource.find("documents");
      const ImportModel = Resource.find("imports");
      if (!DocumentModel || !ImportModel) {
        $q.notify({
          timeouit: 0,
          type: "negative",
          color: "red",
          message: `${verb} failed, please logout and log back in`,
          icon: "done",
          textColor: "white",
          noDismiss: true,
          persistent: true,
          classes: "full-width",
          multiline: false,
          actions: [
            {
              icon: "close",
              color: "white",
            },
          ],
        });
        return;
      }
      $q.dialog({
        message: `Are you sure you want to ${verb} ${numRows.value} ${props.resource.name}? The import will process on the server and you will receive email updates.`,
        title: "Please Confirm",
        icon: "check_box",
        persistent: true,
        cancel: "No",
        ok: "Yes",
        class: classes,
        color: "primary",
      }).onOk(async () => {
        let documentResponse;
        try {
          saving.value = true;
          const header = live.value;
          documentResponse = await DocumentModel.postAPI({
            data: { file: file.value },
          });
          const documentId = documentResponse.data.document.id;
          const importResponse = await ImportModel.postAPI({
            data: {
              header,
              request_url: getCurrentURL(),
              document: documentId,
            },
          });
          const importData = importResponse.data.import;
          const message = `Look for the email "${importData.name}" for details`;
          $q.notify({
            type: "positive",
            timeout: 5000,
            color: "primary",
            message,
            icon: "done",
            textColor: "white",
            noDismiss: false,
            persistent: true,
            classes: "full-width",
            multiline: false,
            actions: [
              {
                icon: "close",
                color: "white",
              },
            ],
          });
          reset();
          saving.value = false;

          close();
        } catch (exception) {
          $q.notify({
            timeouit: 0,
            type: "negative",
            color: "red",
            message: `${verb} failed: ${getErrorMessage(exception)}`,
            icon: "done",
            textColor: "white",
            noDismiss: true,
            persistent: true,
            classes: "full-width",
            multiline: false,
            actions: [
              {
                icon: "close",
                color: "white",
              },
            ],
          });
          if (documentResponse) {
            // remove a document if an error happened during import
            await DocumentModel.deleteAPI({
              id: documentResponse.data.document.id,
            });
          }
          saving.value = false;
        }
      });
    };
    const onDragLeave = () => {
      dragging.value = false;
    };
    const onFocus = (field) => {
      focused.value = field;
    };
    const onUpdate = (ch) => {
      changes.value = ch;
    };
    const getChoices = () => {
      const base = props.resource?.getFieldOptions({ filterable: true }, [
        "name",
      ]);
      const result = [{ label: "Ignore", value: "_ignore", id: "_ignore" }];
      result.push(...base);
      return result;
    };
    // properties
    const live = computed(() => {
      const $changes = changes.value || {};
      const $record = record.value;
      if (!$record) {
        return null;
      }
      return Object.fromEntries(
        Object.keys($record).map((key) => [
          key,
          typeof $changes[key] !== "undefined" ? $changes[key] : $record[key],
        ])
      );
    });
    const canStart = computed(() => {
      let $live = live.value;
      $live = $live ? Object.values($live) : $live;
      return $live
        ? $live.every((x) => x) && !$live.every((x) => x === "_ignore")
        : false;
    });
    const canDiscard = computed(
      () => changes.value && Object.keys(changes.value).length
    );
    const importResource = computed(() => {
      if (!columns.value) {
        return null;
      }
      const fieldNames = [];
      const fields = columns.value
        .map((column) => {
          fieldNames.push(column);
          return {
            label: column,
            name: column,
            type: "text",
            required: false,
            null: true,
            ui: true,
            hidden: false,
            choices: getChoices,
            reference: () => props.resource,
            description: `Target field for ${column}`,
          };
        })
        .reduce((acc, next) => {
          const copy = { ...next };
          if (copy.name) {
            delete copy.name;
          }
          acc[next.name] = copy;
          return acc;
        }, {});
      const sections = [
        {
          name: "fields",
          fields: fieldNames,
        },
      ];
      return new Resource({
        name: "_import",
        singular: "_import",
        fields,
        sections,
      });
    });
    const importFields = computed(() =>
      importResource.value?.getFields({ hidden: false }, ["section"])
    );
    const isOpen = computed({
      get() {
        return props.value;
      },
      set(next) {
        context.emit("input", next);
      },
    });
    const title = computed(() => {
      return `Import ${props.resource.title}`;
    });

    // hooks
    watch(
      () => props.resource,
      () => reset()
    );
    const { getRootProps, getInputProps } = useDropzone({
      onDrop,
      onDragEnter,
      onDragLeave,
      accept: "text/csv",
    });
    return {
      isOpen,
      title,
      fileError,
      dragging,
      record,
      reset,
      canDiscard,
      canStart,
      onDiscard,
      onStart,
      onFocus,
      onUpdate,
      changes,
      onClose,
      saving,
      importResource,
      importFields,
      numRows,
      focused,
      getRootProps,
      getInputProps,
    };
  },
};
</script>
