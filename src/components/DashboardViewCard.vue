<style lang="scss">
  .q-page.full-screen {
    .view-card {
      height: calc(100dvh - 130px);
      .Chart {
        height: calc(100dvh - 140px);
      }
    }
  }
  .view-card {
    &.changed {
      box-shadow: 0 2px 0 0 var(--q-primary),
                  0 -2px 0 0 var(--q-primary),
                  -2px 0 0 0 var(--q-primary),
                  2px 0 0 0 var(--q-primary),
                  0 0 0 2px var(--q-primary) !important;
    }
    width: 100%;
    height: 100%;
    position: relative;
    .Chart {
      z-index: 5;
      .Chart__value {
        display: block;
      }
    }
  }
  .q-page:not(.full-screen) .view-card {
    &:not(.dense) {
      max-height: 300px;
      min-height: 300px;
      .Chart {
        max-height: 300px;
        min-height: 300px;
        &:not(.Chart--center) .Chart__value {
          height: 298px;
        }
      }
    }
    &.dense {
      max-height: 55vh;
      min-height: 35vh;
      .Chart {
        max-height: 55vh;
        min-height: 35vh;
        &:not(.Chart--center) .Chart__value {
          height: calc(35vh - 2px);
        }
      }
    }
  }
</style>
<template>
  <q-card flat bordered :dark="dark" :class="{'view-card': true, 'clickable': !editing, 'changed': changed, 'dense': dense}">
    <DataChart
      :legend="true"
      :tooltip="true"
      :embedded="true"
      v-if="view && !selectedControl"
      :dense="true"
      :view="view"
      :filters="lastFilters"
      :dark="dark"
      height="100%"
      :options="chart"
      :data="data"
      :loading="loading"
      @clickTitle="click"
    />
    <div v-if="selectedControl" class="Chart padded">
      <span class="Chart__title">
        <q-icon :color="dark ? 'white': 'black'" size="1.4rem" class="q-mr-xs" :name="'mdi-' + resource.icon"/>
        <span v-if="chart.title">{{ chart.title }}</span>
        <q-icon class="q-ml-xs" name="info" v-if="chart.description" :color="dark ? 'white': 'black'"/>
        <q-tooltip v-if="chart.description">{{ chart.description }}</q-tooltip>
      </span>
      <span class="absolute center text-h6">
        <span v-if="liveLinkLabel">
          <q-chip class="q-pa-md" :color="linkChanged ? 'primary': null" :icon="liveLinkIcon" :dark="!dark" removable :dense="dense" :label="liveLinkLabel" @remove="unlink"/>
        </span>
        <span v-if="!linking && !liveLinkLabel" @click="startLink" :class="{'text-primary': linkChanged}">
          <q-icon name="link"/> Link to View
        </span>
        <span v-else-if="!liveLinkMatches">
          <q-select
            style="min-width: 150px"
            @blur="stopLink"
            behavior="menu"
            :dense="dense"
            :dark="dark"
            label="Choose a field"
            :options="linkOptions"
            ref="linkDropdown"
            :modelValue="linkDropdownValue"
            @update:model-value="onLink"
          >
            <template v-slot:selected-item="scope">
              <span style="white-space: nowrap">
                <q-icon v-if="liveResource && liveResource.getFieldIcon(scope.opt.value)" :name="liveResource.getFieldIcon(scope.opt.value)" size="xs" class="q-mr-xs q-mb-xs"/>
                <span>{{ scope.opt.label }}</span>
              </span>
            </template>
            <template v-slot:option="scope">
              <q-item v-bind="scope.itemProps">
                <q-item-section avatar>
                  <q-icon v-if="liveResource && liveResource.getFieldIcon(scope.opt.value)" :name="liveResource.getFieldIcon(scope.opt.value)"/>
                </q-item-section>
                <q-item-section>
                  <q-item-label>{{ scope.opt.label }}</q-item-label>
                </q-item-section>
              </q-item>
            </template>
          </q-select>
        </span>
      </span>
    </div>
    <div v-if="editing && !selectedControl" class="absolute top right q-mr-sm q-mt-sm" style="z-index: 100">
      <q-btn flat round icon="close" @click="remove"/>
    </div>
  </q-card>
</template>

<script>
import { useQuasar } from 'quasar';
import { onMounted, watch, computed, ref } from 'vue';
import { useStore } from 'vuex';
import { useRouter } from 'vue-router';
import { isEqual, makeOptions, handleError, isEmpty } from '../utilities';
import DataChart from './DataChart';

