<template>
  <q-page>
    <div class="page-content-container">
      <DetailForm
        :inline="true"
        :deleting="deleting"
        :saving="saving"
        :editing="application.editing"
        :embedded="false"
        :loading="loading"
        :key="formKey"
        :dense="dense"
        :fields="currentFields"
        :resource="resource"
        :changes="changes"
        :record="record"
        :focused="focused"
        :dark="dark"
        :display="display"
        :fieldViews="fieldViews"
        :relatedViews="relatedViews"
        :jsonMode="jsonMode"
        mode="update"
        @showAdd="showAdd"
        @focus="focus"
        @change="update"
        @changeFieldView="setFieldView"
      />
    </div>
    <div
      :class="{
        'absolute-bottom': !dense,
        'fixed-bottom': dense,
        'full-width bottom-bar': true,
      }"
      style="z-index: 99"
      v-if="!fullscreen"
    >
      <ActionBar :dark="dark" v-if="record" right>
        <IconButton
          left
          :dense="dense"
          icon="close"
          label="Cancel"
          v-if="application.editing && !saving"
          @click="discard"
        />
        <IconButton
          flat
          left
          label="Delete"
          icon="delete"
          :dense="dense"
          v-if="
            resource.canDelete(record) &&
            !focused &&
            !saving &&
            !application.editing &&
            !deleting
          "
          @click="showDelete"
          color="red-5"
        />
        <div v-if="!application.editing && !saving" style="display: flex">
          <IconButton
            v-for="action in actions"
            :key="action.name"
            :dense="dense"
            :icon="action.icon"
            :label="action.label"
            @click="doAction(action)"
          />
        </div>
        <IconButton
          label="Reset"
          icon="restart_alt"
          v-if="
            application.editing &&
            focused &&
            typeof changes[focused] !== 'undefined'
          "
          :dense="dense"
          @click="resetField"
        />
        <IconButton
          label="Activity"
          icon="mdi-information"
          v-if="!application.editing && !saving && !focused && canViewActivity"
          :dense="dense"
          @click="viewActivity"
        />
        <IconButton
          label="History"
          icon="history"
          v-if="!application.editing && !saving && !focused && canViewHistory"
          :dense="dense"
          @click="viewHistory"
        />
        <IconButton
          label="Copy"
          icon="link"
          v-if="focused && !application.editing && !saving"
          :dense="dense"
          @click="copy"
        />
        <IconButton
          center
          :dense="dense"
          :dark="dark"
          flat
          icon="mdi-table-column"
          :label="relatedFieldsLabel"
          :badge="relatedFieldsBadge"
          :textColor="areRelatedFieldsCustomized ? 'primary' : null"
          v-if="focusedManyField && !application.editing && !saving"
          @click="showRelatedFieldDialog = true"
        />
        <IconButton
          center
          :dense="dense"
          :dark="dark"
          flat
          icon="mdi-filter-outline"
          :label="relatedFilterLabel"
          :badge="relatedFilterBadge"
          :textColor="areRelatedFiltersCustomized ? 'primary' : null"
          v-if="focusedManyField && !application.editing && !saving"
          @click="showRelatedFilterDialog = true"
        />
        <IconButton
          center
          :dense="dense"
          :dark="dark"
          flat
          icon="mdi-chart-box-outline"
          label="Summary"
          :textColor="isRelatedChartCustomized ? 'primary' : null"
          v-if="focusedManyField && !application.editing && !saving"
          @click="showRelatedChartDialog = true"
        />
        <IconButton
          label="Raw JSON"
          icon="mdi-code-json"
          v-if="focusedJsonField && !saving && jsonMode !== 'raw'"
          :dense="dense"
          @click="setJsonMode('raw')"
        />
        <IconButton
          label="Visual"
          icon="account_tree"
          v-if="focusedJsonField && !saving && jsonMode !== 'visual'"
          :dense="dense"
          @click="setJsonMode('visual')"
        />
        <IconButton
          v-if="
            !application.editing &&
            !saving &&
            availableViews.length > 1
          "
          :icon="currentViewIcon"
          :label="currentViewLabel"
          :dense="dense"
        >
          <q-menu auto-close>
            <q-list dense>
              <q-item
                v-for="view in availableViews"
                :key="view.key"
                clickable
                @click="setFieldDisplay(view.key)"
                :active="display === view.key"
              >
                <q-item-section side>
                  <q-icon :name="view.icon" />
                </q-item-section>
                <q-item-section>{{ view.label }}</q-item-section>
              </q-item>
            </q-list>
          </q-menu>
        </IconButton>
        <IconButton
          label="Add"
          icon="add"
          v-if="
            !application.editing &&
            focused &&
            !saving &&
            resource.canCreate(focused, record)
          "
          :dense="dense"
          @click="showAdd(focused)"
        />
        <IconButton
          v-if="
            display !== 'table' &&
            !saving &&
            !application.editing &&
            ((!focused && resource.canWrite(null, record)) ||
              resource.canWrite(focused, record))
          "
          label="Edit"
          icon="edit"
          :dense="dense"
          color="primary"
          @click="edit"
        />
        <IconButton
          :dense="dense"
          icon="done"
          :label="saveLabel"
          v-if="!saving && application.editing && Object.keys(changes).length"
          color="primary"
          @click="save"
        />
      </ActionBar>
    </div>
    <AddDialog
      :value="showAddDialog"
      @input="showAddDialog = $event"
      :dense="dense"
      :dark="dark"
      :resource="resource"
      :field="addDialogField"
      :record="record"
    />
    <ActionDialog
      :actionTodo="actionTodo"
      :value="showActionDialog"
      @input="showActionDialog = $event"
      :dense="dense"
      :dark="dark"
      :resource="resource"
      :record="record"
    />
    <ResourceFieldDialog
      v-model="showRelatedFieldDialog"
      :dense="dense"
      :dark="dark"
      :resource="focusedRelationResource"
      :include="focusedRelatedInclude"
      :fields="focusedRelationFields"
      :data="focusedRelationRows"
      @change="onRelatedFieldChange"
    />
    <ResourceFilterDialog
      v-model="showRelatedFilterDialog"
      :dense="dense"
      :dark="dark"
      :resource="focusedRelationResource"
      :filter="focusedRelatedFilter"
      @update="onRelatedFilterUpdate"
    />
    <ChartDialog
      :value="showRelatedChartDialog"
      @input="showRelatedChartDialog = $event"
      @update="onRelatedChartUpdate"
      :dense="dense"
      :dark="dark"
      :resource="focusedRelationResource"
      :chart="focusedRelatedChartDialog"
    />
  </q-page>
