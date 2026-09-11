<style lang="scss">
.table-progress {
  position: absolute;
  top: 30px;
  z-index: 100;
}
.ResourceList__item {
  display: block;
  padding: 4px 0;
}
</style>

<template>
  <q-page class="flex column">
    <DataChart
      :hideToggle="!!selected.length"
      :dense="dense"
      :view="currentView"
      :viewType="viewType"
      :dark="dark"
      :filters="filter"
      v-if="
        !focused &&
        (viewType === 'chart' || viewType === 'both') &&
        (!!loading || rows.length)
      "
      :height="
        viewType === 'chart'
          ? 'calc(100dvh - 100px)'
          : 'calc(50dvh - 55px)'
      "
      :options="chart"
      :data="chartData"
      :loading="chartLoading"
      @toggleTable="toggleTable"
    />
    <q-table
      :class="{
        'dark naked-header': dark,
        'selection table sticky-column sticky-table': true,
        'full-page-content': viewType === 'table' || focused,
        'half-page-content': viewType === 'both',
        'dense-table': true,
        'is-loading': !!loading,
        'display-none': focused || viewType === 'chart' || viewType === 'list',
      }"
      ref="table"
      :visible-columns="visibleColumns"
      flat
      dense
      virtual-scroll
      separator="cell"
      hide-pagination
      selection="multiple"
      v-if="rows.length || !!loading"
      v-model:selected="selected"
      v-model:pagination="pagination"
      :loading="!!loading"
      :hide-bottomn="true"
      :color="dark ? 'primary' : 'grey-9'"
      :rows="rows.length ? rows : skeletonRows"
      :columns="columns"
      @request="request"
      @virtual-scroll="onScroll"
    >
      <template v-slot:loading>
        <q-linear-progress
          class="table-progress"
          indeterminate
          color="primary"
          size="4px"
        />
      </template>
      <template v-slot:body-cell="props">
        <TableCell
          :resource="resource"
          :skeleton="skeletonRows.length"
          :record="rows[props.rowIndex]"
          dense
          :props="props"
          @click="cellClicked(props.rowIndex, props.col)"
        />
      </template>
      <template v-slot:header-cell="props">
        <TableHeaderCell
          :resource="resource"
          dense
          :props="props"
          :canSort="true"
          @sort="sortClicked(props.col, $event)"
          @hide="hideField(props.col, $event)"
          :sorts="sort"
        />
      </template>
    </q-table>
    <div
      v-if="!focused && viewType === 'list' && (rows.length || !!loading)"
      class="ResourceList full-page-content scroll q-px-md q-py-sm"
    >
      <q-infinite-scroll
        :offset="250"
        :disable="!serverPagination.more"
        @load="onListLoad"
      >
        <div
          v-for="row in rows"
          :key="row[resource.id_field]"
          class="ResourceList__item"
        >
          <PageLink :resource="resource" :record="row" />
        </div>
        <div
          v-if="!!loading && !rows.length"
          class="row justify-center q-my-md"
        >
          <q-spinner-dots color="primary" size="32px" />
        </div>
        <template v-slot:loading>
          <div class="row justify-center q-my-md">
            <q-spinner-dots color="primary" size="32px" />
          </div>
        </template>
      </q-infinite-scroll>
    </div>
    <span
      class="absolute-center text-h5 white-space-pre q-pb-xl text-grey-7"
      v-if="
        !focused &&
        !rows.length &&
        !loading &&
        viewType !== 'chart' &&
        viewType !== 'both'
      "
    >
      <q-img
        style="
          border: 0;
          text-decoration: none;
          outline: none;
          height: 30vh;
          width: 40vw;
        "
        fit="contain"
        src="~/assets/no-data.svg"
      />
      <div class="text-center q-pt-md">No data</div>
    </span>
    <div v-if="focusedRecord" style="z-index: 10" class="full-width">
      <DetailForm
        :loading="loading"
        embedded
        :display="display"
        :saving="saving"
        :dense="dense"
        :fields="detailFields"
        :changes="changes"
        :resource="resource"
        :record="focusedRecord.row"
        :editing="application.editing"
        :focused="focusedField"
        :dark="dark"
        mode="update"
        @change="update"
        @focus="unfocus"
      />
    </div>
    <ResourceInfoDialog
      :value="showInfoDialog"
      @input="showInfoDialog = $event"
      :view="currentView"
      :dense="dense"
      :dark="dark"
      :title="infoDialogTitle"
      :include="include"
      :sort="sort"
      :fields="fields"
      :resource="resource"
      :pagination="serverPagination"
      :filter="filter"
      :rows="rows"
      :selected="selected"
      :viewType="viewType"
      :chart="chart"
      :filtersChanged="areFiltersCustomized"
      :fieldsChanged="areFieldsCustomized"
      :sortChanged="isSortCustomized"
      :chartChanged="isChartCustomized"
      @saveView="saveView"
      @deleteView="deleteView"
      @import="showImportDialog = true"
      @export="confirmExport"
    />
    <ResourceFieldDialog
      v-model="showFieldDialog"
      :dense="dense"
      :dark="dark"
      :resource="resource"
      :include="include"
      :fields="fields"
      :data="rows"
      @change="onFieldChange"
    />
    <ResourceFilterDialog
      v-model="showFilterDialog"
      :dense="dense"
      :dark="dark"
      :resource="resource"
      :filter="filter"
      @update="onFilterUpdate"
    />
    <AddDialog
      :value="showAddDialog"
      @input="showAddDialog = $event"
      @added="added"
      :dense="dense"
      :dark="dark"
      :resource="resource"
    />
    <ImportDialog
      :value="showImportDialog"
      @input="showImportDialog = $event"
      :dense="dense"
      :dark="dark"
      :resource="resource"
    />
    <ChartDialog
      :value="showChartDialog"
      @input="showChartDialog = $event"
      @update="onChartUpdate"
      :dense="dense"
      :dark="dark"
      :resource="resource"
      :chart="chart"
    />
    <ResourceBulkEditDialog
      :value="showBulkEditDialog"
      @input="showBulkEditDialog = $event"
      :dense="dense"
      :dark="dark"
      :resource="resource"
      :rows="selected"
      :loaded="rows.length"
      :total="serverPagination.total"
      @updated="selectionUpdated"
    />
    <div
      :class="{
        'absolute-bottom': !dense,
        'fixed-bottom': dense,
        'full-width bottom-bar': true,
      }"
      style="z-index: 11"
      v-if="!fullscreen"
    >
      <ActionBar :dark="dark" :saving="saving" right>
        <IconButton
          left
          :iconColor="isViewCustomized && !selected.length ? 'primary' : null"
          v-if="!focused"
          :dense="dense"
          :dark="dark"
          flat
          :icon="infoIcon"
          :label="infoLabel"
          @click="showInfoDialog = true"
        />
        <IconButton
          left
          :dense="dense"
          :dark="dark"
          flat
          icon="delete"
          label="Delete"
          v-if="false && resource.canDelete() && selected.length && !focused"
          color="red-5"
        />
        <IconButton
          :dense="dense"
          :dark="dark"
          icon="close"
          label="Cancel"
          v-if="application.editing && !saving"
          @click="discard"
        />
        <IconButton
          label="Copy"
          :dark="dark"
          icon="link"
          :dense="dense"
          v-if="(focused && !application.editing) || saving"
          @click="copy"
        />
        <IconButton
          center
          :dark="dark"
          :textColor="areFieldsCustomized ? 'primary' : null"
          :dense="dense"
          icon="mdi-table-column"
          flat
          :label="fieldsLabel"
          :badge="fieldsBadge"
          v-if="
            !selected.length &&
            !focused &&
            viewType !== 'chart'
          "
          @click="showFieldDialog = true"
        />
        <IconButton
          center
          :dark="dark"
          :textColor="areFiltersCustomized ? 'primary' : null"
          :dense="dense"
          icon="mdi-filter-outline"
          :badge="filterBadge"
          flat
          :label="filterLabel"
          v-if="!selected.length && !focused"
          @click="showFilterDialog = true"
        />
        <IconButton
          center
          :dark="dark"
          :textColor="isChartCustomized ? 'primary' : null"
          :dense="dense"
          icon="mdi-chart-box-outline"
          flat
          label="Summary"
          v-if="!selected.length && !focused"
          @click="showChartDialog = true"
        />
        <IconButton
          label="Table"
          :dark="dark"
          icon="table_chart"
          v-if="
            !application.editing &&
            !saving &&
            canDisplayTable &&
            display !== 'table'
          "
          :dense="dense"
          @click="displayTable"
        />
        <IconButton
          label="List"
          icon="list"
          :dark="dark"
          v-if="
            !application.editing &&
            !saving &&
            canDisplayTable &&
            display === 'table'
          "
          :dense="dense"
          @click="displayList"
        />
        <IconButton
          v-if="!selected.length && !focused && !application.editing && !saving"
          :dense="dense"
          :dark="dark"
          :icon="currentViewTypeIcon"
          :label="currentViewTypeLabel"
        >
          <q-menu auto-close>
            <q-list dense>
              <q-item
                v-for="v in availableViewTypes"
                :key="v.key"
                clickable
                @click="setViewType(v.key)"
                :active="viewType === v.key"
              >
                <q-item-section side>
                  <q-icon :name="v.icon" />
                </q-item-section>
                <q-item-section>{{ v.label }}</q-item-section>
              </q-item>
            </q-list>
          </q-menu>
        </IconButton>
        <IconButton
          :dense="dense"
          :dark="dark"
          icon="add"
          label="Add"
          v-if="
            !selected.length &&
            !focused &&
            viewType !== 'chart' &&
            resource.canCreate()
          "
          color="primary"
          @click="showAddDialog = true"
        />
        <IconButton
          :dense="dense"
          :dark="dark"
          icon="edit"
          label="Edit"
          v-if="
            focused && resource.canWrite(focusedField) && !application.editing
          "
          color="primary"
          @click="edit"
        />
        <IconButton
          :dense="dense"
          :dark="dark"
          icon="edit"
          label="Edit"
          v-if="selected.length && viewType !== 'chart'"
          color="primary"
          @click="showBulkEditDialog = true"
        />
        <IconButton
          :dense="dense"
          :dark="dark"
          icon="done"
          label="Save"
          v-if="!saving && application.editing && changes"
          color="primary"
          @click="save"
        />
      </ActionBar>
    </div>
  </q-page>
