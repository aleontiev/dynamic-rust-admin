<style lang="scss">
.body--dark .Field:not(.Field--changed) .Field__label {
  color: $grey-5;
}
.inline-table.q-table__container .q-table__middle {
  padding-bottom: 0;
}
.Field {
  iframe {
    border: none;
  }
  video {
    max-height: 100%;
  }
  &.dark .vue-apexcharts .apexcharts-canvas > svg {
    background-color: var(--q-dark) !important;
  }
  .Field__label {
    color: $grey-9;
  }
  &.Field--changed .Field__label {
    color: $primary;
  }
  .q-field--auto-height.q-field--labeled .q-field__control-container {
    padding-top: 10px;
  }
  .Field__value div {
    /* min-height: 22px; */
  }
  &:not(.Field--focused) .Field__value div {
    overflow-y: hidden;
    overflow-x: auto;
  }
  &.Field--json {
    .Field__value {
      white-space: pre !important;
    }
  }

  .Field__value {
    white-space: pre;
    .Field__value--link {
      white-space: pre-line;
    }
    .Field__value--link:after {
      content: "\a";
    }
    .q-chip.row {
      width: 100%;
    }
  }
  .Field__value.Field__value--jsoneditor {
    white-space: normal;
    overflow: visible;
  }
  .Field__value.Field__value--jsoneditor div {
    overflow: visible !important;
    max-height: none !important;
  }
  &:not(.Field--focused) .Field__value div {
    max-height: 350px;
  }
  &:not(.Field--focused) .Field__inner > div {
    max-height: 350px;
    overflow: hidden;
  }
  &:not(.Field--focused) .Field__chart {
    height: 350px;
  }
  &.Field--chart-auto:not(.Field--focused) .Field__inner > div {
    max-height: none;
    overflow: visible;
  }
  &.Field--chart-auto:not(.Field--focused) .Field__chart {
    height: auto;
  }
  .Field__value .q-field__append {
    overflow: hidden;
    margin-left: 8px;
  }
  &.Field--invisible {
    opacity: 0;
  }
  &.Field--gone {
    display: none;
  }
  &:not(.Field--focused):not(.Field--inlineedit):not(.Field--file) .Field__value {
    padding-top: 18px;
    padding-bottom: 15px;
  }
  &.Field--file .Field__value {
    padding-top: 18px;
    padding-bottom: 0px;
  }
  .Field__inner {
    position: relative;
  }
  .Field__main {
    align-items: center;
  }
  &.Field--changed:not(.Field--filters)
    .q-field--standard
    .q-field__control:after {
    transform: scale3d(1, 1, 1);
  }
  &.Field--focused {
    overflow-x: auto;
    &.Field--table {
      overflow: hidden;
      .Field__main {
        position: static;
      }
    }
    &:not(.dense) {
      bottom: 50px;
    }
    position: absolute;
    overflow: auto;
    top: 110px;
    left: 0px;
    right: 0px;
    bottom: 40px;
    .Field__main {
      position: relative;
    }
    &.Field--short .Field__main {
      font-size: 3rem;
      justify-content: center;
    }
    .Field__main {
      justify-content: center;
    }
    &.Field--short .Field__inner {
      align-items: center;
      justify-content: center;
    }
    &.Field--long .Field__main {
      font-size: 1rem;
    }
    :not(.tableMode) .Field__inner {
      padding-left: 20px;
      padding-right: 20px;
    }
    &.Field--chart {
      overflow: hidden;
      display: flex;
      flex-direction: column;
      .Field__main {
        flex: 1;
        min-height: 0;
        position: static;
        justify-content: initial;
      }
      .Field__inner {
        height: 100%;
        display: flex;
        flex-direction: column;
        padding-left: 0;
        padding-right: 0;
      }
      .Field__chart {
        flex: 1;
        min-height: 0;
        display: flex;
        flex-direction: column;
      }
      .Field__chart.Field__chart--split {
        gap: 12px;
      }
      .Field__chart-pane {
        min-height: 0;
      }
      .Field__chart-pane--chart {
        flex: 1;
      }
      .Field__chart-pane--table {
        flex: 1;
        min-height: 0;
      }
    }
  }
}
</style>
<template>
  <div
    ref="fieldRoot"
    :data-field="field.name"
    @scroll.passive="onFieldScroll"
    :class="{
      'Field--table': tableMode,
      'Field--chart': chartMode,
      'Field--chart-auto': inlineChartAuto,
      dark: dark,
      dense: dense,
      'Field--inlineedit': editMode && inline && !isFocused,
      'Field--changed': hasChanged,
      'Field row': true,
      'Field--json': false,
      'Field--filters': field.type === 'filters',
      'Field--gone': !visible || hiddenByEmptyMany,
      'Field--invisible':
        !visible || hiddenByEmptyMany || (focused && !isFocused),
      'Field--focused': isFocused,
      'Field--long': long,
      'Field--short': !long,
      'Field--file':
        field.type === 'image upload' ||
        field.type === 'file upload' ||
        field.item_type === 'image upload' ||
        field.item_type === 'file upload',
    }"
  >
    <div
      @click.stop.prevent="clickIcon"
      class="Field__icon column col-xs col-auto q-mr-md"
      v-if="focused !== name"
    >
      <q-icon :name="icon" size="sm" :color="iconColor" class="clickable" />
    </div>
    <div
      :class="{
        tableMode: tableMode,
        'Field__main column': true,
        'col-xs-10': dense && !focused,
        'col-xs-11': !dense && !focused,
        'col-xs-12': focused,
      }"
    >
      <div :class="{ 'Field__inner full-width': true }">
        <div
          class="absolute top right"
          style="top: -8px; display: flex"
        >
          <q-btn
            v-if="inlineViews.length"
            :icon="inlineViewIcon"
            size="md"
            flat
            round
            color="iconColor"
          >
            <q-menu auto-close>
              <q-list dense>
                <q-item
                  v-for="view in inlineViews"
                  :key="view.key"
                  clickable
                  @click.stop="changeView(view.key)"
                >
                  <q-item-section side>
                    <q-icon :name="view.icon" size="xs" />
                  </q-item-section>
                  <q-item-section>{{ view.label }}</q-item-section>
                </q-item>
              </q-list>
            </q-menu>
          </q-btn>
          <q-btn
            v-if="isJsonField && !isFocused"
            :icon="effectiveJsonMode === 'raw' ? 'mdi-code-json' : 'account_tree'"
            size="md"
            flat
            round
            color="iconColor"
            @click.stop="toggleJsonMode"
          />
          <q-btn
            v-if="canAdd"
            @click.stop.prevent="showAdd"
            icon="add"
            size="md"
            flat
            round
            color="iconColor"
          />
        </div>
        <div
          v-if="canOpen"
          @click.stop.prevent="openExternal"
          class="absolute top right"
          style="top: -8px"
        >
          <q-btn
            :icon="this.field.type === 'iframe' ? 'print' : 'open_in_new'"
            size="md"
            flat
            round
            color="iconColor"
          />
        </div>
        <div
          @click.stop.prevent="clickIcon"
          :class="{
            [iconColorClass]: !!iconColor,
            'Field__label full-width clickable': true,
          }"
          v-if="!isFocused"
          :style="{ color: iconColor }"
        >
          {{ field.label }}
          <span v-if="mode === 'create' && resource.isFieldRequired(field.name)"
            >*</span
          >
        </div>
        <div v-if="tableMode && relatedResource" class="q-mt-sm">
          <DataTable
            :classNames="'naked-header sticky-column' + (isFocused ? ' full-page-content-1' : ' inline-table')"
            selection="none"
            :dense="dense"
            :dark="dark"
            :resource="relatedResource"
            :columns="tableColumns"
            :rows="rows"
            :loading="manyRelation.loading && !rows.length"
            @virtual-scroll="onTableScroll"
          />
        </div>
        <div
          v-else-if="chartMode && relatedResource && (chartData || chartLoadingValue)"
          :class="{
            Field__chart: true,
            'Field__chart--split': showChartTable,
          }"
        >
          <div
            :class="{
              'Field__chart-pane Field__chart-pane--chart': true,
              'half-page-content': showChartTable,
            }"
          >
            <DataChart
              :key="'chart-' + (isFocused ? 'focused' : 'inline')"
              :dense="dense"
              :dark="dark"
              :options="chartOptions"
              :data="chartData"
              :loading="chartLoadingValue"
              :hideToggle="true"
              :externalTooltip="isSequenceChart"
              tooltip
              :height="chartHeight"
              @select="onChartSelect"
            />
          </div>
          <div
            v-if="showChartTable"
            class="Field__chart-pane Field__chart-pane--table"
          >
            <DataTable
              :classNames="'naked-header sticky-column' + (isFocused ? ' half-page-content' : ' inline-table')"
              selection="none"
              :dense="dense"
              :dark="dark"
              :resource="relatedResource"
              :columns="tableColumns"
              :rows="rows"
              :loading="manyRelation.loading && !rows.length"
              @virtual-scroll="onTableScroll"
            />
          </div>
          <q-menu
            v-if="isSequenceChart"
            ref="chartTooltipRef"
            anchor="center middle"
            v-model="showChartTooltip"
            no-parent-event
          >
            <q-list :dark="dark" v-if="chartTooltipRecord">
              <q-item
                :class="{ 'bg-black': dark, 'bg-grey-3': !dark }"
              >
                <q-item-section no-wrap>
                  <a
                    :href="chartTooltipRecord.link"
                    :class="['Link', chartTooltipRecord.headerColor]"
                  >
                    {{ chartTooltipRecord.name }}
                  </a>
                </q-item-section>
              </q-item>
              <q-item
                v-for="(item, i) in chartTooltipRecord.fields"
                :key="i"
                dense
              >
                <q-item-section no-wrap class="text-grey">
                  {{ item.label }}
                </q-item-section>
                <q-item-section side no-wrap>
                  <a
                    v-if="item.link"
                    :href="item.link"
                    :class="['Link', item.color]"
                  >{{ item.value }}</a>
                  <span
                    v-else
                    :class="item.color ? ['Link', item.color] : null"
                  >{{ item.value }}</span>
                </q-item-section>
              </q-item>
            </q-list>
          </q-menu>
        </div>
        <q-skeleton
          type="rect"
          v-else-if="mode !== 'create' && isLoading"
          class="full-width q-mt-md q-mb-sm"
        />
        <div v-else-if="focused && focused !== field.name" class="Field__value">
          place
        </div>
        <div
          v-else-if="field.type === 'object' || field.type === 'json'"
          class="Field__value Field__value--jsoneditor"
        >
          <JsonFieldEditor
            :value="fieldLive"
            :editable="editMode"
            :dark="dark"
            :mode="effectiveJsonMode"
            @update="onUpdate"
          />
        </div>
        <div
          v-else-if="
            editMode ||
            (!field.dynamic &&
              (field.type === 'file upload' ||
                field.type === 'image upload')) ||
            field.type === 'filters' ||
            field.type === 'rich'
          "
          class="Field__value"
          ref="inputValue"
          v-resize-text="null"
        >
          <FieldInput
            :changes="changes"
            :inline="inline"
            :focused="isFocused"
            :dense="dense && !isFocused"
            :dark="dark"
            :parent="inputValue"
            :resource="resource"
            :field="field"
            :record="record"
            :value="fieldLive"
            @update="onUpdate"
            :readonly="readonly || !editMode"
          />
        </div>
        <div v-else-if="!editMode && (long || !isFocused)" class="Field__value">
          <FieldValue
            :focused="isFocused"
            :dense="dense"
            :dark="dark"
            :changes="changes"
            :editing="editing"
            :resource="resource"
            :field="field"
            :record="record"
            :value="fieldLive"
          />
        </div>
        <div
          v-else-if="isFocused"
          class="Field__value"
          v-resize-text="{ ratio: resizeRatio }"
        >
          <FieldValue
            :focused="isFocused"
            :dense="dense"
            :dark="dark"
            :changes="changes"
            :editing="editing"
            :resource="resource"
            :field="field"
            :record="record"
            :value="fieldLive"
          />
        </div>
        <div v-else-if="!resource.canRead(field.name, record)">
          <FieldValue
            :dense="dense"
            :dark="dark"
            :changes="changes"
            :editing="editing"
            :resource="resource"
            :field="field"
            :record="record"
            :value="fieldLive"
          />
        </div>
        <div
          v-if="showManyLoadIndicator"
          class="row justify-center full-width q-my-sm"
        >
          <q-spinner-dots color="primary" size="28px" />
        </div>
        <q-separator
          v-if="!tableMode && !chartMode && !editMode && !noSeparator"
          :dark="dark"
          class="full-width"
          :size="hasChanged ? '2px' : null"
          :color="hasChanged ? 'primary' : null"
        />
        <div
          v-if="!tableMode && !chartMode && isFocused && description"
          v-html="description"
          class="Field__description text-h7 text-grey-7 q-mt-sm"
          style="white-space: pre-line"
        />
      </div>
    </div>
  </div>