</template>

<script>
import { useQuasar } from "quasar";
import {
  onUnmounted,
  onMounted,
  nextTick,
  watch,
  defineComponent,
  computed,
  ref,
} from "vue";
import {
  AddDialog,
  DetailForm,
  ActionBar,
  IconButton,
  ActionDialog,
  ResourceFieldDialog,
  ResourceFilterDialog,
  ChartDialog,
} from "../components";
import { useRoute, useRouter } from "vue-router";
import { useStore } from "vuex";
import {
  buildDelete,
  buildSave,
  getErrorMessage,
  deserializeFilterQuery,
} from "../utilities";
import { API_URL } from "../config";
import { useHead } from "@vueuse/head";
import api from "../api";

const deserializeFilter = (x) => deserializeFilterQuery(x);
const deserializeChart = (x) => (x ? JSON.parse(x) : {});
const deserializeInclude = (x) =>
  x
    ? x.split(",").reduce((result, item) => {
        let $item = item;
        let value = true;
        if (
          typeof $item !== "undefined" &&
          $item.length &&
          $item !== "undefined"
        ) {
          if (item[0] === "-") {
            $item = $item.substr(1);
            value = false;
          }
          result[$item] = value;
        }
        return result;
      }, {})
    : {};
const serializeFilter = (x) =>
  x && x.length ? JSON.stringify(x) : undefined;
