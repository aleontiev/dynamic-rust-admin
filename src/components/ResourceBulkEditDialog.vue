<template>
  <q-dialog
    v-model="isOpen"
    :class="{ dense: dense, 'large right': true }"
    :maximized="dense"
    transition-show="slide-up"
    transition-hide="slide-down"
    position="bottom"
    :persistent="saving"
  >
    <q-card>
      <q-toolbar
        style="z-index: 11; top: 0px"
        :class="{
          sticky: !dense,
          fixed: dense,
          'bg-primary': saving,
          'bg-grey-3 text-black': dark && !saving,
          'bg-grey-9 text-white': !dark && !saving,
        }"
        @click="close"
      >
        <q-icon name="edit" size="sm" />
        <q-toolbar-title>
          {{ title }}
        </q-toolbar-title>
        <q-btn flat round dense icon="close" v-if="!saving" />
      </q-toolbar>
      <q-card-section
        :class="{ 'q-pb-xxl q-mb-xl': dense, 'q-pb-xl q-mb-lg': !dense }"
        :style="{ minHeight: dense ? 'calc(100dvh - 52px)' : 'inherit' }"
      >
        <div :class="{ 'text-h7 text-bold': true, 'q-pt-xl': dense }">
          {{ label }}
        </div>
        <q-separator v-if="false && label" class="q-mt-sm" />
        <q-list>
          <ChangeField
            :disable="saving || saved"
            :key="index"
            v-for="(f, index) in live"
            :dark="dark"
            :dense="dense"
            :resource="resource"
            :value="f"
            @update="onChangeUpdate(index, $event)"
            @delete="onChangeDelete(index)"
          />
        </q-list>
        <div v-if="(saving || saved) && progress" class="text-h7 text-bold q-mt-lg">
          Results: {{ "(" + parseInt(100 * progress) + "%)" }}
        </div>
        <ProgressBar
          :cancel="cancel"
          :value="progress"
          v-if="(saving || saved) && progress"
          size="2px"
          className="q-mt-sm q-mb-sm"
        />
        <q-list v-if="saving || saved">
          <q-expansion-item
            v-if="savedRecords.length"
            :label="savedRecords.length + ' saved'"
            icon="check_box"
            :header-class="['text-h7', 'text-primary']"
          >
            <q-list>
              <q-item v-for="(record, index) in savedRecords" :key="index">
                <PageLink :resource="resource" :record="record" unstyled />
              </q-item>
            </q-list>
          </q-expansion-item>
          <q-expansion-item
            v-if="unprocessed.length"
            :header-class="['text-h7', 'text-grey-7']"
            icon="close"
            :label="unprocessed.length + ' unprocessed'"
          >
            <q-list>
              <q-item v-for="(record, index) in unprocessed" :key="index">
                <PageLink :resource="resource" :record="record" unstyled />
              </q-item>
            </q-list>
          </q-expansion-item>
          <q-expansion-item
            v-if="errors.length"
            :label="errors.length + ' errors'"
            icon="warning"
            :header-class="['text-h7', 'text-deep-orange']"
          >
            <q-list>
              <q-item v-for="(error, index) in errors" :key="index">
                <q-item-section>
                  <PageLink
                    :resource="resource"
                    :record="error.record"
                    unstyled
                  />
                </q-item-section>
                <q-item-section class="text-deep-orange">
                  {{ formatError(error.error) }}
                </q-item-section>
              </q-item>
            </q-list>
          </q-expansion-item>
        </q-list>
        <q-btn
          v-if="canAddChange"
          label="Add Change"
          flat
          rounded
          icon="add"
          class="q-mt-lg"
          style="float: right"
          @click="addChange"
        />
      </q-card-section>
      <div
        v-if="saving || saved || canDiscard || canClear || canSave"
        style="z-index: 11"
        :class="{
          'absolute-bottom full-width bottom-bar': true,
          sticky: !dense,
          fixed: dense,
        }"
      >
        <ActionBar :dark="dark" right>
          <IconButton
            left
            :dense="dense"
            icon="close"
            label="Cancel"
            v-if="canDiscard && !saved"
            @click="discard"
          />
          <IconButton
            :dense="dense"
            icon="restart_alt"
            label="Clear"
            @click="clear"
            v-if="!saving && !saved && canClear"
          />
          <IconButton
            :dense="dense"
            icon="restart_alt"
            label="Reset"
            @click="discard"
            v-if="saved"
          />
          <IconButton
            :dense="dense"
            icon="done"
            label="Save"
            v-if="!saving && !saved && canSave"
            @click="save"
            color="primary"
          />
        </ActionBar>
      </div>
    </q-card>
  </q-dialog>