</template>

<script>
import { useQuasar } from "quasar";
import { onMounted, onUnmounted, watch, computed, ref } from "vue";
import { handleError, isURL } from "../utilities";
import FieldInput from "./FieldInput.vue";
import FieldValue from "./FieldValue.vue";
import DataTable from "./DataTable.vue";
import DataChart from "./DataChart.vue";
import JsonFieldEditor from "./JsonFieldEditor.vue";
import {
  aggregateChartData,
  getSequenceRecords,
} from "../utilities/aggregateChartData";
import { getManyRelationDefaultChart } from "../utilities/manyRelationChart";

String.prototype.count = function (c) {
  var result = 0,
    i = 0;
  for (i; i < this.length; i++) if (this[i] == c) result++;
  return result;
};
const MANY_RELATION_PAGE_SIZE = 100;
export default {
  props: [
    "dark",
    "resource",
    "record",
    "field",
    "dense",
    "focused",
    "loading",
    "visible",
    "canFocus",
    "editing",
    "changes",
    "inline",
    "display",
    "fieldViews",
    "relatedView",
    "readonly",
    "mode",
    "dynamicIcons",
    "jsonMode",
  ],
  emits: ["focus", "update", "showAdd", "changeFieldView"],
  components: {
    FieldInput,
    FieldValue,
    DataTable,
    DataChart,
    JsonFieldEditor,
  },
  setup(props, context) {
    const $q = useQuasar();
    const live = ref(null);
    const fieldRoot = ref(null);
    const manyRequestInProgress = ref(null);
    const manyRelation = ref({
      ids: [],
      page: 1,
      total: null,
      totalPages: null,
      more: false,
      loading: false,
      initialized: false,
    });
    const chartRequestInProgress = ref(null);
    const relatedChartData = ref(null);
    const relatedChartLoading = ref(false);
    const hasChanged = computed(() => {
      return (
        props.changes && typeof props.changes[props.field.name] !== "undefined"
      );
    });
    const changedValue = computed(() =>
      props.changes ? props.changes[props.field.name] : null
    );
    const value = computed(() =>
      props.resource.getValue(props.record, props.field.name)
    );
    const recordId = computed(() =>
      props.record ? props.resource.getRecordId(props.record) : null
    );
    const usesPagedMany = computed(
      () =>
        !props.field.dynamic &&
        props.field.type === "many" &&
        !!recordId.value &&
        props.mode !== "create"
    );
    const fieldLive = computed(() => {
      if (usesPagedMany.value && !hasChanged.value) {
        return manyRelation.value.ids;
      }
      return live.value;
    });
    const relatedInclude = computed(() => props.relatedView?.include || {});
    const minimalRelatedInclude = computed(() => {
      const related = relatedResource.value;
      if (!related) return null;
      const result = { "*": false };
      if (related.id_field) result[related.id_field] = true;
      if (related.name_field) result[related.name_field] = true;
      if (related.style) {
        const styleField = Object.keys(related.style)[0];
        if (styleField) result[styleField] = true;
      }
      return result;
    });
    // List view only needs id/name/style so it can render linked names.
    // Table/both keep the user's (possibly-customized) include.
    const effectiveListInclude = computed(() => {
      if (
        effectiveDisplay.value === "list" &&
        minimalRelatedInclude.value
      ) {
        return minimalRelatedInclude.value;
      }
      return relatedInclude.value;
    });
    // Skip paging the list entirely when only the chart pane is visible —
    // unless the chart can't be server-aggregated (e.g. sequence() buckets),
    // in which case we still need the raw records to aggregate locally.
    const needsListData = computed(
      () =>
        effectiveDisplay.value !== "chart" ||
        (chartMode.value && !canServerAggregate.value)
    );
    // Identifies which records the field is showing. When this changes we
    // must start over (reset + reload). Crucially it does NOT include the
    // field set — switching list↔table preserves the same rows.
    const relationSelectionKey = computed(() =>
      usesPagedMany.value && needsListData.value
        ? JSON.stringify({
            resource: props.resource.name,
            id: recordId.value,
            field: props.field.name,
            filter: props.relatedView?.filter || [],
          })
        : null
    );
    const relationRequestKey = computed(() =>
      usesPagedMany.value && needsListData.value
        ? JSON.stringify({
            resource: props.resource.name,
            id: recordId.value,
            field: props.field.name,
            include: effectiveListInclude.value,
            filter: props.relatedView?.filter || [],
          })
        : null
    );
    const relatedFilter = computed(() => props.relatedView?.filter || []);
    const relatedChart = computed(() => props.relatedView?.chart || null);
    const relatedChartConfig = computed(() => {
      const chart = relatedChart.value;
      if (!chart) {
        return null;
      }
      const { resource, ...rest } = chart;
      return Object.keys(rest).length ? chart : null;
    });
    const displayValue = computed(() => {
      const target =
        props.changes && typeof props.changes[props.field.name] !== "undefined"
          ? props.changes
          : props.record;
      return props.resource.getDisplayValue(target, props.field.name);
    });
    const reset = () => {
      live.value = hasChanged.value
        ? props.changes[props.field.name]
        : value.value;
    };
    const resetManyRelation = () => {
      manyRelation.value = {
        ids: [],
        page: 1,
        total: null,
        totalPages: null,
        more: false,
        loading: false,
        initialized: false,
      };
    };
    const getRelatedResponseRecords = (response) => {
      const data = response?.data || {};
      const related = relatedResource.value;
      const direct =
        data[props.field.name] ||
        (related ? data[related.name] : null) ||
        (related ? data[related.singular] : null);
      if (Array.isArray(direct)) {
        return direct;
      }
      return Object.values(data).find((entry) => Array.isArray(entry)) || [];
    };
    const syncManyRelationMeta = (meta = {}, page) => {
      manyRelation.value.page = page;
      if (meta.total_pages) {
        manyRelation.value.totalPages = meta.total_pages;
        manyRelation.value.more = meta.total_pages > meta.page;
      } else {
        manyRelation.value.totalPages = null;
        manyRelation.value.more = false;
      }
      if (meta.total_results) {
        manyRelation.value.total = meta.total_results;
      }
      if (meta.more_pages) {
        manyRelation.value.more = true;
      }
    };
    const normalizeRelatedIds = (records) => {
      const related = relatedResource.value;
      if (!related) {
        return [];
      }
      return records
        .map((entry) =>
          typeof entry === "object" && entry !== null
            ? related.getRecordId(entry)
            : entry
        )
        .filter((entry) => entry !== null && typeof entry !== "undefined");
    };
    const loadManyRelationPage = async ({ page = 1, append = false } = {}) => {
      if (!usesPagedMany.value || !recordId.value || manyRelation.value.loading) {
        return;
      }
      if (manyRequestInProgress.value && !append) {
        manyRequestInProgress.value.abort();
      } else if (manyRequestInProgress.value) {
        return;
      }
      manyRelation.value.loading = true;
      const controller = new AbortController();
      manyRequestInProgress.value = controller;
      try {
        const response = await props.resource.getRelatedAPI({
          id: recordId.value,
          field: props.field.name,
          page,
          perPage: MANY_RELATION_PAGE_SIZE,
          include: effectiveListInclude.value,
          filter: relatedFilter.value,
          signal: controller.signal,
        });
        if (manyRequestInProgress.value !== controller) {
          return;
        }
        const nextIds = normalizeRelatedIds(getRelatedResponseRecords(response));
        manyRelation.value.ids = append
          ? [...new Set([...manyRelation.value.ids, ...nextIds])]
          : nextIds;
        syncManyRelationMeta(response.data?.meta || {}, page);
      } catch (error) {
        handleError($q, error, { prefix: `Failed to load ${props.field.label}` });
      } finally {
        if (manyRequestInProgress.value === controller) {
          manyRequestInProgress.value = null;
          manyRelation.value.loading = false;
          manyRelation.value.initialized = true;
        }
      }
    };
    const loadNextManyRelationPage = async () => {
      if (!manyRelation.value.more || manyRelation.value.loading) {
        return;
      }
      await loadManyRelationPage({
        page: manyRelation.value.page + 1,
        append: true,
      });
    };
    const loadRemainingManyRelations = async () => {
      while (
        usesPagedMany.value &&
        editMode.value &&
        !hasChanged.value &&
        manyRelation.value.more &&
        !manyRelation.value.loading
      ) {
        const previousPage = manyRelation.value.page;
        await loadNextManyRelationPage();
        if (manyRelation.value.page === previousPage) {
          break;
        }
      }
    };
    const requestChart = async () => {
      if (chartRequestInProgress.value) {
        chartRequestInProgress.value.abort();
        chartRequestInProgress.value = null;
      }
      const combineConfig = relatedChartConfig.value || defaultChartConfig.value;
      if (
        !usesPagedMany.value ||
        !recordId.value ||
        !chartMode.value ||
        !combineConfig ||
        !canServerAggregate.value
      ) {
        relatedChartData.value = null;
        relatedChartLoading.value = false;
        return;
      }
      relatedChartLoading.value = true;
      const controller = new AbortController();
      chartRequestInProgress.value = controller;
      try {
        const response = await props.resource.getRelatedAPI({
          id: recordId.value,
          field: props.field.name,
          filter: relatedFilter.value,
          combine: combineConfig,
          signal: controller.signal,
        });
        if (chartRequestInProgress.value !== controller) {
          return;
        }
        relatedChartData.value = response.data?.data || null;
      } catch (error) {
        handleError($q, error, {
          prefix: `Failed to summarize ${props.field.label}`,
        });
      } finally {
        if (chartRequestInProgress.value === controller) {
          chartRequestInProgress.value = null;
          relatedChartLoading.value = false;
        }
      }
    };

    const onUpdate = (update) => {
      context.emit("update", update);
    };
    const isFocused = computed(() => {
      return props.focused === props.field.name && props.canFocus;
    });
    onMounted(reset);
    onUnmounted(() => {
      if (manyRequestInProgress.value) {
        manyRequestInProgress.value.abort();
      }
      if (chartRequestInProgress.value) {
        chartRequestInProgress.value.abort();
      }
    });
    watch(
      () => [value.value, changedValue.value, hasChanged.value],
      () => {
        if (
          (hasChanged.value &&
            JSON.stringify(changedValue.value) !==
              JSON.stringify(live.value)) ||
          (!hasChanged.value && live.value !== value.value)
        ) {
          reset();
        }
      }
    );
    watch(
      () => props.editing,
      (value) => {
        if (!value) {
          reset();
        }
      }
    );

    const showAdd = () => {
      context.emit("showAdd");
    };
    const openExternal = () => {
      let $value = value.value;
      if (props.field.type === "iframe") {
        if ($value.indexOf("?") === -1) {
          $value = `${$value}?print=1`;
        } else {
          $value = `${$value}&print=1`;
        }
      }
      window.open($value, "_blank", "noreferrer");
    };

    const clickIcon = () => {
      if (props.field.name !== props.focused) {
        context.emit("focus", props.field.name);
      }
    };
    const isLoading = computed(() => {
      if (usesPagedMany.value && !hasChanged.value) {
        return !manyRelation.value.initialized && manyRelation.value.loading;
      }
      return typeof value.value === "undefined";
    });
    const iconColor = computed(() => {
      if (hasChanged.value) {
        return "primary";
      }
      if (editMode.value && props.inline && !isFocused.value) {
        return props.dark ? "grey-3" : "grey-7";
      }
      return props.dark ? "grey-5" : "grey-9";
    });
    const editMode = computed(() => {
      return (
        props.editing &&
        (isFocused.value || props.inline) &&
        props.resource.canWrite(props.field.name, props.record, props.mode)
      );
    });
    watch(
      editMode,
      (next) => {
        if (next && usesPagedMany.value && manyRelation.value.more) {
          loadRemainingManyRelations();
        }
      },
      { immediate: true }
    );
    const canAutoLoadMany = computed(
      () =>
        usesPagedMany.value &&
        isFocused.value &&
        !editMode.value &&
        manyRelation.value.more &&
        !manyRelation.value.loading
    );
    const onFieldScroll = () => {
      if (!canAutoLoadMany.value || tableMode.value || chartMode.value) {
        return;
      }
      const target = fieldRoot.value;
      if (!target) {
        return;
      }
      if (target.scrollTop + target.clientHeight >= target.scrollHeight - 120) {
        loadNextManyRelationPage();
      }
    };
    const onTableScroll = ({ index, direction, to }) => {
      const BUFFER = 45;
      if (
        !tableMode.value ||
        !canAutoLoadMany.value ||
        direction !== "increase" ||
        index < to - BUFFER ||
        to < rows.value.length - BUFFER
      ) {
        return;
      }
      loadNextManyRelationPage();
    };
    const effectiveDisplay = computed(() => {
      if (isFocused.value) return props.display;
      const fromUrl = props.fieldViews && props.fieldViews[props.field.name];
      if (fromUrl) return fromUrl;
      const views = props.field.extra?.views;
      const def = views?.default;
      if (def && def !== "auto") return def;
      // Auto-chart disabled: always default to list unless explicit config
      // if (props.field.type === "many" && Array.isArray(live.value)) {
      //   const len = live.value.length;
      //   if (len > 30) return "chart";
      //   if (len > 12) {
      //     const fields = relatedResource.value?.fields;
      //     if (fields && (fields.start_date || fields.end_date)) return "chart";
      //   }
      // }
      return "list";
    });
    const tableMode = computed(
      () => effectiveDisplay.value === "table" && props.field.type === "many"
    );
    const chartMode = computed(
      () =>
        (effectiveDisplay.value === "chart" ||
          effectiveDisplay.value === "both") &&
        props.field.type === "many"
    );
    const relatedResource = computed(() => {
      const field = props.field;
      if (!field || !field.related) return null;
      return props.resource.getRelationFromField(field.name);
    });
    const defaultChartConfig = computed(() =>
      getManyRelationDefaultChart(props.field, relatedResource.value)
    );
    // sequence(...) is a visualization-layer bucketing the server doesn't
    // understand, so charts that use it must be aggregated client-side.
    const usesSequence = (value) =>
      typeof value === "string" && /^\s*sequence\s*\(/i.test(value);
    const canServerAggregate = computed(() => {
      const config = relatedChartConfig.value || defaultChartConfig.value;
      if (!config) return true;
      if (config.advanced) {
        if (usesSequence(config.combine_ex)) return false;
        if (usesSequence(config.by_ex)) return false;
        if (usesSequence(config.over_ex)) return false;
      } else {
        if (config.combine_using === "sequence") return false;
        if (config.by_using === "sequence") return false;
        if (config.over_using === "sequence") return false;
        // Backend-defined defaults may put the bucketing directly in the
        // field value, e.g. over: "sequence(end_date)". Catch that too.
        if (usesSequence(config.combine)) return false;
        if (usesSequence(config.by)) return false;
        if (usesSequence(config.over)) return false;
      }
      return true;
    });
    watch(
      () => [
        relationSelectionKey.value,
        chartMode.value,
        relatedChartConfig.value,
        defaultChartConfig.value,
        canServerAggregate.value,
        relatedFilter.value,
      ],
      () => {
        if (chartMode.value && canServerAggregate.value) {
          requestChart();
        } else {
          relatedChartData.value = null;
          relatedChartLoading.value = false;
        }
      },
      { immediate: true }
    );
    // Selection change (record, filter, or leaving chart-only mode) → reset
    // and reload from page 1 with whatever fields the current view needs.
    watch(
      relationSelectionKey,
      async (next) => {
        if (manyRequestInProgress.value) {
          manyRequestInProgress.value.abort();
          manyRequestInProgress.value = null;
        }
        resetManyRelation();
        if (next) {
          await loadManyRelationPage();
          if (editMode.value && manyRelation.value.more) {
            loadRemainingManyRelations();
          }
        }
      },
      { immediate: true }
    );
    // Include change (e.g. switching list→table) while the selection is
    // stable → back-fetch with the new field set without clearing the rows
    // the user is already looking at. Cache merges the extra fields in.
    watch(effectiveListInclude, (next, prev) => {
      if (!relationSelectionKey.value) return;
      if (!manyRelation.value.initialized) return;
      if (JSON.stringify(next) === JSON.stringify(prev)) return;
      loadManyRelationPage();
    });
    const tableColumns = computed(() => {
      if (!relatedResource.value) return [];
      const parentName = props.resource.name;
      return relatedResource.value
        .getFields({
          view: "list",
          deferred: false,
          include: relatedInclude.value,
          read: true,
        })
        .filter((f) => f.related !== parentName);
    });
    const showChartTable = computed(
      () =>
        isFocused.value &&
        chartMode.value &&
        (effectiveDisplay.value === "both" ||
          relatedChartConfig.value?.display === "both")
    );
    const rows = computed(() => {
      if (!tableMode.value && !showChartTable.value) {
        return [];
      }
      const resource = relatedResource.value;
      return fieldLive.value
        ? fieldLive.value
            .map((value) =>
              typeof value === "object" && value !== null
                ? value
                : resource.getRecord(value)
            )
            .filter(Boolean)
        : [];
    });
    const chartConfig = computed(() => {
      if (relatedChartConfig.value) {
        return relatedChartConfig.value;
      }
      return defaultChartConfig.value;
    });
    const expressionChartConfig = computed(() => {
      const config = chartConfig.value;
      if (!config) {
        return null;
      }
      const asExpression = (value, using, fallback = null) => {
        if (!value) {
          return fallback;
        }
        if (typeof value === "string" && value.match(/^[a-z_]+\(.+\)$/i)) {
          return value;
        }
        if (!using) {
          return value;
        }
        return `${using}(${value})`;
      };
      if (config.advanced) {
        return {
          ...config,
          combine: config.combine_ex,
          by: config.by_ex,
          over: config.over_ex,
        };
      }
      return {
        ...config,
        combine: asExpression(config.combine, config.combine_using || "count"),
        by: asExpression(config.by, config.by_using),
        over: asExpression(config.over, config.over_using),
      };
    });
    const chartData = computed(() => {
      if (!chartMode.value || !chartConfig.value) return null;
      if (canServerAggregate.value) {
        // Server-side aggregation path — works for simple count, and for any
        // custom chart config that uses only vanilla aggregations.
        return relatedChartData.value;
      }
      // Fallback: aggregate the loaded records client-side. Used for charts
      // that rely on sequence() or other visualization-layer buckets the
      // server doesn't understand.
      const resource = relatedResource.value;
      if (!resource || !fieldLive.value) return null;
      const records = fieldLive.value
        .map((id) => resource.getRecord(id))
        .filter(Boolean);
      return aggregateChartData(records, expressionChartConfig.value);
    });
    const chartOptions = computed(() => {
      if (!chartConfig.value) return {};
      const config = chartConfig.value;
      const result = {
        ...config,
        resource: relatedResource.value,
      };
      // For sequence without by: pass per-bar colors from style map
      if (isSequenceChart.value && !expressionChartConfig.value?.by) {
        const resource = relatedResource.value;
        if (resource && resource.style) {
          const styleField = Object.keys(resource.style)[0];
          if (styleField) {
            const seqRecs = sequenceRecords.value;
            if (Array.isArray(seqRecs) && seqRecs.length) {
              result._distributedColors = seqRecs.map(
                (r) => resource.getStyle(r) || null
              );
            }
          }
        }
      }
      return result;
    });
    const inlineChartAuto = computed(
      () =>
        !isFocused.value &&
        chartMode.value &&
        !showChartTable.value &&
        chartConfig.value?.type === "value"
    );
    const chartHeight = computed(() => {
      if (showChartTable.value) {
        return "calc(50dvh - 55px)";
      }
      if (inlineChartAuto.value) {
        return "auto";
      }
      return isFocused.value ? "100%" : "350px";
    });
    const isSequenceChart = computed(() => {
      if (relatedChartConfig.value) return false;
      const config = expressionChartConfig.value;
      if (!config || !config.over) return false;
      return config.over.match(/^sequence\(/i) !== null;
    });
    const sequenceRecords = computed(() => {
      if (
        !chartMode.value ||
        !expressionChartConfig.value ||
        !fieldLive.value
      )
        return null;
      if (!isSequenceChart.value) return null;
      const resource = relatedResource.value;
      if (!resource) return null;
      const records = fieldLive.value
        .map((id) => resource.getRecord(id))
        .filter(Boolean);
      return getSequenceRecords(records, expressionChartConfig.value);
    });
    const showChartTooltip = ref(false);
    const chartTooltipRef = ref(null);
    const chartTooltipRecord = ref(null);
    const onChartSelect = ({ index, series }) => {
      if (!isSequenceChart.value) return;
      const seqRecs = sequenceRecords.value;
      if (!seqRecs || index === null) {
        showChartTooltip.value = false;
        chartTooltipRecord.value = null;
        return;
      }
      const resource = relatedResource.value;
      if (!resource) return;
      let record;
      if (Array.isArray(seqRecs)) {
        record = seqRecs[index];
      } else {
        const groupKeys = Object.keys(seqRecs);
        const groupKey = groupKeys[series];
        record = groupKey ? seqRecs[groupKey][index] : null;
      }
      if (!record) {
        showChartTooltip.value = false;
        chartTooltipRecord.value = null;
        return;
      }
      const idField = resource.id_field;
      const nameField = resource.name_field;
      const recordId = record[idField];
      const parentResource = props.resource.name;
      const styleField = resource.style
        ? Object.keys(resource.style)[0]
        : null;

      // Only show fields explicitly referenced in chart config
      const config = expressionChartConfig.value || {};
      const configFieldNames = new Set();
      [config.combine, config.over, config.by].forEach((expr) => {
        if (!expr) return;
        const match = expr.match(/\((.+)\)$/);
        configFieldNames.add(match ? match[1].trim() : expr.trim());
      });

      const allFields = resource.getFields({ view: "list", deferred: false });
      const filtered = allFields.filter(
        (f) => configFieldNames.has(f.name)
      );

      const fields = filtered.map((f) => {
        const val = record[f.name];
        const isRelation = f.type === "one" || f.type === "many";
        let displayValue = f.format
          ? f.format(val, record)
          : val;
        let link = null;
        let color = null;

        if (isRelation && val != null) {
          link = resource.getLink(record, f.name);
          displayValue = resource.getName(record, f.name);
          // Get related record style color
          const relatedRes = resource.getRelationFromField(f.name);
          if (relatedRes) {
            let target = val;
            if (typeof target !== "object") {
              target = relatedRes.getRecord(target);
            }
            if (target) {
              color = relatedRes.getStyle(target);
            }
          }
        } else if (f.name === styleField) {
          color = resource.getStyle(record);
        }

        return { label: f.label, value: displayValue, link, color };
      });

      const headerStyle = resource.getStyle(record);
      chartTooltipRecord.value = {
        name: resource.getRecordName(record) || recordId,
        link: `/${resource.name}/${recordId}/`,
        headerColor: headerStyle,
        fields,
      };
      showChartTooltip.value = true;
    };
    const canAdd = computed(
      () =>
        !props.editing &&
        !isFocused.value &&
        (props.field.type === "many" || props.field.type === "one") &&
        props.resource.canCreate(props.field.name)
    );
    const canOpen = computed(
      () =>
        fieldLive.value &&
        !props.editing &&
        !isFocused.value &&
        (props.field.type === "iframe" ||
          props.field.type === "file upload" ||
          props.field.type === "image upload" ||
          isURL(fieldLive.value))
    );
    const hiddenByEmptyMany = computed(() => {
      if (!props.field.hide || !usesPagedMany.value) {
        return false;
      }
      const canWrite = props.resource.canWrite(
        props.field.name,
        props.record,
        props.mode
      );
      if (props.editing && canWrite) {
        return false;
      }
      return (
        manyRelation.value.initialized &&
        !manyRelation.value.loading &&
        !manyRelation.value.ids.length &&
        !manyRelation.value.total
      );
    });
    const inlineViews = computed(() => {
      if (
        props.editing ||
        isFocused.value ||
        props.field.type !== "many"
      ) {
        return [];
      }
      const views = props.field.extra?.views;
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
          label: "Table+Chart",
          icon: "mdi-view-agenda-outline",
        });
      }
      return result.length > 1 ? result : [];
    });
    const inlineViewIcon = computed(() => {
      const current = effectiveDisplay.value;
      const view = inlineViews.value.find((v) => v.key === current);
      return view?.icon || "list";
    });
    const isJsonField = computed(
      () =>
        !isFocused.value &&
        (props.field.type === "object" || props.field.type === "json") &&
        fieldLive.value != null
    );
    const effectiveJsonMode = computed(() => {
      if (isFocused.value) return props.jsonMode || "visual";
      const fromUrl = props.fieldViews && props.fieldViews[props.field.name];
      if (fromUrl === "raw" || fromUrl === "visual") return fromUrl;
      return "visual";
    });
    const toggleJsonMode = () => {
      const next = effectiveJsonMode.value === "raw" ? "visual" : "raw";
      context.emit("changeFieldView", props.field.name, next);
    };
    const changeView = (viewKey) => {
      context.emit("changeFieldView", props.field.name, viewKey);
    };
    return {
      size: computed(() => (props.dense ? "md" : "lg")),
      name: props.field.name,
      onUpdate,
      live,
      fieldLive,
      fieldRoot,
      manyRelation,
      icon: computed(() => {
        if (!props.dynamicIcons) {
          return props.resource.getFieldIcon(props.field.name);
        }
        if (props.field.reference) {
          const $ref = props.field.reference();
          const icon = $ref
            ? $ref.getFieldIcon(
                fieldLive.value,
                fieldLive.value ? "close" : null
              )
            : null;
          if (icon) {
            return icon;
          }
        }
        return "mdi-circle-medium";
      }),
      clickIcon,
      click: () => {
        if (
          (!props.inline || !props.editing) &&
          props.field.name !== props.focused
        ) {
          context.emit("focus", props.field.name);
        }
      },
      resizeRatio: computed(() => {
        let $value =
          props.field.type === "many" ? fieldLive.value : value.value;
        $value = Array.isArray($value) ? $value[0] : displayValue.value;
        $value = `${$value}`;
        const base = props.dense ? 0.8 : 1;
        return $value.length < 16 ? base : (base * $value.length) / 12;
      }),
      long: computed(() => {
        const currentValue =
          props.field.type === "many" ? fieldLive.value : value.value;
        return (
          props.field.type == "image upload" ||
          props.field.type == "file upload" ||
          props.field.item_type == "image upload" ||
          props.field.item_type == "file upload" ||
          (currentValue &&
            ((Array.isArray(currentValue) && currentValue.length >= 2) ||
              (!Array.isArray(currentValue) &&
                typeof currentValue === "object") ||
              (typeof currentValue === "string" &&
                (currentValue.length > 80 ||
                  currentValue.count("\n") >= 1))))
        );
      }),
      description: computed(() => {
        let base = props.field.description;
        if (base) {
          base = base.trim();
          base = base.replaceAll(/[*]([^*]+)[*]/g, "<b>$1</b>"); // .replaceAll(/[ \t\n]*\n[ \n\t]*/mg, "<br/>");
        }
        return base;
      }),
      inputValue: ref(null),
      hasChanged,
      isFocused,
      isLoading,
      hiddenByEmptyMany,
      iconColor,
      iconColorClass: computed(() => {
        const color = iconColor.value;
        return `text-${color}`;
      }),
      editMode,
      rows,
      tableColumns,
      relatedResource,
      tableMode,
      chartMode,
      chartData,
      chartLoadingValue: computed(() => relatedChartLoading.value),
      chartOptions,
      chartHeight,
      inlineChartAuto,
      showChartTable,
      isSequenceChart,
      showChartTooltip,
      chartTooltipRef,
      chartTooltipRecord,
      onChartSelect,
      onFieldScroll,
      onTableScroll,
      showAdd,
      showManyLoadIndicator: computed(
        () => usesPagedMany.value && manyRelation.value.loading && manyRelation.value.initialized
      ),
      noSeparator: computed(() => {
        if (!props.field) {
          return false;
        }
        return (
          props.field.type === "image upload" ||
          props.field.type === "file upload" ||
          props.field.item_type === "image upload" ||
          props.field.item_type === "file upload" ||
          props.field.type === "chart" ||
          props.field.type === "filters"
        );
      }),
      canAdd,
      inlineViews,
      inlineViewIcon,
      changeView,
      isJsonField,
      effectiveJsonMode,
      toggleJsonMode,
      canOpen,
      openExternal,
    };
  },
};
</script>
