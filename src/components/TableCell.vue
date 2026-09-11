<style lang="scss">
</style>
<template>
  <q-td :props="props" @click="onClick(props.rowIndex, props.col)">
    <div class="table__cell-inner row no-wrap justify-start items-center">
      <span v-if="skeleton">
        <q-skeleton type="text"/>
      </span>
      <span v-else-if="!props.value"/>
      <div v-else-if="props.col.name === resource.name_field || props.col.type === 'one'" class="row no-wrap">
        <PageLink :resource="resource" :field="props.col.name" :record="record" :classNames="props.col.name !== resource.name_field && dense && props.value ? 'col-xs-10 display-block': null"/>
        <span class="col-xs-2" style="text-align: center" v-if="dense && props.value && props.col.name !== resource.name_field" v-text="'.....'"/>
      </div>
      <div v-else-if="props.col.type === 'many'" class="row no-wrap">
        <PageLink :resource="resource" :field="props.col.name" :record="record" v-for="relation in resource.getValue(record, props.col.name, 1)" :relation="relation" :key="relation.id" classNames="col-xs-10 display-block"/>
        <span style="text-align: center" class="col-xs-2" v-if="resource.getValue(record, props.col.name).length > 0" v-text="'(' + resource.getValue(record, props.col.name).length + ')'"/>
      </div>
      <MediaPreview
        v-else-if="isMediaField"
        :value="mediaValue"
        :fieldType="props.col.type"
        :itemType="props.col.item_type"
        compact
      />
      <a :href="props.value" v-else-if="props.value && props.col.type === 'string' && props.value.indexOf('https') === 0">
        {{ props.value }}
      </a>
      <span v-else>{{ props.value }}</span>
    </div>
  </q-td>
</template>

<script>
import { computed } from 'vue';
import PageLink from './PageLink';
import MediaPreview from './MediaPreview';

export default {
  props: ['props', 'record', 'resource', 'dense', 'skeleton'],
  emits: ['click'],
  components: {
    PageLink,
    MediaPreview
  },
  setup (props, context) {
    const onClick = (index, col) => {
      context.emit('click', [index, col]);
    };
    const isMediaField = computed(() =>
      ['file upload', 'image upload'].includes(props.props.col.type) ||
      ['file upload', 'image upload'].includes(props.props.col.item_type)
    );
    const mediaValue = computed(() =>
      props.resource.getValue(props.record, props.props.col.name)
    );
    return {
      onClick,
      isMediaField,
      mediaValue
    }
  }
}
</script>