</template>

<script>
import { watch, computed, ref } from "vue";
import { useQuasar } from "quasar";
import { IconButton, ProgressBar, ActionBar, ChangeField } from ".";
import PageLink from "./PageLink";
import YAML from "json-to-pretty-yaml";
import { getCurrentURL, getErrorMessage } from "../utilities";
import api from "../api";

export default {
  props: ["dense", "dark", "resource", "rows", "value", "loaded", "total"],
  components: {
    PageLink,
    ProgressBar,
    IconButton,
    ActionBar,
    ChangeField,
  },
  emits: ["updated", "input"],
  setup(props, context) {
    const live = ref([]);

    const saving = ref(false);
    const saved = ref(false);
    const cancel = ref(false);
    const canceledAt = ref(null);
    const progress = ref(null);
    const savedRecords = ref([]);
    const errors = ref([]);
    const quasar = useQuasar();
    const hasChanges = computed(() => numChanges.value > 0);
    const numRows = computed(() => (props.rows ? props.rows.length : 0));
    const numChanges = computed(() =>
      live.value
        ? live.value.filter((x) => Object.keys(x).length > 0).length
        : 0
    );
    // watch resource, reset
    const reset = () => {
      resourceName.value = props.resource.name;
      if (saving.value) {
        let classes = "";
        if (props.dense) {
          classes = `${classes} dense`;
        }
        quasar
          .dialog({
            title: "Please Confirm",
            class: classes,
            message:
              "Are you sure you want to cancel? Any saved changes will not be rolled back",
            ok: "Yes",
            cancel: "No",
          })
          .onOk(() => {
            cancel.value = true;
          });
      } else {
        saving.value = false;
        saved.value = false;
        cancel.value = false;
        canceledAt.value = null;
        progress.value = null;
        savedRecords.value = [];
        errors.value = [];
        live.value = [];
      }
    };
    const formatError = (error) => {
      let $error = error;
      if (typeof error === "string") {
        return error;
      }
      if (error === null || !error) {
        return "Unknown Error";
      }
      if (error.error) {
        $error = error.error;
      } else if (error.errors && Object.keys(error.errors).length === 1) {
        $error = Object.values(error.errors)[0];
      }
      return YAML.stringify($error);
    };
    const resourceName = ref(null);
    watch(
      () => [props.resource],
      () => {
        if (resourceName.value !== props.resource.name) {
          reset();
        }
      }
    );
    const save = async () => {
      let classes = "";
      if (props.dense) {
        classes = `${classes} dense`;
      }
      const remote = props.loaded === numRows.value;
      quasar
        .dialog({
          message: `Are you sure you want to update ${
            remote ? props.total : numRows.value
          } ${props.resource.name}?${
            remote
              ? " The import will process on the server and you will receive email updates."
              : ""
          }`,
          title: "Please Confirm",
          icon: "check_box",
          persistent: true,
          cancel: "No",
          ok: "Yes",
          class: classes,
          color: "primary",
        })
        .onOk(async () => {
          const resource = props.resource;
          saving.value = true;
          errors.value = [];
          progress.value = 0;
          savedRecords.value = [];
          let changes = live.value;
          if (remote) {
            changes = changes.reduce((acc, current) => {
              const entries = Object.entries(current);
              if (entries.length === 1) {
                acc[entries[0][0]] = entries[0][1];
              }
              return acc;
            }, {});
            let response;
            try {
              response = await api.post("imports", {
                data: { request_url: getCurrentURL(), updates: changes },
              });
            } catch (error) {
              quasar.notify({
                timeouit: 0,
                type: "negative",
                color: "red",
                message: `Bulk edit failed: ${getErrorMessage(error)}`,
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
            const bulkEditRequest = response.data["import"];
            let message = `Look for the email "${bulkEditRequest.name}" for details`;
            quasar.notify({
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
            saved.value = true;
            saving.value = false;
            reset();
            close();
          } else {
            const num = numRows.value;
            let response;
            for (let i = 0; i < num; i++) {
              if (cancel.value) {
                canceledAt.value = i;
                break;
              }
              const record = props.rows[i];
              const id = resource.getRecordId(record);
              try {
                response = await resource.patchAPI({
                  id,
                  changes,
                  view: "list",
                  relations: false,
                });
                context.emit("updated", {
                  index: i,
                  data: response.data[resource.singular],
                });
                savedRecords.value.push(record);
              } catch (error) {
                errors.value.push({ error, record });
              }
              progress.value = (i + 1.0) / (num + 0.0);
            }
            if (!cancel.value) {
              progress.value = 1;
            }
          }
          saved.value = true;
          saving.value = false;
        });
    };
    const unprocessed = computed(() => {
      if (canceledAt.value === null) {
        return [];
      }
      return props.rows.slice(canceledAt.value);
    });
    const isOpen = computed({
      get() {
        return props.value;
      },
      set(newValue) {
        context.emit("input", newValue);
      },
    });
    const close = () => {
      if (!saving.value) {
        context.emit("input", false);
      }
    };
    return {
      isOpen,
      onChangeUpdate: (index, update) => {
        live.value[index] = update;
      },
      onChangeDelete: (index) => {
        live.value.splice(index, 1);
      },
      canSave: hasChanges,
      canDiscard: hasChanges,
      title: computed(() => {
        return `Editing ${
          props.loaded === numRows.value ? props.total : numRows.value
        } ${props.resource.name}`;
      }),
      save,
      discard: reset,
      addChange: () => {
        live.value.push({});
      },
      live,
      canAddChange: computed(() => {
        if (saving.value || saved.value) {
          return false;
        }
        if (!numRows.value) {
          return false;
        }
        const $value = live.value;
        if ($value.length) {
          const last = $value[$value.length - 1];
          if (Object.keys(last).length === 0) {
            return false;
          }
        }
        return true;
      }),
      clear: () => {
        live.value = [];
      },
      canClear: computed(() => live.value && live.value.length > 0),
      label: computed(() => {
        if (!numRows.value) {
          return "No rows to change";
        }
        if (numChanges.value === 0) {
          return ""; // `Changing ${numRows.value} ${props.resource.name}`;
        }
        const changeLabel = numChanges.value > 1 ? "changes" : "change";
        const suffix = saving.value ? "..." : ":";
        let num;
        let prefix;
        if (saved.value) {
          prefix = "Applied";
          num =
            savedRecords.value.length !== numRows.value
              ? `${savedRecords.value.length} / ${numRows.value}`
              : numRows.value;
        } else {
          num = numRows.value;
          prefix = saving.value ? "Applying" : "Apply";
        }
        return `${prefix} ${numChanges.value} ${changeLabel} to ${
          props.loaded === numRows.value ? props.total : num
        } ${props.resource.name}${suffix}`;
      }),
      saving,
      saved,
      savedRecords,
      cancel,
      progress,
      errors,
      unprocessed,
      formatError,
      close,
    };
  },
};
</script>
