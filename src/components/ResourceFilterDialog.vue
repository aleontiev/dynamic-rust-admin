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
        <q-icon name="mdi-filter" size="sm" />
        <q-toolbar-title>
          {{ title }}
        </q-toolbar-title>
        <q-btn flat round dense icon="close" />
      </q-toolbar>
      <q-card-section
        :class="{ 'q-pb-xxl q-mb-xl': dense, 'q-pb-xl q-mb-lg': !dense }"
        :style="{ minHeight: dense ? 'calc(100dvh - 52px)' : 'inherit' }"
      >
        <div :class="{ 'text-h6': true, 'q-pt-xl q-mt-sm': dense }">
          Showing {{ label }}
        </div>

        <FilterList
          :value="liveFilter"
          :dark="dark"
          :dense="dense"
          :resource="resource"
          @update="onFilterUpdate"
          @delete="onFilterDelete"
          @add="onFilterAdd"
          editable="true"
          :original="filter"
        />
      </q-card-section>
      <div
        v-if="canDiscard || canClear || canSave"
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
            icon="restart_alt"
            label="Clear"
            @click="clear"
            v-if="canClear"
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
import { onMounted, watch, computed, ref } from "vue";
import { useQuasar } from "quasar";
import { IconButton, ActionBar, FilterList } from ".";
import { toTitleCase } from "../utilities";

export default {
  props: ["dense", "dark", "resource", "filter"],
  components: {
    IconButton,
    ActionBar,
    FilterList,
  },
  setup(props, context) {
    // filter:
    // - name.like: John
    // - age.gte: 30
    // - location.name: USA

    const liveFilter = ref([]);
    const $q = useQuasar();
    const reset = () => {
      liveFilter.value = [...props.filter];
    };
    onMounted(() => {
      reset();
    });
    watch(() => [props.resource, props.filter], reset);

    const hasChanges = computed(() => {
      const $filter = liveFilter.value;
      const filter = props.filter;
      return JSON.stringify(filter) !== JSON.stringify($filter);
    });
    return {
      isOpen: computed({
        get() {
          return props.value;
        },
        set(newValue) {
          context.emit("input", newValue);
        },
      }),
      onFilterUpdate: ({ index, update }) => {
        liveFilter.value[index] = update;
      },
      onFilterDelete: ({ index }) => {
        liveFilter.value.splice(index, 1);
      },
      canSave: hasChanges,
      canDiscard: hasChanges,
      title: computed(() => {
        const count = liveFilter.value.length;
        return `${count} Filters`;
      }),
      save: () => {
        context.emit("update", liveFilter.value);
      },
      discard: reset,
      onFilterAdd: () => {
        liveFilter.value.push({});
      },
      liveFilter,
      clear: () => {
        liveFilter.value = [];
      },
      canClear: computed(() => liveFilter.value.length > 0),
      label: computed(() => {
        const numFilters = liveFilter.value.length;
        const title = toTitleCase(props.resource.name);
        return numFilters === 0
          ? `all ${title}`
          : numFilters === 1
          ? `${title} where:`
          : `${title} where:`;
      }),
    };
  },
};
</script>
