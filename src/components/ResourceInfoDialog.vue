<template>
  <q-dialog
    v-model="isOpen"
    :class="{ 'dense small': dense, right: true }"
    :maximized="dense"
    transition-show="slide-up"
    transition-hide="slide-down"
    position="bottom"
  >
    <q-card class="q-pb-xl">
      <div
        :class="{ 'absolute-bottom full-width bottom-bar': true, fixed: dense }"
        style="z-index: 11"
      >
        <ActionBar :dark="dark" right>
          <IconButton
            left
            v-if="view"
            flat
            color="red"
            :dense="dense"
            icon="delete"
            label="Delete"
            @click="showDeleteConfirmation"
          />
          <IconButton
            flat
            :dense="dense"
            icon="link"
            label="Share"
            @click="copyLink"
          />
          <IconButton
            v-if="canExport"
            flat
            :dense="dense"
            icon="mdi-export"
            label="Export"
            @click="requestExport"
          />
          <IconButton
            v-if="canImport"
            flat
            :dense="dense"
            icon="mdi-import"
            label="Import"
            @click="requestImport"
          />
          <IconButton
            v-if="view"
            flat
            :dense="dense"
            icon="settings"
            label="Settings"
            @click="showEditView"
          />
          <IconButton
            color="primary"
            :dense="dense"
            icon="done"
            label="Save"
            @click="saveView"
            v-if="saveable && !selected.length"
          />
        </ActionBar>
      </div>
      <q-toolbar
        style="z-index: 11; top: 0px"
        :class="{
          'bg-primary text-white': saveable,
          'bg-grey-9 text-white': !saveable && !dark,
          'bg-grey-3 text-black': !saveable && dark,
          fixed: dense,
        }"
        v-close-popup
      >
        <q-icon :name="'mdi-' + resource.icon" size="sm" />
        <q-toolbar-title>
          {{ title }}
        </q-toolbar-title>
        <q-btn flat round dense icon="close" />
      </q-toolbar>
      <q-card-section :class="{ 'q-pb-md': true, 'q-pt-xl q-mt-md': dense }">
        <q-list>
          <q-item clickable v-ripple>
            <q-item-section side>
              <q-icon name="menu" />
            </q-item-section>
            <q-item-section> All: </q-item-section>
            <q-item-section class="text-weight-bold">
              {{ total }}
            </q-item-section>
          </q-item>
          <q-item v-if="selected && selected.length" clickable v-ripple>
            <q-item-section side class="text-weight-bold">
              <q-icon name="check_box" />
            </q-item-section>
            <q-item-section> Selected: </q-item-section>
            <q-item-section class="text-weight-bold">
              {{ selected.length }}
            </q-item-section>
          </q-item>
          <q-item clickable v-ripple v-if="!selected || !selected.length">
            <q-item-section side>
              <q-icon name="mdi-eye-outline" />
            </q-item-section>
            <q-item-section> Loaded: </q-item-section>
            <q-item-section class="text-weight-bold">
              {{ rows.length }}
            </q-item-section>
          </q-item>
          <q-item clickable v-ripple>
            <q-item-section side>
              <q-icon name="mdi-table-column" />
            </q-item-section>
            <q-item-section> Fields: </q-item-section>
            <q-item-section class="text-weight-bold">
              <span>
                <span>{{
                  resource.getVisibleFieldNames({
                    view: "list",
                    include,
                    deferred: false,
                    read: true,
                  }).length
                }}</span>
                <span v-if="fieldsChanged" class="text-primary q-ml-xs">*</span>
              </span>
            </q-item-section>
          </q-item>
          <q-item clickable v-ripple>
            <q-item-section side>
              <q-icon name="mdi-filter-outline" />
            </q-item-section>
            <q-item-section> Filters: </q-item-section>
            <q-item-section class="text-weight-bold">
              <span>
                <span>{{ filter.length }}</span>
                <span v-if="filtersChanged" class="text-primary q-ml-xs"
                  >*</span
                >
              </span>
            </q-item-section>
          </q-item>
          <q-item v-if="summaryText" clickable v-ripple>
            <q-item-section side>
              <q-icon name="mdi-chart-box-outline" />
            </q-item-section>
            <q-item-section> Summary: </q-item-section>
            <q-item-section class="text-weight-bold">
              <span>
                <span>{{ summaryTypeLabel || "—" }}</span>
                <span v-if="chartChanged" class="text-primary q-ml-xs">*</span>
                <q-tooltip
                  anchor="bottom middle"
                  self="top middle"
                  class="text-body2"
                >
                  {{ summaryText }}
                </q-tooltip>
              </span>
            </q-item-section>
          </q-item>
          <q-item v-if="sort && sort.length" clickable v-ripple>
            <q-item-section side class="text-weight-bold">
              <q-icon
                :name="sort[0][0] === '-' ? 'arrow_downward' : 'arrow_upward'"
              />
            </q-item-section>
            <q-item-section> Sort: </q-item-section>
            <q-item-section class="text-weight-bold">
              <span>
                <span>{{ sort[0] }}</span>
                <span v-if="sortChanged" class="text-primary q-ml-xs">*</span>
              </span>
            </q-item-section>
          </q-item>
        </q-list>
        <div
          v-if="saveable"
          :class="{
            'text-h7 text-primary q-pb-md q-pt-md': true,
            'q-mt-sm': dense,
          }"
        >
          * There are changes to the current view
        </div>
      </q-card-section>
    </q-card>
    <ViewEditDialog
      :dense="dense"
      :dark="dark"
      :record="view"
      :value="viewDialogOpen"
      @input="viewDialogOpen = $event"
    />
  </q-dialog>