</template>

<script>
import { useQuasar } from "quasar";
import { onMounted, watch, defineComponent, computed, ref, nextTick } from "vue";
import {
  DataChart,
  ChartDialog,
  TableCell,
  TableHeaderCell,
  AddDialog,
  DetailForm,
  ActionBar,
  IconButton,
  ImportDialog,
  PageLink,
  ResourceFilterDialog,
  ResourceInfoDialog,
  ResourceFieldDialog,
  ResourceBulkEditDialog,
} from "../components";
import { useRoute, useRouter } from "vue-router";
import { useStore } from "vuex";
import {
  getErrorMessage,
  isEqual,
  buildSave,
  buildAdd,
  handleError,
  deserializeFilterQuery,
} from "../utilities";
import { useHead } from "@vueuse/head";
import api from "../api";

const deserializeSort = (x) => (x ? x.split(",") : []);
const serializeSort = (x) => (x ? x.join(",") : "");
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

const serializeFilter = (x) => (x ? JSON.stringify(x) : undefined);
const stripResource = (x) => {
  if (!x) {
    return undefined;
  }
  let result = { ...x };
  delete result.resource;
  return result;
};
const serializeChart = (x) => {
  if (!x) {
    return undefined;
  }
  return JSON.stringify(stripResource(x));
};
const serializeInclude = (x) =>
  Object.entries(x)
    .map(([item, value]) => {
      return value ? item : `-${item}`;
    })
    .join(",");

