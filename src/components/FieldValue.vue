<template>
  <span v-if="!value && value !== 0 && value !== false" style="opacity:0">place</span>
  <div v-else-if="field.type === 'one'">
    <div v-if="editing">
      <span v-text="resource.getName(record, field.name, value)" />
    </div>
    <div v-else>
      <PageLink :resource="resource" :record="record" :field="field.name" />
    </div>
  </div>
  <div v-else-if="field.name === resource.name_field">
    {{ display }}
  </div>
  <div v-else-if="field.type === 'many'">
    <div v-if="editing">
      <span class="Link" v-for="relation in (value || [])" :key="relation"
        v-text="resource.getName(record, field.name, relation)" />
    </div>
    <div v-else>
      <PageLink :resource="resource" :record="record" v-for="relation in (value || [])" :relation="relation"
        :key="relation" :field="field.name" />
    </div>
  </div>
  <div v-else-if="field.type === 'resources'">
    {{ display }}
  </div>
  <div v-else-if="isMediaField">
    <MediaPreview
      :value="value"
      :fieldType="field.type"
      :itemType="field.item_type"
      :compact="!focused"
    />
  </div>
  <div v-else-if="field.type === 'string' && value && value.indexOf('https') === 0">
    <a :href="value" v-text="value" class="Field__value--link" />
  </div>
  <div v-else-if="field.type === 'chart' && chartOptions" :key="maxHeight">
    <apexchart :height="maxHeight" :type="chartOptions.chart.type" :options="chartOptions"
      :series="chartOptions.series" />
  </div>
  <div v-else-if="field.type === 'iframe'">
    <iframe :height="maxHeight" width="100%" :src="iframeValue" />
  </div>
  <div v-else>
    {{ display }}
  </div>
</template>


<script>
import { computed, ref } from 'vue';
import { useQuasar } from "quasar";
import { formatShortNumber } from '../utilities';
import PageLink from './PageLink';
import ApexCharts from 'vue3-apexcharts';
import MediaPreview from './MediaPreview';

const cache = ref({});
export default {
  props: ['dense', 'dark', 'resource', 'field', 'record', 'changes', 'value', 'editing', 'focused'],
  components: {
    apexchart: ApexCharts,
    PageLink,
    MediaPreview
  },
  setup(props) {
    const quasar = useQuasar();
    const filterOptions = options => {
      const cacheKey = `${props.resource.name}.${props.record[props.resource.id_field]}.${props.field.name}`;
      if (cache.value[cacheKey]) {
        return cache.value[cacheKey];
      }
      let $options = options ? JSON.parse(JSON.stringify(options)) : null;
      if ($options && $options.tooltip && $options.tooltip.shared) {
        $options.tooltip.shared = false;
      }
      if (!$options.theme) {
        $options.theme = {};
      }
      $options.theme.mode = props.dark ? 'dark' : 'light';
      if (!$options.chart) {
        $options.chart = {};
      }
      if (!options.chart.toolbar) {
        $options.chart.toolbar = {};
      }
      $options.chart.toolbar.show = false;
      if (!$options.chart.toolbar.tools) {
        $options.chart.toolbar.tools = {};
      }
      $options.chart.toolbar.tools.pan = false;
      $options.chart.toolbar.tools.zoom = false;
      if (!$options.yaxis) {
        $options.yaxis = {};
      }
      if (!$options.yaxis.labels) {
        $options.yaxis.labels = {};
      }
      $options.yaxis.show = !props.dense;
      if (props.dense) {
        $options.yaxis.labels.formatter = formatShortNumber;
      }
      cache.value[cacheKey] = $options;
      return $options;
    };
    const chartOptions = computed(() => {
      if (props.field.type !== 'chart') {
        return null;
      }
      const result = props.value ? filterOptions(props.value) : null;
      return result;
    });
    const display = computed(() => {
      const target = props.changes && typeof props.changes[props.field.name] !== 'undefined' ? props.changes : props.record;
      return props.resource.getDisplayValue(target, props.field.name);
    });
    const isMediaField = computed(() =>
      ['file upload', 'image upload'].includes(props.field.type) ||
      ['file upload', 'image upload'].includes(props.field.item_type)
    );
    const maxHeight = computed(() => {
      const small = quasar.screen.width < 400;
      const base = small ? 150 : 300;
      const delta = small ? 278 : 305;
      let result = '';
      if (props.focused) {
        result = (quasar.screen.height - delta) + 'px';
      } else {
        result = `${base}px`;
      }
      return result;
    })
    const iframeValue = computed(() => {
      if (props.field.type !== 'iframe') {
        return null;
      }
      let base = props.value;
      if (props.dark) {
        if (base.indexOf('?') === -1) {
          base = `${base}?dark=1`;
        } else {
          base = `${base}&dark=1`;
        }
      }
      return base;
    });

    return {
      maxHeight,
      display,
      chartOptions,
      iframeValue,
      isMediaField,
    }
  }
}
</script>