</template>

<script>
import { ref, computed } from "vue";
import { useQuasar } from "quasar";
import { useStore } from "vuex";
import { SaveViewDialog, IconButton, ActionBar } from ".";
import ViewEditDialog from "./ViewEditDialog";
import { buildDelete } from "../utilities";

export default {
  props: [
    "dense",
    "dark",
    "title",
    "value",
    "pagination",
    "selected",
    "fields",
    "sort",
    "filter",
    "rows",
    "resource",
    "include",
    "fieldsChanged",
    "filtersChanged",
    "chartChanged",
    "sortChanged",
    "view",
    "viewType",
    "chart",
  ],
  components: {
    IconButton,
    ActionBar,
    ViewEditDialog,
  },
  emits: ["saveView", "deleteView", "input", "import", "export"],
  setup(props, context) {
    const $q = useQuasar();
    const store = useStore();
    const database = store.$db();
    const Resource = database.model("_resources");

    const saveView = () => {
      $q.dialog({
        component: SaveViewDialog,
        title: "Save View",
        componentProps: {
          dense: props.dense,
          currentView: props.view,
          resource: props.resource.name,
        },
      }).onOk(async (view) => {
        context.emit("saveView", view);
      });
    };
    const copyLink = () => {
      const baseMessage = "Sharing link copied";
      const suffix = props.view
        ? ". Recipients must also be granted access to this view"
        : "";
      const message = `${baseMessage}${suffix}`;
      $q.notify({
        type: "positive",
        color: "grey-3",
        message,
        icon: "link",
        timeout: 750,
        textColor: "black",
        classes: "full-width",
      });
      let shareUrl = window.location.href;
      if (props.view && props.view.share_url) {
        // rewrite for easier sharing
        shareUrl = props.view.share_url;
      }
      navigator.clipboard.writeText(shareUrl);
    };
    const saveable = computed(
      () =>
        props.fieldsChanged ||
        props.filtersChanged ||
        props.chartChanged ||
        props.sortChanged
    );
    const selectedCount = computed(() =>
      props.selected ? props.selected.length : 0
    );
    const totalCount = computed(() =>
      props.pagination ? props.pagination.total : null
    );
    const canExport = computed(
      () =>
        selectedCount.value === 0 ||
        (totalCount.value !== null && selectedCount.value === totalCount.value)
    );
    const canImport = computed(
      () =>
        selectedCount.value === 0 &&
        props.viewType !== "chart" &&
        (props.resource?.canCreate?.() || props.resource?.canWrite?.())
    );
    const requestImport = () => {
      context.emit("import");
      context.emit("input", false);
    };
    const requestExport = () => {
      context.emit("export");
      context.emit("input", false);
    };
    const summaryText = computed(() => {
      const c = props.chart;
      if (!c) return null;
      const parts = [];
      if (c.advanced) {
        if (c.combine_ex) parts.push(c.combine_ex);
        if (c.by_ex) parts.push(`by:${c.by_ex}`);
        if (c.over_ex) parts.push(`over:${c.over_ex}`);
      } else {
        if (c.combine) {
          const using = c.combine_using || "count";
          parts.push(`${using}:${c.combine}`);
        }
        if (c.by) {
          parts.push(
            c.by_using ? `by:${c.by_using}(${c.by})` : `by:${c.by}`
          );
        }
        if (c.over) {
          parts.push(
            c.over_using ? `over:${c.over_using}(${c.over})` : `over:${c.over}`
          );
        }
      }
      return parts.length ? parts.join(" ") : null;
    });
    const summaryTypeLabel = computed(() => {
      const type = props.chart && props.chart.type;
      if (!type) return null;
      return type.charAt(0).toUpperCase() + type.slice(1);
    });
    const isOpen = computed({
      get() {
        return props.value;
      },
      set(newValue) {
        context.emit("input", newValue);
      },
    });
    const total = computed(() =>
      props.pagination && props.pagination.total ? props.pagination.total : "?"
    );
    const viewDialogOpen = ref(false);
    const showEditView = () => {
      viewDialogOpen.value = true;
      // isOpen.value = false;
    };
    const showDeleteConfirmation = () => {
      const view = props.view;
      $q.dialog({
        title: "Please Confirm",
        class: props.dense ? "dense" : "",
        message: `Are you sure you want to delete the view "${view.name}"? (no ${props.resource.name} will be deleted)`,
        ok: "Yes",
        cancel: "No",
      }).onOk(() => deleteView());
    };
    const View = computed(() => Resource.find("views"));
    const deleteView = async () => {
      const del = buildDelete({
        dark: { value: props.dark },
        resource: View,
        record: { value: props.view },
        quasar: $q,
      });
      await del();
      context.emit("deleteView");
      isOpen.value = false;
    };
    return {
      isOpen,
      copyLink,
      saveable,
      saveView,
      viewDialogOpen,
      showDeleteConfirmation,
      showEditView,
      total,
      canExport,
      canImport,
      requestExport,
      requestImport,
      summaryText,
      summaryTypeLabel,
    };
  },
};
</script>
