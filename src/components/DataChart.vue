<style lang="scss">
.Chart {
  &.padded {
    padding: 10px;
    padding-top: 20px;
    &.embedded {
      padding-top: 10px;
    }
  }
  &.dark .vue-apexcharts .apexcharts-canvas > svg {
    background-color: var(--q-dark) !important;
  }
  .apexcharts-legend.apexcharts-legend {
    white-space: nowrap;
    flex-wrap: nowrap;
    justify-content: initial !important;
    overflow-x: auto;
    padding-top: 15px;
  }
  position: relative;
  &.Chart--center {
    display: flex;
    justify-content: center;
    align-items: center;
  }
  &.dense .Chart__actions {
    top: -8px;
  }
  .Chart__actions {
    z-index: 11;
    position: absolute;
    top: 2px;
    left: 8px;
  }
  &.embedded {
    .Chart__title {
      top: 10px;
      left: 10px;
    }
  }
  .Chart__title {
    cursor: pointer;
    z-index: 11;
    position: absolute;
    font-weight: bold;
    left: 58px;
    top: 0px;
    font-size: 1.1rem;
    right: 45px;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
  }
  .Chart__value {
    width: 100%;
    height: auto;
    text-align: center;
    white-space: pre;
  }
  &:not(.embedded) .Chart__value .table tr th:first-child .row {
    padding-left: 22px;
  }
  .Chart__loading {
    position: absolute;
    left: 15px;
    top: 15px;
    right: 15px;
    bottom: 15px;
  }
}
</style>

<template>
  <div
    :class="{
      Chart: true,
      dense: dense,
      padded: !chartSummaryResource,
      embedded: embedded,
      'Chart--center': chartType === 'value' && !chartSummaryResource,
      dark: dark,
    }"
    :style="{ height: height, width: '100%', overflow: 'hidden' }"
  >
    <q-menu
      ref="tooltipMenuRef"
      anchor="center middle"
      v-model="showTooltipMenu"
      no-parent-event
    >
      <q-list :dark="dark" v-if="selectedDataObject">
        <q-item :class="{ 'bg-black': dark, 'bg-grey-3': !dark }">
          <q-item-section side>
            <q-icon :name="selectedDataObject.headerIcon" />
          </q-item-section>
          <q-item-section no-wrap>
            {{ selectedDataObject.header }}
          </q-item-section>
          <q-item-section side>
            <a
              v-if="selectedDataObject.headerLink"
              :href="selectedDataObject.headerLink"
            >
              {{ selectedDataObject.headerTotal }}
            </a>
            <span v-else>
              {{ selectedDataObject.headerTotal }}
            </span>
          </q-item-section>
        </q-item>
        <q-item v-for="(item, i) in selectedDataObject.items" :key="i">
          <q-item-section side>
            <q-avatar size="xs" :color="item.color" class="q-ml-xs" />
          </q-item-section>
          <q-item-section no-wrap>
            {{ item.name }}
          </q-item-section>
          <q-item-section side>
            {{ item.data }}
          </q-item-section>
        </q-item>
      </q-list>
    </q-menu>
    <span
      v-if="options.title || embedded"
      class="Chart__title"
      @click="clickTitle"
    >
      <span class="handle">
        <q-icon
          :color="dark ? 'white' : 'black'"
          size="1.4rem"
          class="q-mr-xs"
          v-if="embedded"
          :name="'mdi-' + options.resource.icon"
        />
        <span v-if="options.title">{{ options.title }}</span>
        <q-icon
          class="q-ml-xs"
          name="info"
          v-if="options.description"
          :color="dark ? 'white' : 'black'"
        />
        <q-tooltip v-if="options.description">{{
          options.description
        }}</q-tooltip>
     </span>
   </span>
    <div v-if="loading" class="Chart__loading">
      <div class="row full-width full-height items-end">
        <q-skeleton
          type="rect"
          width="17%"
          height="10%"
          :class="{ 'q-mr-lg': !dense, 'q-mr-xs': dense }"
        />
        <q-skeleton
          type="rect"
          width="17%"
          height="30%"
          :class="{ 'q-mr-lg': !dense, 'q-mr-xs': dense }"
        />
        <q-skeleton
          type="rect"
          width="17%"
          height="50%"
          :class="{ 'q-mr-lg': !dense, 'q-mr-xs': dense }"
        />
        <q-skeleton
          type="rect"
          width="17%"
          height="36%"
          :class="{ 'q-mr-lg': !dense, 'q-mr-xs': dense }"
        />
        <q-skeleton type="rect" width="17%" height="60%" />
      </div>
    </div>
    <span
      v-if="!loading && chartType === 'value' && !chartSummaryResource"
      v-resize-text="resizeText"
      class="Chart__value"
    >
      {{ value }}
    </span>
    <span
      v-else-if="!loading && chartType === 'value' && chartSummaryResource"
      class="Chart__value"
    >
      <DataTable
        :classNames="{
          'naked-header full-width full-height': true,
          'q-pt-lg': options.title || embedded,
          'q-mt-md': embedded
        }"
        :dense="dense"
        :dark="dark"
        :resource="chartSummaryResource"
        :visibleColumns="chartSummaryResource.getVisibleFieldNames()"
        :columns="chartSummaryResource.getFields()"
        :rows="chartSummaryRows"
      />
    </span>
    <ApexCharts
      ref="chartRef"
      :key="chartKey"
      v-if="
        !loading &&
        options &&
        chartType !== 'value' &&
        chartOptions.series &&
        chartOptions.series.length &&
        data &&
        first(data)
      "
      :width="chartWidth"
      :height="chartHeight"
      :type="chartType"
      :options="chartOptions"
      :series="chartOptions.series"
      @dataPointSelection="dataPointSelection"
    />
  </div>
