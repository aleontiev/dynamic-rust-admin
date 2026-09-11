<template>
  <q-dialog
    v-model="isOpen"
    :class="{ dense: dense, 'large right': true }"
    :maximized="dense"
    transition-show="slide-up"
    transition-hide="slide-down"
    position="bottom"
  >
    <q-card>
      <q-toolbar
        style="z-index: 11; top: 0px"
        :class="{
          sticky: !dense,
          fixed: dense,
          'bg-primary': canSave,
          'bg-grey-3 text-black': dark && !canSave,
          'bg-grey-9 text-white': !dark && !canSave,
        }"
        v-close-popup
      >
        <q-icon name="mdi-chart-box" size="sm" />
        <q-toolbar-title>
          {{ title }}
        </q-toolbar-title>
        <q-btn flat round dense icon="close" />
      </q-toolbar>
      <q-card-section
        :class="{'q-pt-none': !dense, 'q-plr-none q-pb-none': true, 'q-pt-xl': dense}"
        :style="{ minHeight: dense ? 'calc(100dvh - 52px)' : 'inherit' }"
      >
        <DetailForm
          inline
          embedded
          :record="baseChart"
          :resource="Chart"
          :fields="fields"
          :focused="focused"
          :dark="dark"
          :dense="dense"
          mode="create"
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
            icon="mdi-numeric"
            label="Value"
            v-if="isEmpty"
            @click="applyPreset('value')"
          />
          <IconButton
            :dense="dense"
            icon="mdi-chart-donut"
            label="Donut"
            v-if="isEmpty"
            @click="applyPreset('donut')"
          />
          <IconButton
            :dense="dense"
            icon="mdi-chart-bar"
            label="Bar"
            v-if="isEmpty"
            @click="applyPreset('bar')"
          />
          <IconButton
            :dense="dense"
            icon="restart_alt"
            label="Clear"
            v-if="canClear"
            @click="clear"
          />
          <IconButton
            :dense="dense"
            icon="done"
            label="Apply"
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
import { watch, computed, ref } from "vue";
import { useQuasar } from "quasar";
import { useStore } from "vuex";
import { IconButton, ActionBar, DetailForm } from ".";
import { isEqual, toTitleCase } from "../utilities";

