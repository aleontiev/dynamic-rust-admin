<style lang="scss">

</style>
<template>
  <q-item v-if="url" clickable class="q-pl-sm" tag="a" :href="url" @click="click">
    <q-item-section avatar style="width: 25px">
      <q-icon :name="icon" size="sm" class="q-ml-sm q-pl-xs"/>
    </q-item-section>
    <q-item-section class="no-wrap text-base white-space-pre overflow-hidden ellipsis">
      {{ label }}
    </q-item-section>
    <q-item-section side class="q-mr-xs text-grey text-subtitle">
      <span v-if="createdLabel">
        {{ createdLabel }}<br/>
        <q-icon size="sm" name="history"/>
      </span>
      <span v-else-if="icon">
        <span v-if="secondaryLabel">{{ secondaryLabel }}<br/></span>
        <q-icon size="sm" :name="icon"/>
      </span>
    </q-item-section>
  </q-item>
</template>

<script>
import { formatDistance, parseISO } from 'date-fns';
import { computed } from 'vue';
import { getRelativeTimeLabel } from '../utilities';

export default {
  props: ['result', 'dense'],
  // result:
  //   resource
  //   record
  //   dashboard
  //   view
  //   recent
  emits: ['click'],
  setup (props, context) {
    const icon = computed(() => {
      const { dashboard, view, resource } = props.result;
      if (resource) {
        return `mdi-${resource.icon}`;
      }
      if (dashboard) {
        return 'mdi-view-dashboard';
      }
      if (view) {
        return 'mdi-eye';
      }
      return 'list';
    });
    const url = computed(() => {
      const { record, dashboard, view, resource } = props.result;
      if (dashboard) {
        return `.?dashboard=${dashboard.id}`;
      }
      if (!resource) {
        return null;
      }
      if (view) {
        return `${resource.name}/?view=${view.id}`;
      }
      return resource.getLink(record);
    });
    const label = computed(() => {
      const { dashboard, view, record, resource } = props.result;
      if (dashboard) {
        return dashboard.name;
      }
      if (view) {
        return view.name;
      }
      return record ? resource.getName(record) : resource.title;
    });
    const click = () => {
      context.emit('click');
    };
    const secondaryLabel = computed(() => {
      return null; // props.result.view ? 'V': (props.result.dashboard ? 'D': null);
    });
    const createdLabel = computed(() => {
      return getRelativeTimeLabel(props.result.record?.created || props.result.recent);
    });
    return {
      icon,
      url,
      label,
      click,
      createdLabel,
      secondaryLabel
    }
  }
}
</script>