</template>

<script>
import { watch, computed, ref } from "vue";
import { colors } from "quasar";
const { getPaletteColor } = colors;
import { useStore } from "vuex";
import {
  getInterval,
  formatInterval,
  getDatetimeBucket,
  isEqual,
  formatNumber,
  dimension,
  first,
} from "../utilities";
import DataTable from "./DataTable";
import ApexCharts from "vue3-apexcharts";

const getKey = (value, ex) => {
  const match = value.match(/^(.*) as ([a-z0-9_ ]+)$/i);
  if (match) {
    return ex ? match[1] : match[2];
  }
  return value.trim();
};
const getKeys = (chart, type, ex) => {
  if (chart.advanced) {
    return chart[`${type}_ex`]
      ? chart[`${type}_ex`].split(",").map((item) => getKey(item, ex))
      : [];
  }
  const base = chart[type];
  if (!base) {
    return [];
  }
  const using = chart[`${type}_using`];
  return [using ? `${using}(${base})` : base];
};

export default {
  props: [
    "hideToggle",
    "externalTooltip",
    "height",
    "dark",
    "options",
    "data",
    "loading",
    "dense",
    "tooltip",
    "legend",
    "embedded",
    "view",
    "viewType",
    "filters",
  ],
  components: {
    ApexCharts,
    DataTable,
  },
  emits: ["clickTitle", "toggleTable", "select"],
  setup(props, context) {
    const store = useStore();
    const database = store.$db();
    const Resource = database.model("_resources");

    const DATETIME_REGEX =
      /^\d{4}-\d{2}-\d{2}(?:[T ]\d{2}:\d{2}(?::\d{2}(?:[+]\d{2}:\d{2}))?)?$/;
    const keys = computed(() => getKeys(props.options, "combine"));
    const by = computed(() =>
      dimension[props.options.type] >= 2 ? getKeys(props.options, "by") : []
    );
    const over = computed(() =>
      dimension[props.options.type] >= 3 ? getKeys(props.options, "over") : []
    );
    const overExs = computed(() =>
      dimension[props.options.type] >= 3
        ? getKeys(props.options, "over", true)
        : []
    );
    const isDatetimeData = (data) => {
      if (Array.isArray(data) && data.length) {
        if (typeof data[0] === "string") {
          if (data[0].match(DATETIME_REGEX)) {
            return true;
          }
        } else if (Array.isArray(data[0])) {
          if (isDatetimeData(data[0])) {
            return true;
          }
        }
      }
      if (data && typeof data === "object") {
        let result = false;
        Object.values(data).forEach((d) => {
          if (result) {
            return;
          }
          result = isDatetimeData(d);
        });
        return result;
      }
      return false;
    };
    const isDatetime = computed(() => isDatetimeData(props.data));
    const datetimeBucket = computed(() => {
      if (!isDatetime.value) {
        return null;
      }
      const series = chartOptions.value.series;
      if (!series) {
        return null;
      }
      return getDatetimeBucket(getAllXValues(chartOptions.value));
    });
    const value = computed(() => {
      const options = props.options;
      if (options.type === "value") {
        const $keys = keys.value;
        let base = props.data && $keys.length ? props.data[$keys[0]] : null;
        if (base) {
          const formatter = props.options.resource.getDisplayFormatter(
            options.combine
          );
          if (formatter) {
            base = formatter(base);
          }
          if (options.prefix) {
            base = `${options.prefix}${base}`;
          }
          if (options.suffix) {
            base = `${base}${options.suffix}`;
          }
        }
        return base;
      }
      return null;
    });

    const xFormat = (x) => {
      return x;
    };

    const yFormat = (y) => {
      const base = yFormatShort(y);
      const prefix = props.options.prefix || "";
      const suffix = props.options.suffix || "";
      return `${prefix}${base}${suffix}`;
    };
    const yFormatShort = (y) => formatNumber(y, { round: 3 });
    const totalFormat = (c) => {
      const formatter = props.dense ? yFormatShort : yFormat;
      return formatter(c.globals.seriesTotals.reduce((a, b) => a + b));
    };
    const getPlotOptions = () => {
      const result = {};
      const type = chartType.value;
      if (!props.data) {
        return result;
      }
      if (type === "donut") {
        result.pie = {
          expandOnClick: false,
          donut: {
            labels: {
              show: true,
              value: {
                show: true,
                formatter: props.dense ? yFormatShort : yFormat,
              },
              total: {
                color: props.dark ? "#ffffff" : "#00000",
                show: true,
                showAlways: true,
                formatter: totalFormat,
                label: "Total",
              },
            },
          },
        };
      } else if (type === "bar") {
        result.bar = {
          horizontal: false,
        };
      }
      return result;
    };
    const truncateDatetime = (val) => {
      if (typeof val !== "string") return val;
      // Match ISO datetime strings and truncate to "YYYY-MM-DD HH:mm:ss"
      const m = val.match(/^(\d{4}-\d{2}-\d{2})[T ](\d{2}:\d{2}:\d{2})/);
      if (m) return `${m[1]} ${m[2]}`;
      return val;
    };
    const toChartX = (x) => {
      if (x === true) {
        return "true";
      }
      if (x === false) {
        return "false";
      }
      if (x === null) {
        return "null";
      }
      if (typeof x === "string" && x.trim() === "") {
        return "empty";
      }
      /* if (x && x.match(DATETIME_REGEX)) {
        return (new Date(x)).getTime();
      }*/
      return truncateDatetime(x);
    };
    const colorNames = [
      "primary",
      "blue",
      "purple",
      "pink",
      "yellow",
      "orange",
      "red",
      "grey",
      "blue-grey",
      "brown",
    ];
    const defaultColors = colorNames.map(getPaletteColor);
    const fromPalette = (color) => {
      if (color.indexOf("#") === -1) {
        return getPaletteColor(color);
      }
      return color;
    };
    const getColors = (series, palette) => {
      let name;
      let target = series;
      const palettize = palette ? (x) => x : fromPalette;
      const defaults = palette ? colorNames : defaultColors;
      if (chartType.value === "donut") {
        // get category names from axis
        target = Object.keys(props.data).map((x) => ({ name: toChartX(x) }));
      }
      const colors = Resource.getColorMap(props.options.resource);
      if (!Array.isArray(target)) {
        name = (target.name || "").toLowerCase();
        return [palettize(colors[name] || defaults[0])];
      } else {
        const first = target[0];
        if (!first || !first.name) {
          return defaults;
        }
        return target.map((serie, i) =>
          palettize(
            colors[serie.name.toLowerCase()] || defaults[i % defaults.length]
          )
        );
      }
    };
    const getY = (data, x) => {
      let result = null;
      data.forEach((item) => {
        if (result !== null) {
          return;
        }
        const itemX = typeof item.x !== "undefined" ? item.x : item[0];
        if (itemX == x) {
          result = item.y || item[1];
        }
      });
      return result;
    };
    const alignX = (allX, data) => {
      // fill data with extra X values
      // zip two lists
      const objectForm = data[0] && typeof data[0].x !== "undefined";
      return allX.map((x) => {
        const y = getY(data, x) || 0;
        return objectForm ? { x, y } : [x, y];
      });
    };
    const dedupe = (list) => {
      const seen = {};
      return list.reduce((acc, item) => {
        if (!seen[item]) {
          acc.push(item);
          seen[item] = 1;
        }
        return acc;
      }, []);
    };
    const flatten = (list) => {
      return list.reduce((acc, item) => {
        acc.push(...item);
        return acc;
      }, []);
    };
    const getXValues = (data) => {
      return data.map((item) => (Array.isArray(item) ? item[0] : item.x));
    };
    const getAllXValues = (chart, series) => {
      const categories = chart?.xaxis?.categories;
      const $series = series || chart?.series;
      if (categories || !$series) {
        return categories;
      }
      return dedupe(
        flatten($series.map((serie) => getXValues(serie.data)))
      ).sort();
    };
    const alignXValues = (series) => {
      const result = [];
      const allXValues = getAllXValues(chartOptions.value, series);
      series.forEach((serie) => {
        const { name, data } = serie;
        result.push({ name, data: alignX(allXValues, data) });
      });
      return result;
    };
    const getSeries = () => {
      if (!props.data) {
        return [];
      }
      const $over = over.value;
      const $by = by.value;
      const type = chartType.value;
      let base;
      if (type === "donut") {
        base = Object.values(props.data);
        if ($by.length) {
          const key = keys.value ? keys.value[0] : null;
          base = base
            .map((x) => (key === null ? first(x) : x[key]))
            .map((x) => (x === null ? 0 : parseFloat(x)));
        } else {
          base = base.map((x) => (x === null ? 0 : parseFloat(x)));
        }
      } else if (type === "bar" || type === "line" || type === "area") {
        // bar chart data - usually using over
        if ($over.length) {
          if ($by.length) {
            // many bars, many series
            // { 'Paid': {'count(id)': [['2021', 1], ['2022', 5], ['2023', 6]]} }
            // use [x, y] notation
            base = Object.entries(props.data).map(([k, v]) => {
              const val = first(v, []);
              return {
                name: toChartX(k),
                data: Array.isArray(val)
                  ? [
                      ...val
                        .map((item) => ({ x: toChartX(item[0]), y: item[1] })),
                    ]
                  : [],
              };
            });
            base = alignXValues(base);
          } else {
            // many bars, one or more series
            // { 'count(id)': [[a, b], [c, d]], 'sum(amount)': [[a, b1], [c, d1] }}
            base = Object.entries(props.data).map(([key, values]) => ({
              data: Array.isArray(values)
                ? values.map((item) => item[1])
                : [values[1]],
              name: toChartX(key),
            }));
          }
        } else {
          if ($by.length) {
            // one bar, many series
            base = Object.entries(props.data).map(([k, v]) => ({
              name: toChartX(k),
              data: [].concat(first(v, [])),
            }));
          } else {
            // one bar, one series
            base = [
              {
                data: Object.values(props.data),
              },
            ];
          }
        }
      } else {
        base = [];
      }
      return base;
    };
    const isStacked = computed(() => {
      return props.options.stacked;
    });
    const selectedDatapoint = ref({ index: null, series: null });
    const getYValue = (item) =>
      typeof item.y !== "undefined"
        ? item.y
        : Array.isArray(item)
        ? item[1]
        : item;
    const getXValue = (item) =>
      typeof item.x !== "undefined"
        ? item.x
        : Array.isArray(item)
        ? item[0]
        : null;
    const getHeaderLink = (x, bucket) => {
      const { options, view, filters } = props;
      const { resource } = options;
      let filterKey;
      let $filters = filters;
      let filterValue = x;
      let overEx = overExs.value.length ? overExs.value[0] : null;
      if (overEx && overEx.indexOf("(") >= 0) {
        // take inner part of function call
        overEx = overEx.split("(")[1].replace(")", "");
      }
      if (overEx) {
        // apply a filter based on the over
        if (bucket) {
          filterKey = `${overEx}.$range`;
          // TODO: fix auto() breaking down when slicing a date field into hours
          const field = props.options.resource.getField(overEx);
          filterValue = getInterval(
            bucket,
            x,
            field && field.type === "datetime" ? "datetime" : "date"
          );
        } else {
          filterKey = `${overEx}.$eq`;
        }
        $filters = [
          // replace filter key if it was already set
          ...($filters || []).filter(
            (x) => x && Object.keys(x)[0] !== filterKey
          ),
          { [filterKey]: filterValue },
        ];
      }

      return Resource.getResourceLink(resource, view, $filters);
    };
    const selectedDataObject = computed(() => {
      const selected = selectedDatapoint.value;
      if (!selected || selected.index === null) {
        return null;
      }
      const chart = chartOptions.value;
      let series = chart.series;
      const categories = chart.xaxis?.categories || chart.labels;
      const selectedSeries = series[selected.series];
      const bucket = datetimeBucket.value;
      let headerLink = null;
      let header;
      let x;
      let selectedData;
      let selectedIndex = selected.index;
      if (typeof selectedSeries === "string" || !isNaN(selectedSeries)) {
        selectedData = series[selected.index];
        series = series.map((s, i) => ({ name: categories[i], data: [s] }));
        selectedIndex = 0;
        header = isStacked.value ? "Average" : "Total";
        x = categories ? categories[selected.index] : getXValue(selectedData);
      } else {
        selectedData = selectedSeries.data[selected.index];
        x = categories ? categories[selected.index] : getXValue(selectedData);
        header = bucket ? formatInterval(bucket, x) : truncateDatetime(x);
        headerLink = getHeaderLink(x, bucket);
      }
      if (!selectedData) {
        return null;
      }
      const y = getYValue(selectedData);
      const formatter = props.dense ? yFormatShort : yFormat;
      const items = series
        .map((serie, index) => {
          const result = {
            name: serie.name,
            color: chart.colorNames[index % chart.colorNames.length],
            data: formatter(getYValue(serie.data[selectedIndex])),
          };
          return result;
        })
        .filter((x) => !!x.data);
      let total = series.reduce((acc, serie) => {
        return acc + parseFloat(getYValue(serie.data[selectedIndex]));
      }, 0);
      const $chartType = chartType.value;
      if (!isStacked.value && series.length && ($chartType === 'bar' || $chartType === 'line')) {
        // use average
        total /= series.length;
      }
      return {
        x,
        y,
        header,
        headerLink,
        headerIcon: isDatetime.value ? "today" : "title",
        headerTotal: formatter(total),
        items,
      };
    });
    watch(selectedDatapoint, (next) => {
      // show the tooltip (skip if parent handles it externally)
      if (!props.externalTooltip) {
        showTooltipMenu.value = next.index !== null;
      }
    });
    const dataPointSelection = (evt, ctx, cfg) => {
      const { dataPointIndex, seriesIndex } = cfg;
      const newSelection = { index: dataPointIndex, series: seriesIndex };
      const deselecting = isEqual(newSelection, selectedDatapoint.value);
      selectedDatapoint.value = deselecting
        ? { index: null, series: null }
        : newSelection;
      context.emit("select", {
        index: deselecting ? null : dataPointIndex,
        series: deselecting ? null : seriesIndex,
      });
    };
    const getChart = () => {
      let type = chartType.value;
      const result = {
        toolbar: {
          show: false,
        },
        zoom: {
          enabled: false,
        },
        stacked: isStacked.value,
        events: {
          dataPointSelection,
        },
        type,
      };
      return result;
    };
    const getXAxis = () => {
      const options = props.options;
      const type = chartType.value;
      const result = {
        labels: {
          /* formatter: xFormat, */
        },
      };
      const $by = by.value;
      const $over = over.value;
      if (type === "donut" || type === "value") {
        return result;
      }
      let categories;
      if ($over.length) {
        if ($by.length) {
          // paid -> count -> [[categoryA, 1], [categoryB, 1]]
          // categories are not used, instead x/y coordinates
          // set type to numeric, might become datetime
        } else {
          // count -> [[categoryA, 1], [categoryB, 2]]
          const data = first(props.data, []);
          categories = Array.isArray(data)
            ? data.map((item) => toChartX(item[0]))
            : [toChartX(data)];
        }
      } else {
        // paid -> count -> x
        // or count -> x
        categories = Object.keys(props.data).map((item) => toChartX(item));
      }
      if (categories) {
        result.categories = categories;
      }
      if ($over.length && isDatetime.value) {
        result.type = "datetime";
      }
      return result;
    };
    const getYAxis = () => {
      return {
        labels: {
          formatter: props.dense ? yFormatShort : yFormat,
        },
      };
    };
    const chartOptions = computed(() => {
      if (!props.data) {
        return {};
      }
      const type = chartType.value;
      if (type === "value" || props.options.display === "table") {
        return {};
      }
      const labels =
        type === "donut"
          ? Object.keys(props.data).map((x) => toChartX(x))
          : null;
      const series = getSeries();
      const plotOptions = getPlotOptions();
      const chart = getChart();
      const xaxis = getXAxis();
      const yaxis = getYAxis();
      const colors = getColors(series);
      const $colorNames = getColors(series, true);
      const result = {
        colors,
        colorNames: $colorNames,
        theme: {
          mode: props.dark ? "dark" : "light",
        },
        title: {
          text: props.options.title ? "⠀" : "", // empty character unicode, not real whitespace
        },
        dataLabels: {
          enabled: false, // chart.type === 'line',
          formatter: props.dense ? yFormatShort : yFormat,
        },
        tooltip: {
          enabled: false, // props.tooltip !== false,
          theme: props.dark ? "dark" : "light",
          shared: true,
          intersect: false,
          x: {
            /* formatter: xFormat */
            format: "dd MMM, yyyy",
          },
          y: {
            formatter: yFormat,
          },
        },
        xaxis,
        yaxis,
        chart,
        legend: {
          show: series.length > 1 && props.legend !== false,
          horizontalAlign: "right",
          fontSize: props.dense ? "11px" : "14px",
          /* floating: chart.type === 'donut', */
          offsetY: 10,
          position:
            chart.type !== "line" && chart.type !== "bar" ? "right" : "bottom",
        },
        stroke: {
          show: true,
          curve: "smooth",
          lineCap: "butt",
          width: 2,
          dashArray: 0,
        },
        series,
      };
      if (labels) {
        result.labels = labels;
      }
      if (first(plotOptions)) {
        result.plotOptions = plotOptions;
      }
      // Per-bar distributed colors (e.g. sequence charts colored by status)
      const distColors = props.options._distributedColors;
      if (distColors && distColors.length) {
        const resolved = distColors.map(
          (c, i) => c ? fromPalette(c) : defaults[i % defaults.length]
        );
        result.colors = resolved;
        result.colorNames = distColors.map(
          (c, i) => c || colorNames[i % colorNames.length]
        );
        if (!result.plotOptions) result.plotOptions = {};
        if (!result.plotOptions.bar) result.plotOptions.bar = {};
        result.plotOptions.bar.distributed = true;
        result.legend = { show: false };
      }
      return result;
    });
    const chartType = computed(() => {
      // TODO: convert bar into donut
      return props.options.type;
    });
    const chartKey = computed(() => {
      const chart = { ...chartOptions.value };
      delete chart.series;
      delete chart.title;
      delete chart.legend;
      chart.display = props.options.display;
      chart.__viewType = props.viewType;
      chart.__height = props.height;
      return JSON.stringify(chart);
    });
    const resizeText = computed(() => {
      const type = chartType.value;
      if (type === "value") {
        return { ratio: 0.9 };
      }
      return null;
    });
    const chartSummaryResource = computed(() => {
      const $by = by.value;
      const $over = over.value;
      const $keys = keys.value;
      if (chartType.value !== "value" || (!$by.length && !$over.length)) {
        return null;
      }
      const now = Date.now();
      const name = `_summary${now}`;
      const fields = {};
      $by.forEach((key) => {
        fields[key] = {
          type: "string",
          sortable: true,
          label: key,
          ui: true
        };
      });
      $over.forEach((key) => {
        fields[key] = {
          type: "string",
          label: key,
          sortable: true,
          ui: true
        };
      });
      $keys.forEach((key) => {
        fields[key] = {
          type: "number",
          label: key,
          sortable: true,
          ui: true
        };
      });
      const resource = new Resource({
        name,
        singular: name,
        fields,
      });
      return resource;
    });
    const mergeRows = (allRows, key, row) => {
      if (!allRows[key]) {
        allRows[key] = row;
      } else {
        allRows[key] = {
          ...allRows[key],
          ...row,
        };
      }
    };
    const chartSummaryRows = computed(() => {
      if (!chartSummaryResource.value) {
        return null;
      }
      const rows = {};
      const data = Object.entries(props.data);
      const $by = by.value;
      const $over = over.value;
      const $keys = keys.value;

      const getRowKey = (item, byKey) => {
        const result = [];
        if ($by.length) {
          result.push(byKey);
        }
        $over.forEach((x, i) => result.push(item[i]));
        return JSON.stringify(result);
      };

      const getRow = (item, key, byKey) => {
        const y = item[item.length - 1];
        const row = { [key]: y };
        $over.forEach((x, i) => {
          row[x] = item[i];
        });
        if ($by.length) {
          row[$by[0]] = byKey;
        }
        return row;
      };
      if ($by.length) {
        if ($over.length) {
          // by + over
          data.forEach(([byKey, values]) => {
            Object.entries(values).forEach(
              ([key, items]) =>
                items &&
                items.length &&
                items.forEach((item) =>
                  mergeRows(
                    rows,
                    getRowKey(item, byKey),
                    getRow(item, key, byKey)
                  )
                )
            );
          });
        } else {
          // by + no over
          data.forEach(([byKey, values]) => {
            const row = { [$by[0]]: byKey };
            Object.entries(values).forEach(
              ([key, value]) => (row[key] = value)
            );
            rows[byKey] = row;
          });
        }
      } else {
        // over + no by
        data.forEach(
          ([key, items]) =>
            items &&
            items.length &&
            items.forEach((item) =>
              mergeRows(rows, getRowKey(item), getRow(item, key))
            )
        );
      }
      return Object.entries(rows)
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map((x) => x[1]);
    });
    const toggleTable = () => context.emit("toggleTable");
    const clickTitle = () => context.emit("clickTitle");
    const chartRef = ref(null);
    const tooltipMenuRef = ref(null);
    const showTooltipMenu = ref(false);
    return {
      chartRef,
      value,
      chartHeight: "100%",
      chartWidth: "100%",
      chartOptions,
      first,
      resizeText,
      chartType,
      chartKey,
      chartSummaryResource,
      chartSummaryRows,
      clickTitle,
      tooltipMenuRef,
      selectedDataObject,
      showTooltipMenu,
      dataPointSelection,
      toggleTable
    };
  },
};
</script>