export default {
  props: {
    'controls': Array,
    'controlData': Object,
    'dark': Boolean,
    'dense': Boolean,
    'changed': Boolean,
    'linkChanged': Boolean,
    'editing': Boolean,
    'selectedControl': null,
    'view': null,
    'index': Number,
  },
  components: {
    DataChart
  },
  emits: ['remove', 'replace', 'loaded', 'link'],
  setup (props, context) {
    const router = useRouter();
    const store = useStore();
    const $q = useQuasar();
    const database = store.$db()
    const Resource = database.model('_resources')

    const loading = ref(0);
    const resource = computed(() =>
      view.value ? Resource.find(view.value.resource) : null
    );
    const chart = computed(() => {
      const $view = view.value;
      if (!$view) {
        return {};
      }
      const $resource = resource.value;
      if (!$resource) {
        return {};
      }
      const defaultChart = {combine_using: 'count', combine: $resource.id_field, type: 'value', suffix: ` ${$resource.singularTitle}`,};
      let chart = ($view.data || {}).chart;
      if (!chart.type) {
        chart = defaultChart;
      }
      const result = {...chart, resource: $resource};
      if (!result.title && view.value) {
        result.title = view.value.name;
      }
      return result;
    });
    const view = computed(() => {
      const View = Resource.find('views');
      const viewId = props.view;
      return View ? View.getRecord(viewId) : null;
    });

    const data = ref([]);
    const requestInProgress = ref(null);
    const addControlFilters = (filters) => {
      const result = [...filters];
      (props.controls || []).forEach(control => {
        const link = control.views[props.view];
        const controlType = control.type;
        if (link) {
          const controlValue = (props.controlData || {})[control.id];
          if (!isEmpty(controlValue)) {
            const mainType = controlType.split('.')[0];
            const subType = controlType.split('.').slice(1).join('.');
            let operator;
            if (controlValue.operator) {
              operator = controlValue.operator;
            } else {
              operator = ['resource', 'field'].includes(mainType) ? '$in': (
                subType === 'text' ? '$contains': '$eq'
              );
            }
            const key = `${link}.${operator}`;
            result.push({[key]: controlValue});
          }
        }
      });
      return result;
    };
    const getFilters = ($view) => {
      return addControlFilters(($view.data || {}).filters || []);
    };
    const lastFilters = ref(null);
    const lastResource = ref(null);
    const requestChart = async () => {
      const $view = view.value;
      if (!$view) {
        return
      }
      const $resource = resource.value;
      if (!$resource) {
        return
      }

      if (requestInProgress.value) {
        requestInProgress.value.abort();
        requestInProgress.value = null;
      }
      requestInProgress.value = new AbortController();
      const filter = getFilters($view);
      lastResource.value = $resource.name;
      lastFilters.value = filter;
      loading.value = 1;
      let response;
      try {
        response = await $resource.getAPI({ filter, combine: chart.value, signal: requestInProgress.value.signal });
      } catch (e) {
        requestInProgress.value = null;
        return handleError($q, e);
      }
      data.value = response.data.data;
      loading.value = 0;
      // delayed loaded emit to give some time for animations
      // setTimeout(() => context.emit('loaded'), 500);
      context.emit('loaded');
      requestInProgress.value = null;
    }

    onMounted(requestChart);
    watch(view, () => {
      const $resource = resource.value;
      if (
        !view.value ||
        !$resource ||
        !isEqual(getFilters(view.value), lastFilters.value) ||
        !isEqual(lastResource.value, $resource.name)
      ) {
        requestChart();
      }
    });
    watch(() => ({...props.controlData}), () => {
      if (view.value && !isEqual(getFilters(view.value), lastFilters.value)) {
        requestChart();
      }
    });
    const remove = () => context.emit('remove');
    const click = () => {
      const $view = view.value;
      if (!props.editing && $view) {
        // go to view
        router.push(Resource.getResourceLink($view.resource, $view, lastFilters.value));
      }
    }
    const linking = ref(false);
    const linkDropdown = ref(null);
    const link = computed(() => {
      const { selectedControl, view } = props;
      if (!selectedControl || !selectedControl.views || !view || !view.id || !selectedControl.views[view.id]) {
        // no control / view / link
        return null;
      }
      return selectedControl.views[view.id];
    });
    const liveResource = computed(() => {
      let $resource = resource.value;
      if (!liveLinkPath.value.length) {
        return $resource;
      }
      let next;
      liveLinkPath.value.forEach(link => {
        const field = $resource.getField(link.link.id);
        if (field.related) {
          $resource = $resource.getRelation(field.related);
        }
      });
      return $resource;
    });
    const liveField = computed(() => {
      let field = null;
      let $resource = resource.value;
      if (!liveLinkPath.value.length) {
        return field;
      }
      liveLinkPath.value.forEach(link => {
        field = $resource.getField(link.link.id);
        if (field.related) {
          $resource = $resource.getRelation(field.related);
        }
      });
      return field;
    });
    const onLink = (link) => {
      liveLinkPath.value.push({link});
      if (liveLinkMatches.value) {
        context.emit('link', liveLinkValue.value);
      }
    };
    const startLink = () => {
      linking.value = true;
      liveLinkPath.value = [];
      setTimeout(() => linkDropdown.value.showPopup(), 0);
    };
    const stopLink = () => {
      liveLinkPath.value = [];
      linking.value = false;
    };
    const linkPath = computed(() => {
      const { view, selectedControl } = props;
      if (!selectedControl || !view) {
        return [];
      }
      const controlViews = selectedControl.views || {};
      const controlView = controlViews[view];
      if (!controlView) {
        return [];
      }
      return controlView.split('.').map(c => ({link: {id: c, value: c, label: c}}));
    });
    const unlink = () => {
      stopLink();
      context.emit('link', null);
    };

    const liveLinkPath = ref([]);
    const NUMBER_TYPES = ['integer', 'number', 'decimal'];
    const DATETIME_TYPES = ['datetime', 'date'];
    const TEXT_TYPES = ['string', 'text', 'char'];
    const fieldsForControl = (type, fields, exact) => {
      const mainType = type.split('.')[0];
      const subType = type.split('.').slice(1).join('.');
      return fields.filter(field => {
        if (!field) {
          return false;
        }
        const check = !exact && field.related;
        switch (mainType) {
          case 'simple':
            switch (subType) {
              case 'number':
                return NUMBER_TYPES.includes(field.type) || check;
              case 'datetime':
                return DATETIME_TYPES.includes(field.type) || check;
              case 'text':
                return TEXT_TYPES.includes(field.type) || check;
              default:
                throw new Error(`unexpected type ${type}`);
            }
          case 'resource':
            return subType === field.related || check;
          case 'field':
            const fieldId = `${field.resource.name}.${field.name}`;
            return fieldId === subType || check;
          default:
            throw new Error(`unexpected type ${mainType}.*`)
            break;
        }
      });
    };
    const liveLinkMatches = computed(() => {
      const control = props.selectedControl;
      if (!liveField.value) {
        return false;
      }
      return fieldsForControl(control.type, [liveField.value], true).length > 0;
    });
    const linkOptions = computed(() => {
      const $resource = liveResource.value;
      if (!$resource) {
        return null;
      }
      // filter fields by match
      const selectedControl = props.selectedControl;
      const controlType = selectedControl.type;
      return makeOptions(
        fieldsForControl(controlType, $resource.getFields({ filterable: true }, ['name_field', 'simple', 'name']))
      );
    });
    const linkDropdownValue = ref(null);
    watch(() => props.selectedControl, () => {
      liveLinkPath.value = JSON.parse(JSON.stringify(linkPath.value));
      linking.value = false;
    });
    const liveLinkLabel = computed(() => {
      const path = liveLinkPath.value;
      if (!path || !path.length) {
        return null;
      }
      const base = path.map(link => link.link.label).join(': ')
      return liveLinkMatches.value ? base : base + '...' ;
    });
    const liveLinkValue = computed(() => {
      const path = liveLinkPath.value;
      if (!path) {
        return null;
      }
      return path.map(link => link.link.id).join('.')
    });
    const linkValue = computed(() => {
      const path = linkPath.value;
      if (!path) {
        return null;
      }
      return path.map(link => link.link.id).join('.')
    });
    const liveLinkIcon = computed(() => {
      const path = liveLinkPath.value;
      if (!path || !path.length) {
        return null;
      }
      const selectedControl = props.selectedControl;
      return path[path.length - 1].link.icon || (selectedControl ? selectedControl.icon: null)
    });
    return {
      chart,
      data,
      resource,
      loading,
      remove,
      click,
      onLink,
      startLink,
      stopLink,
      lastFilters,
      linking,
      linkOptions,
      link,
      linkDropdownValue,
      linkDropdown,
      liveLinkPath,
      liveLinkLabel,
      liveResource,
      liveLinkMatches,
      liveLinkIcon,
      unlink,
    }
  }
}
</script>