export default {
  props: ["dense", "dark", "value", "resource", "chart"],
  components: {
    IconButton,
    DetailForm,
    ActionBar,
  },
  emits: ["change", "input", "update"],
  setup(props, context) {
    const hasOwn = (object, key) =>
      Object.prototype.hasOwnProperty.call(object || {}, key);
    const normalizeChart = (chart) => {
      const result = { ...(chart || {}) };
      delete result.resource;
      return result;
    };
    const sanitizeChart = (chart) => {
      const base = normalizeChart(chart);
      const result = {};
      const assign = (key) => {
        if (hasOwn(base, key)) {
          result[key] = base[key];
        }
      };

      if (hasOwn(base, "display")) {
        result.display = base.display;
      }

      assign("type");
      assign("title");
      assign("description");
      assign("prefix");
      assign("suffix");
      if (
        (base.type === "bar" || base.type === "line") &&
        hasOwn(base, "stacked")
      ) {
        result.stacked = base.stacked;
      }
      result.advanced = !!base.advanced;

      if (result.advanced) {
        assign("combine_ex");
        assign("by_ex");
        assign("over_ex");
      } else {
        assign("combine");
        if (hasOwn(base, "combine_using")) {
          result.combine_using = base.combine_using;
        }
        if (hasOwn(base, "by")) {
          result.by = base.by;
        }
        if (hasOwn(base, "by_using")) {
          result.by_using = base.by_using;
        }
        if (hasOwn(base, "over")) {
          result.over = base.over;
        }
        if (hasOwn(base, "over_using")) {
          result.over_using = base.over_using;
        }
      }

      return result;
    };
    const getChoices = ({ record }) => {
      const result = record.resource.getFieldOptions({ filterable: true }, [
        "name",
      ]);
      return result;
    };
    const getOverChoices = ({ record }) => {
      const result = record.resource.getFieldOptions(
        {
          type: (t) => t === "datetime" || t === "date" || t === "time",
          filterable: true,
        },
        ["name"]
      );
      return result;
    };
    const getResource = ({ record }) => record.resource;
    const store = useStore();
    const database = store.$db();
    const Resource = database.model("_resources");
    const transformChoices = [
      {
        id: "auto",
        label: "Auto",
      },
      {
        id: "year",
        label: "Year",
      },
      {
        id: "quarter",
        label: "Quarter",
      },
      {
        id: "month",
        label: "Month",
      },
      {
        id: "week",
        label: "Week",
      },
      {
        id: "day",
        label: "Day",
      },
      {
        id: "hour",
        label: "Hour",
      },
      {
        id: "minute",
        label: "Minute",
      },
      {
        id: "second",
        label: "Second",
      },
      {
        id: "upper",
        label: "Upper",
      },
      {
        id: "lower",
        label: "Lower",
      },
    ];
    const Chart = new Resource({
      name: "_chart",
      singular: "_chart",
      fields: {
        resource: {
          label: "Resource",
          hidden: true,
          type: "object",
          ui: false,
        },
        type: {
          label: "Type",
          type: "choice",
          ui: true,
          hidden: false,
          choices: [
            {
              id: "value",
              label: "Value",
            },
            {
              id: "donut",
              label: "Donut",
            },
            {
              id: "bar",
              label: "Bar",
            },
            {
              id: "line",
              label: "Line",
            },
          ],
          description: "Chart type (Value, Donut, Bar, or Line)",
          null: true,
        },
        stacked: {
          ui: true,
          label: "Stacked",
          type: "boolean",
          hidden: false,
          depends: { type: ["line", "bar"] },
        },
        title: {
          label: "Title",
          ui: true,
          type: "string",
          hidden: false,
          null: true,
          description: "Title for the chart",
          depends: { type: true },
        },
        description: {
          ui: true,
          label: "Description",
          type: "string",
          null: true,
          hidden: false,
          description: "Description for the the chart",
          depends: { type: true },
        },
        prefix: {
          ui: true,
          label: "Prefix",
          type: "string",
          null: true,
          hidden: false,
          description: "Prefix to display before the value(s)",
          depends: { type: true },
        },
        suffix: {
          ui: true,
          label: "Suffix",
          type: "string",
          null: true,
          hidden: false,
          description: "Suffix to display after the value(s)",
          depends: { type: true },
        },
        advanced: {
          ui: true,
          label: "Advanced mode?",
          type: "boolean",
          hidden: false,
          depends: { type: true },
        },
        combine: {
          ui: true,
          label: "Combine",
          description: "Key field to visualize",
          choices: getChoices,
          reference: getResource,
          type: "choice",
          depends: { type: true, advanced: false },
          hidden: false,
          null: true,
        },
        combine_ex: {
          ui: true,
          label: "Combine Expression",
          description: 'Complex expression, e.g: "count(id), sum(order.amount)"',
          type: "text",
          null: true,
          hidden: false,
          depends: { advanced: true, type: true },
        },
        combine_using: {
          ui: true,
          label: "Combine Using",
          description: "A function to summarize the key field",
          type: "choice",
          hidden: false,
          choices: [
            {
              id: "sum",
              label: "Sum",
            },
            {
              id: "count",
              label: "Count",
            },
            {
              id: "distinct",
              label: "Distinct",
            },
            {
              id: "average",
              label: "Average",
            },
            {
              id: "max",
              label: "Max",
            },
            {
              id: "min",
              label: "Min",
            },
          ],
          depends: {
            combine: true,
            advanced: false,
          },
        },
        by: {
          ui: true,
          label: "By",
          hidden: false,
          description: "Field name to split data by, e.g. status or type",
          type: "choice",
          choices: getChoices,
          reference: getResource,
          null: true,
          depends: {
            advanced: false,
            combine: true,
            type: ["donut", "line", "bar", "value"],
          },
        },
        by_using: {
          ui: true,
          hidden: false,
          label: "Transform By",
          description: 'A function to transform the value of "By"',
          type: "choice",
          null: true,
          choices: transformChoices,
          depends: {
            advanced: false,
            by: true,
            type: ["donut", "line", "bar", "value"],
          },
        },
        by_ex: {
          ui: true,
          hidden: false,
          label: "By Expression",
          description: "A single expression, e.g: month(created)",
          type: "string",
          null: true,
          depends: {
            advanced: true,
            combine_ex: true,
            type: ["donut", "line", "bar", "value"],
          },
        },
        over: {
          ui: true,
          hidden: false,
          label: "Over",
          description: "Field name to split data over, e.g. created",
          choices: getOverChoices,
          reference: getResource,
          type: "choice",
          null: true,
          depends: {
            advanced: false,
            combine: true,
            type: ["line", "bar", "value"],
          },
        },
        over_using: {
          ui: true,
          hidden: false,
          label: "Transform Over",
          description: 'A function to transform the value of "Over"',
          type: "string",
          null: true,
          choices: transformChoices,
          depends: {
            advanced: false,
            over: true,
            type: ["line", "bar", "value"],
          },
        },
        over_ex: {
          ui: true,
          hidden: false,
          label: "Over Expression",
          description: "A complex expression, e.g: month(created), day(issued)",
          type: "string",
          null: true,
          depends: {
            advanced: true,
            combine_ex: true,
            type: ["line", "bar", "value"],
          },
        },
      },
      sections: [
        {
          name: "fields",
          fields: [
            "type",
            "advanced",
            "combine",
            "combine_using",
            "combine_ex",
            "by",
            "by_using",
            "by_ex",
            "over",
            "over_using",
            "over_ex",
            "stacked",
            "title",
            "description",
            "prefix",
            "suffix",
          ],
        },
      ],
    });

    const toChartRecord = (chart) => ({
      resource: props.resource,
      ...sanitizeChart(chart),
    });
    const changes = ref({});
    const baseChart = ref(toChartRecord(props.chart));
    const $q = useQuasar();
    const focused = ref(null);
    const liveChart = computed(() => ({ ...baseChart.value, ...changes.value }));
    const focus = (field) => {
      focused.value = field;
    };
    const update = (ch) => {
      changes.value = ch;
    };

    const fields = Chart.getFields({ hidden: false }, ["section"]);
    watch(
      () => [props.resource, props.chart],
      () => {
        baseChart.value = toChartRecord(props.chart);
        changes.value = {};
      }
    );
    const hasResourceField = (name) =>
      !!(props.resource && props.resource.fields && props.resource.fields[name]);
    const pickCombine = () =>
      hasResourceField("amount") ? "amount" : "id";
    const pickCombineUsing = (combine) =>
      combine === "id" ? "count" : "sum";
    const pickOver = () =>
      hasResourceField("start_date") ? "start_date" : "created";
    const pickBy = () => {
      if (hasResourceField("status")) return "status";
      if (hasResourceField("type")) return "type";
      return "name";
    };
    const isEmpty = computed(() => !liveChart.value.type);
    const getFieldLabel = (name) => {
      const f = props.resource && props.resource.fields && props.resource.fields[name];
      return (f && f.label) || toTitleCase(name.replace(/_/g, " "));
    };
    const buildTitle = ({ combine, combine_using, by, over }) => {
      let title = combine_using === "count" ? "Count" : getFieldLabel(combine);
      if (by) title += ` by ${getFieldLabel(by)}`;
      if (over) title += ` over ${getFieldLabel(over)}`;
      return title;
    };
    const applyPreset = (type) => {
      const combine = pickCombine();
      const combine_using = pickCombineUsing(combine);
      const preset = { type, combine, combine_using, advanced: false };
      if (type === "donut") {
        preset.by = pickBy();
      } else if (type === "bar" || type === "line") {
        preset.over = pickOver();
        preset.over_using = "auto";
        preset.by = pickBy();
      }
      preset.title = buildTitle(preset);
      baseChart.value = { ...baseChart.value, ...preset };
      changes.value = {};
    };
    return {
      Chart,
      baseChart,
      changes,
      focused,
      focus,
      update,
      isOpen: computed({
        get() {
          return props.value;
        },
        set(newValue) {
          context.emit("input", newValue);
        },
      }),
      canSave: computed(
        () =>
          !isEqual(
            sanitizeChart(liveChart.value),
            sanitizeChart(props.chart)
          )
      ),
      canDiscard: computed(
        () =>
          !isEqual(
            sanitizeChart(liveChart.value),
            sanitizeChart(props.chart)
          )
      ),
      canClear: computed(
        () =>
          Object.keys(sanitizeChart(liveChart.value)).filter(
            (k) => k !== "advanced"
          ).length > 0
      ),
      title: "Summary",
      discard: () => {
        // undo the changes
        baseChart.value = toChartRecord(props.chart);
        changes.value = {};
      },
      clear: () => {
        baseChart.value = { resource: props.resource };
        changes.value = {};
      },
      save: () => {
        const nextChart = sanitizeChart(liveChart.value);
        context.emit("change", nextChart);
        context.emit("update", nextChart);
        context.emit("input", false);
        changes.value = {};
      },
      fields,
      saving: false,
      isEmpty,
      applyPreset,
    };
  },
};
</script>