export default defineComponent({
  components: {
    ActionBar,
    TableCell,
    TableHeaderCell,
    IconButton,
    DetailForm,
    AddDialog,
    ImportDialog,
    ResourceFieldDialog,
    ResourceFilterDialog,
    ResourceInfoDialog,
    ResourceBulkEditDialog,
    ChartDialog,
    DataChart,
    PageLink,
  },
  setup() {
    const $q = useQuasar();
    const route = useRoute();
    const router = useRouter();
    const store = useStore();
    const database = store.$db();
    const $Resource = database.model("_resources");
    const Application = database.model("_application");
    const application = computed(() => Application.getInstance());
    const rows = ref([]);
    const loading = ref(0);
    const chartLoading = ref(0);
    const changes = ref({});
    const pagination = ref({
      rowsPerPage: 0,
    });
    const serverPagination = ref({
      page: 1,
      total: null,
      totalPages: null,
      more: false,
    });
    const resource = computed(() => $Resource.find(route.params.resource));
    useHead({
      title: computed(() => {
        const $resource = resource.value;
        return $resource ? $resource.title : "...";
      }),
    });
    const nameField = computed(() => resource.value.name_field);
    const selected = ref([]);
    const focused = computed(() => route.query.focused);
    const infoLabel = computed(() => {
      const selectedLength = selected.value.length;
      let left = selectedLength ? selectedLength : rows.value.length;
      let right = serverPagination.value.total;
      if (right === null) {
        return "";
      }
      if (left > right) {
        right = left;
      }
      right = Number(right).toLocaleString();
      left = Number(left).toLocaleString();
      const suffix = "Records";
      const base =
        !selectedLength || selectedLength === rows.value.length
          ? `${right}`
          : `${left} / ${right}`;
      return dense.value ? base : `${base} ${suffix}`;
    });

    const total = computed(() =>
      serverPagination.value.total ? serverPagination.value.total : "?"
    );
    const confirmExport = () => {
      $q.dialog({
        title: "Please Confirm",
        class: dense.value ? "dense" : "",
        message: `Are you sure you want to export this data? ${total.value} records will be sent to your email`,
        ok: "Yes",
        cancel: "No",
      }).onOk(async () => {
        let url = window.location.href;
        const path = url.match(/^(?:http:\/\/)?localhost(?:[:]\d+)?(\/.*)$/);
        if (path) {
          // replace localhost with equivalent dev server URL
          url = `${window.location.origin}${path[1]}`;
        }
        let response;
        try {
          response = await api.post("exports", { data: { request_url: url } });
        } catch (error) {
          $q.notify({
            timeouit: 0,
            type: "negative",
            color: "red",
            message: `Export failed: ${getErrorMessage(error)}`,
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
        const exportRequest = response.data["export"];
        let message = `You will receive an email titled "${exportRequest.name}"`;
        if (!dense.value) {
          message = "Export in progress, once completed, " + message;
        }
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
      });
    };

    const columns = computed(() =>
      {
        const resolved = resource.value.getFields({
          view: "list",
          include: include.value,
          deferred: false,
          read: true,
        });

        const hasVisibleResolvedColumns = resolved.some(
          (column) => column.visible && !column.hidden
        );
        if (hasVisibleResolvedColumns) {
          return resolved;
        }

        return fields.value.filter((field) => {
          const name = field.name;
          if (!name || field.hidden || name === resource.value.id_field) {
            return false;
          }

          const permissions = resource.value.getFieldPermissions(name);
          if (permissions.read === false) {
            return false;
          }

          if (name === resource.value.name_field) {
            return true;
          }

          if (typeof include.value[name] !== "undefined") {
            return !!include.value[name];
          }

          return !field.deferred;
        });
      }
    );
    const fields = computed(() => resource.value.getFields());
    const detailFields = computed(() =>
      resource.value.getFields({ include: include.value })
    );
    const visibleColumnsLength = computed(() => visibleColumns.value.length);
    const visibleColumns = computed(() => {
      let result = columns.value
        .filter((column) => column.visible && !column.hidden)
        .map((column) => column.name);
      if (!!loading.value && !rows.value.length) {
        // do not display all columns while loading
        result = result.slice(0, dense.value ? 8 : 16);
      }
      return result;
    });
    const table = ref(null);
    const onScroll = async (props) => {
      const BUFFER = 45;
      const { index, direction, to, ref } = props;
      if (
        !loading.value &&
        direction === "increase" &&
        index >= to - BUFFER &&
        to >= rows.value.length - BUFFER &&
        serverPagination.value.more
      ) {
        serverPagination.value.page = serverPagination.value.page + 1;
        loading.value = 1;
        table.value.requestServerInteraction({
          pagination: serverPagination.value,
        });
      }
    };
    const onListLoad = async (_index, done) => {
      if (!serverPagination.value.more || loading.value) {
        done(!serverPagination.value.more);
        return;
      }
      serverPagination.value.page = serverPagination.value.page + 1;
      await request({ pagination: serverPagination.value });
      done(!serverPagination.value.more);
    };

    const requestInProgress = ref(null);
    const chartRequestInProgress = ref(null);
    const requestChart = async () => {
      if (chartRequestInProgress.value) {
        chartRequestInProgress.value.abort();
        chartRequestInProgress.value = null;
      }
      if (
        !resource.value ||
        !route.params.resource ||
        route.params.id ||
        !chart.value ||
        viewType.value === "table"
      ) {
        return;
      }
      chartLoading.value = 1;
      chartRequestInProgress.value = new AbortController();
      let response;
      try {
        response = await resource.value.getAPI({
          filter: filter.value,
          combine: chart.value,
          signal: chartRequestInProgress.value.signal,
        });
      } catch (e) {
        chartRequestInProgress.value = null;
        return handleError($q, e);
      }
      chartRequestInProgress.value = null;
      chartData.value = response.data.data;
      chartLoading.value = 0;
    };
    const request = async (props) => {
      if (requestInProgress.value) {
        requestInProgress.value.abort();
        requestInProgress.value = null;
      }
      if (!resource.value || !route.params.resource || route.params.id) {
        return; // stop
      }
      if (props.clear) {
        rows.value = [];
        selected.value = [];
        serverPagination.value.page = 1;
        serverPagination.value.total = null;
        serverPagination.value.more = false;
      }
      loading.value = 1;
      const name = route.params.resource;
      const { page } = props.pagination || serverPagination.value;
      requestInProgress.value = new AbortController();
      let response;
      try {
        response = await resource.value.getAPI({
          view: "list",
          sort: sort.value,
          include: effectiveInclude.value,
          filter: filter.value,
          page,
          signal: requestInProgress.value.signal,
        });
      } catch (e) {
        requestInProgress.value = null;
        return handleError($q, e);
      }

      requestInProgress.value = null;
      if (route.params.resource !== name) {
        // we switched to a different resource
        loading.value = 0;
        return;
      }
      const meta = response.data.meta;

      if (meta) {
        if (meta.total_pages) {
          serverPagination.value.totalPages = meta.total_pages;
          serverPagination.value.more = meta.total_pages > meta.page;
        }
        if (meta.total_results) {
          serverPagination.value.total = meta.total_results;
        }
        if (meta.more_pages) {
          serverPagination.value.more = true;
        }
      }
      const data = response.data[name];
      if (!rows.value.length) {
        rows.value = data;
      } else {
        let prev_row_count = rows.value.length;
        rows.value.splice(rows.value.length, 0, ...data);
        if (prev_row_count === selected.value.length) {
          selected.value.splice(selected.value.length, 0, ...data);
        }
      }
      loading.value = 0;
    };

    const include = computed(() => deserializeInclude(route.query.include));
    const filter = computed(() => deserializeFilter(route.query.filter));
    const sort = computed(() => deserializeSort(route.query.sort));
    const chartData = ref({});
    const chart = computed(() => {
      const base = deserializeChart(route.query.chart);
      const qt = route.query.view_type;
      if (
        qt === "table" ||
        qt === "chart" ||
        qt === "both" ||
        qt === "list"
      ) {
        base.display = qt;
      }
      return {
        ...base,
        resource: resource.value,
      };
    });
    const availableViewTypes = [
      { key: "table", label: "Table", icon: "table_chart" },
      { key: "list", label: "List", icon: "list" },
      { key: "chart", label: "Chart", icon: "bar_chart" },
      { key: "both", label: "Split", icon: "mdi-view-agenda-outline" },
    ];
    const viewType = computed(() => {
      const cd = chart.value && chart.value.display;
      if (cd === "chart" || cd === "both" || cd === "list") return cd;
      return "table";
    });
    const listInclude = computed(() => {
      const $resource = resource.value;
      if (!$resource) return null;
      const result = { "*": false };
      if ($resource.id_field) result[$resource.id_field] = true;
      if ($resource.name_field) result[$resource.name_field] = true;
      if ($resource.style) {
        const styleField = Object.keys($resource.style)[0];
        if (styleField) result[styleField] = true;
      }
      return result;
    });
    const effectiveInclude = computed(() =>
      viewType.value === "list" && listInclude.value
        ? listInclude.value
        : include.value
    );
    const setViewType = (mode) => {
      const query = { ...route.query };
      if (!mode) {
        delete query.view_type;
      } else {
        query.view_type = mode;
      }
      router.push({ name: route.name, query, params: route.params });
    };
    watch(
      [viewType, resource, () => route.query.chart],
      () => {
        const $resource = resource.value;
        if (
          !$resource ||
          (viewType.value !== "chart" && viewType.value !== "both")
        ) {
          return;
        }
        const existing = deserializeChart(route.query.chart);
        if (existing && existing.type) {
          return;
        }
        const defaultChart = {
          ...existing,
          type: "value",
          combine: $resource.id_field,
          combine_using: "count",
        };
        const query = {
          ...route.query,
          chart: serializeChart(defaultChart),
        };
        router.replace({ name: route.name, query, params: route.params });
      },
      { immediate: true }
    );
    const currentViewTypeIcon = computed(
      () =>
        availableViewTypes.find((v) => v.key === viewType.value)?.icon ||
        "table_chart"
    );
    const currentViewTypeLabel = computed(
      () =>
        availableViewTypes.find((v) => v.key === viewType.value)?.label ||
        "Table"
    );
    watch(viewType, () => {
      nextTick(() => {
        if (table.value && typeof table.value.resetVirtualScroll === "function") {
          table.value.resetVirtualScroll();
        }
      });
    });
    const checkpoint = ref({});
    const chartCheckpoint = ref({});

    const getChartCheckpoint = () =>
      CHART_REQUEST_FIELDS.reduce(
        (acc, field) => {
          acc[field] = chart.value[field];
          return acc;
        },
        { filter: route.query.filter }
      );
    const getCheckpoint = () => ({
      resource: route.params.resource,
      include: route.query.include,
      filter: route.query.filter,
      sort: route.query.sort,
      viewType: viewType.value,
    });

    const CHART_REQUEST_FIELDS = [
      "advanced",
      "type",
      "combine",
      "combine_using",
      "combine_ex",
      "over",
      "over_using",
      "over_ex",
      "by",
      "by_using",
      "by_ex",
    ];
    watch(chart, () => {
      const check = getChartCheckpoint();
      if (!isEqual(check, chartCheckpoint.value)) {
        chartCheckpoint.value = check;
        requestChart();
      }
    });
    const includeEqual = (newValue, oldValue) => {
      if (isEqual(newValue, oldValue)) {
        return true;
      }
      return false;
      /* TODO make include updates more efficient in case where one field is hidden

      const $newValue = deserializeInclude(newValue);
      const $oldValue = deserializeInclude(oldValue);
      if (isEqual($newValue, $oldValue)) {
        return true;
      }
      let result = true;
      Object.entries($newValue).forEach(([key, value]) => {
        if (result && value) {
          if (!$oldValue[key]) {
            result = false;
          }
        }
      });
      return result;
      */
    };
    watch(
      () => [
        route.params.resource,
        include.value,
        filter.value,
        sort.value,
        viewType.value,
      ],
      () => {
        const check = getCheckpoint();
        const { resource, include, filter, sort, viewType: prevViewType } =
          checkpoint.value;
        checkpoint.value = check;
        if (
          check.resource !== resource ||
          !includeEqual(check.include, include) ||
          !isEqual(check.filter, filter) ||
          !isEqual(check.sort, sort) ||
          // The "list" view-type requests a different field set, so reload
          // whenever we enter or leave it.
          (check.viewType === "list") !== (prevViewType === "list")
        ) {
          request({ clear: true });
        }
      }
    );
    // initial request when the component mounts
    onMounted(() => {
      if (application.value.loaded) {
        checkpoint.value = getCheckpoint();
        chartCheckpoint.value = getChartCheckpoint();
        if (
          currentViewKey.value &&
          !checkpoint.value.include &&
          !checkpoint.value.filter &&
          !checkpoint.value.sort
        ) {
          onViewChanged(currentViewKey.value, true);
        }
        request({ clear: true });
        requestChart();
      }
    });
    const dense = computed(() => $q.screen.lt.md);
    const showInfoDialog = ref(false);
    const showFieldDialog = ref(false);
    const showChartDialog = ref(false);
    const showAddDialog = ref(false);
    const showBulkEditDialog = ref(false);
    const showImportDialog = ref(false);
    const showFilterDialog = ref(false);
    const saving = ref(false);
    const focusedRecord = computed(() => {
      const $focused = focused.value;
      const $resource = resource.value;
      if (!$focused || !$resource) {
        return null;
      }
      const parts = $focused.split("/");
      if (parts.length !== 2) {
        return null;
      }
      const id = parts[0];
      let result = $resource.getRecord(id);
      if (result) {
        return { row: result };
      }
      rows.value.forEach((row, index) => {
        if (!result && $resource.getRecordId(row) === id) {
          result = { row, index };
        }
      });
      return result;
    });
    const focusedRow = computed(() =>
      focusedRecord.value ? focusedRecord.value.row : null
    );
    const canDisplayTable = computed(() => {
      const $resource = resource.value;
      const $focused = focusedField.value;
      const $record = focusedRow.value;
      return (
        $focused &&
        $record &&
        $resource &&
        $resource.getPathField($focused)?.type === "many" // && !isEmpty($resource.getValue($record, $focused))
      );
    });
    const sortClicked = (col, reverse) => {
      const $sort = [`${reverse ? "-" : ""}${col.name}`];
      router.push({
        name: route.name,
        query: { ...route.query, sort: serializeSort($sort) },
        params: route.params,
      });
    };
    const cellClicked = (row, col) => {
      const $row = rows.value[row];
      const $resource = resource.value;
      if (!$row) {
        // TODO: column dropdown
        return;
      }
      if (selected.value.length) {
        // toggle row selection
        const $rowId = $resource.getRecordId($row);
        const selectedIndex = selected.value
          .map((x, i) => [x, i])
          .filter((row) => $resource.getRecordId(row[0]) === $rowId)
          .map((x) => x[1]);
        if (selectedIndex.length) {
          selected.value.splice(selectedIndex[0], 1);
        } else {
          selected.value.push($row);
        }
        return;
      }
      const id = $resource.getRecordId($row);
      const field = col.name;
      const focused = `${id}/${field}`;
      const query = { ...route.query, focused };
      router.push({ name: route.name, query, params: route.params });
    };
    const unfocus = () => {
      const query = { ...route.query, focused: undefined };
      router.push({ name: route.name, query, params: route.params });
    };
    const onFieldChange = (change) => {
      const changeList = Object.entries(change);
      if (!changeList.length) {
        return;
      }
      const $include = { ...include.value };
      const $resource = resource.value;
      changeList.forEach(([field, value]) => {
        if (field.includes(".")) {
          if (value) {
            $include[field] = true;
          } else {
            delete $include[field];
          }
          return;
        }
        const $field = $resource.fields[field];
        if (value) {
          if ($field.deferred) {
            $include[field] = value;
          } else if (typeof $include[field] !== "undefined") {
            delete $include[field];
          }
        } else {
          if ($field.deferred) {
            delete $include[field];
          } else {
            $include[field] = value;
          }
        }
      });
      router.push({
        name: route.name,
        query: { ...route.query, include: serializeInclude($include) },
        params: route.params,
      });
    };
    const dark = computed(() => $q.dark.isActive);
    const infoIcon = computed(() => {
      if (selected.value.length) {
        return "check_box";
      }
      const $resource = resource.value;
      return `mdi-${$resource.icon}`;
    });
    const fieldsBadge = computed(() => {
      return `${visibleColumnsLength.value}`;
    });
    const fieldsLabel = computed(() => {
      return "Fields";
    });
    const filterLabel = computed(() => {
      return "Filters";
    });
    const filterBadge = computed(() => {
      return `${filter.value.length}`;
    });
    const focusedField = computed(() => {
      const $focused = focused.value;
      if (!$focused) {
        return null;
      }
      const parts = $focused.split("/");
      if (parts.length !== 2) {
        return null;
      }
      return parts[1];
    });
    const onFilterUpdate = (update) =>
      router.push({
        name: route.name,
        query: { ...route.query, filter: serializeFilter(update) },
        params: route.params,
      });
    const onChartUpdate = (update) => {
      const query = { ...route.query, chart: serializeChart(update) };
      const hasChart = update && update.type;
      if (viewType.value === "table" && hasChart) {
        // A chart was just configured while viewing the table only — switch
        // to split so the newly-defined summary becomes visible. Runs before
        // honoring update.display, which the dialog pre-populates from the
        // current view and would otherwise pin us back to "table".
        query.view_type = "both";
      } else if (update.display === "table") {
        delete query.view_type;
      } else if (update.display === "chart" || update.display === "both") {
        query.view_type = update.display;
      }
      router.push({ name: route.name, query, params: route.params });
    };
    const save = buildSave({
      changes,
      updateLocal: true,
      record: focusedRow,
      saving,
      Application,
      quasar: $q,
      resource,
    });

    const discard = () => {
      Application.stopEditing();
      changes.value = null;
    };
    const update = (value) => {
      changes.value = value;
    };
    const edit = () => Application.startEditing();
    const infoDialogTitle = computed(() => {
      if (currentView.value) {
        return currentView.value.name;
      }
      return resource.value.title;
    });
    const copy = () => {
      // support exporting parts of the table with copy
      if (!focused.value) {
        return;
      }
      $q.notify({
        type: "positive",
        color: dark.value ? "grey-3" : "black",
        message: "Data copied",
        icon: "link",
        timeout: 750,
        textColor: dark.value ? "black" : "white",
        classes: "full-width q-mr-none q-ml-none",
      });
      navigator.clipboard.writeText(
        resource.value.getExportValue(focusedRow.value, focusedField.value)
      );
    };
    const display = ref("list");
    const displayTable = () => {
      display.value = "table";
    };
    const displayList = () => {
      display.value = "list";
    };
    const getRowIndex = (index) => {
      const $resource = resource.value;
      const recordId = $resource.getRecordId(selected.value[index]);
      const $rows = rows.value;
      for (let i = 0; i < $rows.length; i++) {
        if ($resource.getRecordId($rows[i]) === recordId) {
          return i;
        }
      }
      return -1;
    };
    const selectionUpdated = ({ index, data }) => {
      const rowIndex = getRowIndex(index);
      if (rowIndex > -1) {
        rows.value[rowIndex] = {
          ...(selected.value[index] || {}),
          ...data,
        };
      }
    };
    const added = (newRecord) => {
      rows.value.push(newRecord);
    };
    const currentViewKey = computed(() => {
      if (!resource.value) {
        return null;
      }
      return route.query.view;
    });
    const currentView = computed(() => {
      const $views = views.value;
      const $name = currentViewKey.value;
      return $views[$name];
    });
    const lastViewKey = ref(null);
    const onViewChanged = (viewKey, replace) => {
      if (lastViewKey.value === viewKey) {
        return;
      }
      const view = views.value[viewKey];
      const query =
        view && view.data
          ? {
              ...route.query,
              chart: serializeChart(view.data.chart),
              include: serializeInclude(view.data.fields),
              filter: serializeFilter(view.data.filters),
              sort: serializeSort(view.data.sort),
            }
          : {
              ...route.query,
              include: undefined,
              filter: undefined,
              chart: undefined,
              sort: undefined,
            };
      lastViewKey.value = viewKey;
      const routerChange = replace ? router.replace : router.push;
      routerChange({ name: route.name, query, params: route.params });
    };
    watch(() => currentViewKey.value, onViewChanged);
    const views = computed(() =>
      resource.value ? Application.getViews(resource.value.name) : {}
    );
    const areFiltersCustomized = computed(
      () =>
        !isEqual(
          filter.value,
          currentView.value ? currentView.value.data.filters : null
        )
    );
    const areFieldsCustomized = computed(
      () =>
        !isEqual(
          include.value,
          currentView.value ? currentView.value.data.fields : null
        )
    );
    const isSortCustomized = computed(
      () =>
        !isEqual(
          sort.value,
          currentView.value ? currentView.value.data.sort : null
        )
    );
    const isChartCustomized = computed(
      () =>
        !isEqual(
          deserializeChart(route.query.chart),
          currentView.value ? currentView.value.data.chart : null
        )
    );
    const isViewCustomized = computed(
      () =>
        isChartCustomized.value ||
        areFiltersCustomized.value ||
        areFieldsCustomized.value ||
        isSortCustomized.value
    );
    const deleteView = () => {
      const query = { ...route.query, view: undefined };
      router.push({ name: route.name, query, params: route.params });
    };
    const saveView = async (view) => {
      if (!resource.value) {
        throw new Error(
          "Unexpected call to save view outside of resource scope"
        );
      }
      const View = $Resource.find("views");
      if (!View) {
        if (!resource.value) {
          throw new Error("Failed to save view: 'views' resource not found");
        }
      }
      if (!view || !view.name) {
        throw new Error(
          `Failed to save view: name is not provided, view = ${view}`
        );
      }
      const then = (record) => {
        const query = { ...route.query, view: record.id };
        router.push({ name: route.name, query, params: route.params });
      };
      const data = {
        name: view.name,
        resource: resource.value.name,
        data: {
          fields: include.value,
          filters: filter.value,
          sort: sort.value,
          chart: stripResource(chart.value),
        },
      };
      let save;
      if (!view.id) {
        // save new view
        save = buildAdd({
          quasar: $q,
          saving,
          resource: { value: View },
          data: { value: data },
          then,
        });
      } else {
        // update existing view
        save = buildSave({
          quasar: $q,
          saving,
          resource: { value: View },
          record: { value: view },
          changes: { value: data },
          then,
        });
      }
      await save();
    };
    const hideField = (field) => {
      onFieldChange({ [field.name]: false });
    };
    const skeletonRows = computed(() => {
      if (rows.value.length) {
        return [];
      }
      const len = 40; // dense.value ? 25 : 40;
      const result = [...Array(len)].map((_) =>
        fields.value.reduce((acc, field) => {
          acc[field] = field;
          return acc;
        }, {})
      );
      return result;
    });
    const toggleTable = () => {
      setViewType(viewType.value === "both" ? "chart" : "both");
    };
    const fullscreen = computed(
      () => typeof route.query.fullscreen !== "undefined"
    );
    return {
      fullscreen,
      added,
      application,
      areFieldsCustomized,
      areFiltersCustomized,
      canDisplayTable,
      cellClicked,
      changes,
      chart,
      chartData,
      chartLoading,
      columns,
      copy,
      currentView,
      dark,
      dense,
      detailFields,
      discard,
      display,
      displayList,
      displayTable,
      edit,
      confirmExport,
      fields,
      fieldsLabel,
      filter,
      filterLabel,
      focused,
      focusedField,
      focusedRecord,
      focusedRow,
      include,
      infoDialogTitle,
      infoIcon,
      infoLabel,
      isChartCustomized,
      isSortCustomized,
      isViewCustomized,
      loading,
      nameField,
      onChartUpdate,
      onFieldChange,
      onFilterUpdate,
      onScroll,
      onListLoad,
      pagination,
      request,
      resource,
      rows,
      save,
      saveView,
      deleteView,
      saving,
      selected,
      selectionUpdated,
      serverPagination,
      showAddDialog,
      showBulkEditDialog,
      showImportDialog,
      showChartDialog,
      showFieldDialog,
      showFilterDialog,
      showInfoDialog,
      skeletonRows,
      sort,
      sortClicked,
      hideField,
      table,
      unfocus,
      update,
      toggleTable,
      visibleColumns,
      fieldsBadge,
      filterBadge,
      viewType,
      setViewType,
      availableViewTypes,
      currentViewTypeIcon,
      currentViewTypeLabel
    };
  },
});
</script>
