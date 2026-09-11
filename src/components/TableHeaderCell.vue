<style lang="scss">
</style>
<template>
  <q-th :props="props" :class="{'clickable': field && canSort}">
    <div class="table__cell-inner row no-wrap justify-start items-center">
      <q-icon
        v-if="props.col !== resource.name_field"
        :name="resource.getFieldIcon(props.col.name)"
        :size="dense ? 'xs' : 'sm'"
        class="q-mr-xs q-ml-xs"
      />
      {{ props.col.label }}
      <q-icon
        v-if="sortDirection"
        :name="sortDirection === 1 ? 'arrow_upward' : 'arrow_downward'"
        :size="dense ? 'xs' : 'sm'"
        class="q-mr-xs q-ml-xs"
        />
    </div>
    <q-menu no-focus fit :offset="[0, 0]">
      <q-list>
        <q-item clickable v-close-popup @click="sort(false)" v-if="canSort && field.filterable">
          <q-item-section side>
            <q-icon name="mdi-sort-ascending"/>
          </q-item-section>
          <q-item-section>
            Sort
          </q-item-section>
        </q-item>
        <q-item clickable v-close-popup @click="sort(true)" v-if="canSort && field.filterable">
          <q-item-section side>
            <q-icon name="mdi-sort-descending"/>
          </q-item-section>
          <q-item-section>
            Reverse
          </q-item-section>
        </q-item>
        <q-item clickable v-close-popup @click="hide()" v-if="resource.name_field !== props.col.name">
          <q-item-section side>
            <q-icon name="mdi-eye"/>
          </q-item-section>
          <q-item-section>
            Hide
          </q-item-section>
        </q-item>
      </q-list>
    </q-menu>
  </q-th>
</template>

<script>
import { computed } from 'vue';

export default {
  props: ['props', 'resource', 'dense', 'canSort', 'sorts'],
  emits: ['sort', 'hide'],
  setup (props, context) {
    const field = computed(() => (props.props.col && props.resource) ? props.resource.getField(props.props.col.name) : null);
    const sort = (reverse) => {
      context.emit('sort', reverse);
    };
    const sortDirection = computed(() => {
      if (props.sorts) {
        const sorts = props.sorts.filter(s => s && s.replace('-', '') === props.props.col.name);
        if (sorts.length) {
          return sorts[0][0] === '-' ? -1 : 1;
        }
        return null;
      }
      return null;
    });
    const hide = () => context.emit('hide');
    return {
      field,
      sort,
      hide,
      sortDirection
    }
  }
}
</script>