const serializeInclude = (x) => {
  const result = Object.entries(x || {})
    .map(([item, value]) => (value ? item : `-${item}`))
    .join(",");
  return result || undefined;
};
const stripResource = (x) => {
  if (!x) {
    return undefined;
  }
  const result = { ...x };
  delete result.resource;
  return result;
};
const serializeChart = (x) => {
  const result = stripResource(x);
  return result && Object.keys(result).length ? JSON.stringify(result) : undefined;
};

export default defineComponent({
  components: {
    ActionBar,
    IconButton,
    DetailForm,
    AddDialog,
    ActionDialog,
    ResourceFieldDialog,
    ResourceFilterDialog,
    ChartDialog,
  },
  setup() {
    // use
    const $q = useQuasar();
    const route = useRoute();
    const router = useRouter();
    const store = useStore();
    const database = store.$db();
    const Resource = database.model("_resources");
    const Application = database.model("_application");

    // ref
    const loading = ref(0);
    const params = ref({});
    const changes = ref({});
    const enabled = ref(false);
    const saving = ref(false);

    // computed
    const dense = computed(() => $q.screen.lt.md);
    const dark = computed(() => $q.dark.isActive);
    const focused = computed(() => route.query.focused);
    const fieldViews = computed(() => {
      const result = {};
      Object.entries(route.query).forEach(([key, value]) => {
        if (key.startsWith("fv-")) {
          result[key.slice(3)] = value;
        }
      });
      return result;
    });
    const display = computed(() => {
      const $focused = focused.value;
      if (!$focused) return null;
      if (fieldViews.value[$focused]) return fieldViews.value[$focused];
      const field = resource.value?.fields[$focused];
      const views = field?.extra?.views;
      const def = views?.default;
      return def && def !== "auto" ? def : "list";
    });
    const jsonModeOverride = ref(null);
    const jsonMode = computed(() => {
      if (jsonModeOverride.value) return jsonModeOverride.value;
      const $focused = focused.value;
      if ($focused && fieldViews.value[$focused]) {
        const fv = fieldViews.value[$focused];
        if (fv === "raw" || fv === "visual") return fv;
      }
      return "visual";
    });
    const getScopedQueryKey = (prefix, fieldName) =>
      fieldName ? `${prefix}-${fieldName}` : null;
    const application = computed(() => Application.getInstance());
    const resource = computed(() =>
      Resource.find((name = route.params.resource))
    );
    const sections = computed(() => resource.value.getSections());
    const record = computed(() =>
      resource.value ? resource.value.getRecord(route.params.id) : null
    );
    const requestInProgress = ref(null);
    const request = async (load) => {
      if (requestInProgress.value) {
        requestInProgress.value.abort();
        requestInProgress.value = null;
      }
      if (!resource.value || !enabled.value || !route.params.id) {
        loading.value = 0;
        return; // stop
      }
      loading.value = load || 1;
      requestInProgress.value = new AbortController();
      await Promise.all([
        resource.value.getAPI({
          id: route.params.id,
          manyRelations: false,
          signal: requestInProgress.value.signal,
        }),
        resource.value.getAPI({
          id: route.params.id,
          deferred: true,
          manyRelations: false,
          signal: requestInProgress.value.signal,
        }),
      ]);
      requestInProgress.value = null;
      loading.value = 0;
    };
    useHead({
      title: computed(() => {
        const $resource = resource.value;
        const $record = record.value;
        if (!$resource) {
          return "...";
        }
        const name = $record ? $resource.getRecordName($record) : null;
        return name ? `${$resource.label}: ${name}` : $resource.label;
      }),
    });
    const currentFields = computed(() =>
      resource.value
        .getFields()
        .filter((x) => x.name !== resource.value.id_field)
    );
    const focusedFieldDef = computed(() => {
      const $resource = resource.value;
      const $focused = focused.value;
      return $resource && $focused ? $resource.fields[$focused] : null;
    });
    const focusedManyField = computed(() =>
      focusedFieldDef.value?.type === "many" ? focused.value : null
    );
    const focusedRelationResource = computed(() =>
      focusedManyField.value
        ? resource.value.getRelationFromField(focusedManyField.value)
        : null
    );
    const focusedRelationFields = computed(() =>
      focusedRelationResource.value ? focusedRelationResource.value.getFields() : []
    );
    const focusedRelatedInclude = computed(() => {
      if (!focusedManyField.value || !focusedRelationResource.value) {
        return {};
      }
      const include = deserializeInclude(
        route.query[getScopedQueryKey("finclude", focusedManyField.value)]
      );
      Object.entries(focusedRelationResource.value.fields).forEach(
        ([name, field]) => {
          if (field.related === resource.value?.name) {
            include[name] = false;
          }
        }
      );
      return include;
    });
    const focusedRelatedFilter = computed(() =>
      focusedManyField.value
        ? deserializeFilter(
            route.query[getScopedQueryKey("ffilter", focusedManyField.value)]
          )
        : []
    );
    const focusedRelatedChartCustom = computed(() => {
      if (!focusedManyField.value || !focusedRelationResource.value) {
        return null;
      }
      const chart = deserializeChart(
        route.query[getScopedQueryKey("fchart", focusedManyField.value)]
      );
      return Object.keys(chart).length
        ? { ...chart, resource: focusedRelationResource.value }
        : null;
    });
    const focusedRelatedChartDialog = computed(() => {
      const custom = focusedRelatedChartCustom.value;
      if (custom) {
        return custom;
      }
      if (!focusedRelationResource.value) {
        return null;
      }
      return {
        resource: focusedRelationResource.value,
        display:
          display.value === "both" || display.value === "table"
            ? display.value
            : "chart",
      };
    });
    const relatedViews = computed(() => {
      const $resource = resource.value;
      if (!$resource) {
        return {};
      }
      return Object.entries($resource.fields).reduce((result, [fieldName, field]) => {
        if (field.type !== "many") {
          return result;
        }
        const relationResource = $resource.getRelationFromField(fieldName);
        if (!relationResource) {
          return result;
        }
        const include = deserializeInclude(
          route.query[getScopedQueryKey("finclude", fieldName)]
        );
        Object.entries(relationResource.fields).forEach(([name, relatedField]) => {
          if (relatedField.related === $resource.name) {
            include[name] = false;
          }
        });
        const filter = deserializeFilter(
          route.query[getScopedQueryKey("ffilter", fieldName)]
        );
        const chart = deserializeChart(
          route.query[getScopedQueryKey("fchart", fieldName)]
        );
        if (
          !Object.keys(include).length &&
          !filter.length &&
          !Object.keys(chart).length
        ) {
          return result;
        }
        result[fieldName] = {
          include,
          filter,
          chart: Object.keys(chart).length
            ? { ...chart, resource: relationResource }
            : null,
        };
        return result;
      }, {});
    });
    const formKey = computed(
      () => `${route.params.resource}/${route.params.id}`
    );
    const saveLabel = computed(() => {
      const base = "Save";
      if (changes.value) {
        const len = Object.keys(changes.value).length;
        if (dense.value) {
          return len > 1 ? `${len}` : base;
        }
        return len > 1 ? `${base} ${len}` : base;
      }
      return base;
    });
    // functions
    const focus = (name) => {
      const query = { ...route.query, focused: name ? name : undefined };
      // fv- params persist across focus changes
      router.push({ name: route.name, query, params: route.params });
    };
    const copy = () => {
      if (!record.value) {
        return;
      }
      $q.notify({
        type: "positive",
        color: dark.value ? "grey-3" : "black",
        message: focused.value ? "Data copied" : "Link copied",
        icon: "link",
        timeout: 750,
        textColor: dark.value ? "black" : "white",
        classes: "full-width q-mr-none q-ml-none",
      });
      if (focused.value) {
        navigator.clipboard.writeText(
          resource.value.getExportValue(record.value, focused.value)
        );
      } else {
        navigator.clipboard.writeText(window.location.href); // resource.value.getLink(record.value));
      }
    };
    const save = buildSave({
      changes,
      record,
      resource,
      Application,
      saving,
      quasar: $q,
    });
    const discard = () => {
      Application.stopEditing();
      changes.value = {};
    };
    const edit = () => Application.startEditing();
    const update = (value) => {
      changes.value = value;
    };

    // hooks
    watch(formKey, async () => {
      if (!resource.value || !application.value.loaded) {
        // application or resources have not loaded yet
        return;
      }
      const $resource = route.params.resource;
      const $id = route.params.id;
      if (
        params.value &&
        params.value.id === $id &&
        params.value.resource.name === $resource.name
      ) {
        // nothing changed
        return;
      }
      if (!resource.value.getRecord($id)) {
        params.value = {
          resource: $resource,
          id: $id,
        };
        await request(2);
      } else {
        // request anyway!
        await request();
      }
    });
    const previousFocused = ref(null);
    watch(
      () => focused.value,
      (next, prev) => {
        jsonModeOverride.value = null;
        if (next) {
          previousFocused.value = prev ? prev : next;
        } else if (prev) {
          // leaving focused view — scroll to the field we were viewing
          const fieldName = previousFocused.value || prev;
          nextTick(() => {
            const el = document.querySelector(
              `[data-field="${fieldName}"]`
            );
            if (el) {
              el.scrollIntoView({ block: "center" });
            }
          });
        }
      }
    );
    onMounted(async () => {
      enabled.value = true;
      if (application.value.loaded) {
        params.value = {
          resource: route.params.resource,
          id: route.params.id,
        };
        await request(2);
      }
    });
    onUnmounted(() => {
      enabled.value = false;
    });
    const resetField = () => {
      delete changes.value[focused.value];
    };
    const showAddDialog = ref(false);
    const showActionDialog = ref(false);
    const showRelatedFieldDialog = ref(false);
    const showRelatedFilterDialog = ref(false);
    const showRelatedChartDialog = ref(false);
    let actionTodo = ref(null);
    const availableViews = computed(() => {
      const $resource = resource.value;
      const $focused = focused.value;
      const $record = record.value;
      if (!$focused || !$record || !$resource) return [];
      const field = $resource.fields[$focused];
      if (!field || field.type !== "many") return [];
      const views = field.extra?.views;
      const result = [];
      if (!views || views.list !== false)
        result.push({ key: "list", label: "List", icon: "list" });
      if (!views || views.table !== false)
        result.push({ key: "table", label: "Table", icon: "table_chart" });
      if (!views || views.chart !== false)
        result.push({ key: "chart", label: "Chart", icon: "bar_chart" });
      if (
        (!views || views.table !== false) &&
        (!views || views.chart !== false)
      ) {
        result.push({
          key: "both",
          label: "Split",
          icon: "mdi-view-agenda-outline",
        });
      }
      return result;
    });
    const canDisplayTable = computed(() => availableViews.value.length > 0);
    const currentViewIcon = computed(() => {
      return (
        availableViews.value.find((v) => v.key === display.value)?.icon ||
        "list"
      );
    });
    const currentViewLabel = computed(() => {
      return (
        availableViews.value.find((v) => v.key === display.value)?.label ||
        "List"
      );
    });
    const relatedFieldsBadge = computed(() => {
      if (!focusedRelationResource.value) {
        return null;
      }
      return `${focusedRelationResource.value.getVisibleFieldNames({
        view: "list",
        deferred: false,
        include: focusedRelatedInclude.value,
        read: true,
      }).length}`;
    });
    const relatedFieldsLabel = computed(() => "Fields");
    const relatedFilterBadge = computed(
      () => `${focusedRelatedFilter.value.length}`
    );
    const relatedFilterLabel = computed(() => "Filters");
    const areRelatedFieldsCustomized = computed(
      () => Object.keys(focusedRelatedInclude.value).length > 0
    );
    const areRelatedFiltersCustomized = computed(
      () => focusedRelatedFilter.value.length > 0
    );
    const isRelatedChartCustomized = computed(() => {
      const { resource, ...chart } = focusedRelatedChartCustom.value || {};
      return Object.keys(chart).length > 0;
    });
    const focusedRelationRows = computed(() =>
      focusedRelationResource.value
        ? Object.values(focusedRelationResource.value.getRecords())
        : []
    );
    const applyFieldViewQuery = (query, fieldName, mode) => {
      const field = resource.value?.fields[fieldName];
      const views = field?.extra?.views;
      const isJson = field && (field.type === "object" || field.type === "json");
      const def = views?.default;
      const defaultView = isJson ? "visual" : (def && def !== "auto" ? def : null);
      const key = `fv-${fieldName}`;
      if (defaultView && mode === defaultView) {
        delete query[key];
      } else {
        query[key] = mode;
      }
      return query;
    };
    const setFieldDisplay = (mode) => {
      if (!focused.value) return;
      setFieldView(focused.value, mode);
    };
    const setFieldView = (fieldName, mode) => {
      const query = applyFieldViewQuery({ ...route.query }, fieldName, mode);
      router.push({ name: route.name, query, params: route.params });
    };
    const updateScopedQuery = (prefix, value, serialize) => {
      const fieldName = focusedManyField.value;
      if (!fieldName) {
        return;
      }
      const key = getScopedQueryKey(prefix, fieldName);
      const query = { ...route.query, [key]: serialize(value) };
      router.push({ name: route.name, query, params: route.params });
    };
    const onRelatedFieldChange = (change) => {
      const changeList = Object.entries(change || {});
      if (!changeList.length || !focusedRelationResource.value) {
        return;
      }
      const nextInclude = { ...focusedRelatedInclude.value };
      const $resource = focusedRelationResource.value;
      changeList.forEach(([field, value]) => {
        const $field = $resource.fields[field];
        if ($field.related === resource.value?.name) {
          nextInclude[field] = false;
          return;
        }
        if (value) {
          if ($field.deferred) {
            nextInclude[field] = value;
          } else if (typeof nextInclude[field] !== "undefined") {
            delete nextInclude[field];
          }
        } else if ($field.deferred) {
          delete nextInclude[field];
        } else {
          nextInclude[field] = value;
        }
      });
      updateScopedQuery("finclude", nextInclude, serializeInclude);
    };
    const onRelatedFilterUpdate = (update) =>
      updateScopedQuery("ffilter", update, serializeFilter);
    const onRelatedChartUpdate = (update) => {
      const fieldName = focusedManyField.value;
      if (!fieldName) {
        return;
      }
      const key = getScopedQueryKey("fchart", fieldName);
      const query = {
        ...route.query,
        [key]: serializeChart(update),
      };
      if (update.display === "table") {
        applyFieldViewQuery(query, fieldName, "table");
      } else if (update.display === "both") {
        applyFieldViewQuery(query, fieldName, "both");
      } else if (update.display === "chart") {
        applyFieldViewQuery(query, fieldName, "chart");
      }
      router.push({ name: route.name, query, params: route.params });
    };
    const focusedJsonField = computed(() => {
      const $resource = resource.value;
      const $focused = focused.value;
      if (!$resource || !$focused || !$resource.fields[$focused]) {
        return false;
      }
      const type = $resource.fields[$focused].type;
      return type === "object" || type === "json";
    });
    const setJsonMode = (mode) => {
      if (focused.value) {
        setFieldView(focused.value, mode === "raw" ? "raw" : "visual");
      }
    };
    const actions = computed(() => {
      const $resource = resource.value;
      const $record = record.value;
      const $focused = focused.value;
      const $saving = saving.value;
      if ($focused || $saving) {
        // no custom actions show up:
        // - when focusing field
        // - when saving
        return [];
      }
      return $resource.getActions($record).filter(
        // exclude iframe views
        (action) => !action.iframe
      );
    });
    const executeAction = async (action) => {
      const method = action.method || "get";
      const url = action.url;
      const $resource = resource.value;
      try {
        const response = await api.request(method, API_URL, url);
        // try to cache newly changed data
        if (response.data && response.data[$resource.singular]) {
          Resource.cacheResponse(response);
        }
        $q.notify({
          type: "positive",
          timeout: 1000,
          color: "primary",
          message: `${action.label} succeeded`,
          icon: "done",
          textColor: "white",
          classes: "full-width",
        });
      } catch (exception) {
        const errorMessage = getErrorMessage(exception, true);
        $q.notify({
          type: "negative",
          timeout: 0,
          color: "red-5",
          icon: "error",
          message: errorMessage,
          textColor: "white",
          classes: "full-width",
          noDismiss: true,
          persistent: true,
          actions: [{ icon: "close", color: "white" }],
        });
      }
    };
    const doAction = async (action) => {
      if (action.parameters) {
        return showAction(action);
      }
      if (action.confirm) {
        $q.dialog({
          title: "Please Confirm",
          class: dense.value ? "dense" : "",
          message: action.confirm,
          ok: "Yes",
          cancel: "No",
        }).onOk(async () => {
          await executeAction(action);
        });
      } else {
        await executeAction(action);
      }
    };
    const deleting = ref(false);
    const doDelete = buildDelete({
      quasar: $q,
      resource,
      dark,
      record,
      deleting,
      then: () => router.go(-1),
    });
    const showDelete = () => {
      $q.dialog({
        title: "Please Confirm",
        class: dense.value ? "dense" : "",
        message:
          "Are you sure you want to delete this record? This operation is permanent!",
        ok: "Yes",
        cancel: "No",
      }).onOk(async () => {
        await doDelete();
      });
    };
    const addDialogField = ref(null);
    const showAdd = (e) => {
      addDialogField.value = e;
      showAddDialog.value = true;
    };
    const showAction = (action) => {
      actionTodo.value = action;
      showActionDialog.value = true;
    };
    const fullscreen = computed(
      () => typeof route.query.fullscreen !== "undefined"
    );
    const canViewHistory = computed(() => {
      const Activity = Resource.find((name = "activity"));
      return Activity && Activity.canList();
    });
    const canViewActivity = computed(() => {
      return route.params.resource === "users" && canViewHistory.value;
    });
    const activityOverTime = encodeURIComponent(
      JSON.stringify({
        advanced: true,
        display: "both",
        type: "bar",
        combine_ex: "count(id)",
        by_ex: "action",
        over_ex: "auto(timestamp)",
      })
    );
    const viewHistory = () => {
      const objectId = route.params.id;
      const filter = encodeURIComponent(
        JSON.stringify([
          { "object_id.$eq": objectId },
          { "request_method.$neq": "GET" },
        ])
      );
      window.location.href = `/activity/?filter=${filter}&chart=${activityOverTime}`;
    };
    const viewActivity = () => {
      if (!record.value) {
        return;
      }
      const userId = route.params.id;
      const filter = encodeURIComponent(
        JSON.stringify([
          {
            "user.$eq": {
              value: userId,
              label: resource.value.getName(record.value),
            },
          },
        ])
      );
      window.location.href = `/activity/?filter=${filter}&chart=${activityOverTime}`;
    };
    return {
      fullscreen,
      actions,
      doAction,
      dense,
      dark,
      resource,
      record,
      loading,
      application,
      currentFields,
      focus,
      focused,
      jsonMode,
      focusedJsonField,
      setJsonMode,
      formKey,
      copy,
      discard,
      edit,
      save,
      saveLabel,
      changes,
      saving,
      update,
      resetField,
      display,
      canDisplayTable,
      availableViews,
      currentViewIcon,
      currentViewLabel,
      relatedViews,
      focusedManyField,
      focusedRelationResource,
      focusedRelationFields,
      focusedRelationRows,
      focusedRelatedInclude,
      focusedRelatedFilter,
      focusedRelatedChartDialog,
      focusedRelatedChartCustom,
      relatedFieldsBadge,
      relatedFieldsLabel,
      relatedFilterBadge,
      relatedFilterLabel,
      areRelatedFieldsCustomized,
      areRelatedFiltersCustomized,
      isRelatedChartCustomized,
      showRelatedFieldDialog,
      showRelatedFilterDialog,
      showRelatedChartDialog,
      onRelatedFieldChange,
      onRelatedFilterUpdate,
      onRelatedChartUpdate,
      fieldViews,
      setFieldDisplay,
      setFieldView,
      showAddDialog,
      showDelete,
      addDialogField,
      showAdd,
      showActionDialog,
      showAction,
      deleting,
      canViewHistory,
      canViewActivity,
      viewActivity,
      viewHistory,
      actionTodo,
    };
  },
});
</script>
