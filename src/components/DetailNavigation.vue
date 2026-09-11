<style lang="scss">
.DetailNavigation {
  &.create {
    height: auto;
    min-height: 4px;
  }
  &.dark.focus {
    color: $grey-5;
  }
  &:not(.dark).focus {
    color: black;
  }
  &.changed:not(.saving) {
    .focus {
      color: $primary;
    }
  }
  .absolute-bottom {
    position: absolute;
    bottom: 0;
  }
  .DetailNavigation__row {
    background: white;
    padding-left: 16px;
    padding-right: 16px;
    padding-top: 8px;
    &.elevated {
      background: $grey-1;
    }
  }

  .DetailNavigation__row:first-child {
    padding-top: 16px;
  }
  &.bg-dark {
    .DetailNavigation__row {
      background: var(--q-dark);
    }
    .DetailNavigation__row.elevated {
      background: #000910;
    }
  }
}
</style>

<template>
  <div
    v-if="name || mode === 'create' || mode === 'dialog'"
    :class="{
      create: mode === 'create' || mode === 'dialog',
      'DetailNavigation row sticky': true,
      saving: saving,
      changed: focusedChanged,
      focused: focused,
      'bg-dark dark': dark,
      'bg-white': !dark,
    }"
    style="top: 0px; z-index: 10; right: 0; left: 0; max-width: 100vw"
  >
    <div
      v-if="mode === 'update'"
      class="DetailNavigation__row elevated row full-width text-h7 q-pt-sm q-pb-sm"
    >
      <div class="col-auto" style="text-transform: capitalize">
        <q-icon
          class="clickable"
          :name="'mdi-' + resource.icon"
          size="sm"
          @click="toResource"
        />
      </div>
      <div class="col q-pl-md" style="white-space: nowrap; overflow: hidden">
        <PageLink
          :resource="resource"
          :record="record"
          v-if="embedded && !editing"
        />
        <span v-else :class="'Link ' + color">{{ name }}</span>
      </div>
      <div class="col-auto">
        <q-btn
          v-if="!editing && sections.length"
          :icon="submenuRightIcon"
          size="sm"
          flat
          round
          @click.stop.prevent="submenuClick"
          :color="!submenuOpen && fieldset !== 'All' ? 'primary' : null"
        />
      </div>
    </div>
    <div
      v-if="submenuOpen"
      :class="{
        'DetailNavigation__row row full-width clickable': true,
        elevated: !focused,
      }"
      style="overflow: auto"
      @click="submenuRowClick"
    >
      <div class="col-auto row q-pr-md q-mb-xs items-center justify-center">
        <q-icon
          :name="submenuLeftIcon"
          size="sm"
          :color="submenuLeftColor"
          class="q-pt-xs"
        />
      </div>
      <div v-if="!focused" class="col row" style="overflow: auto">
        <q-tabs :dense="dense" v-model="fieldset" indicator-color="primary">
          <q-tab name="All" key="All" label="All" />
          <q-tab
            :name="section.name"
            :key="section.name"
            v-for="section in sections"
            class="col"
            :label="section.name"
          />
        </q-tabs>
      </div>
      <div
        v-if="focused"
        class="q-pt-md q-pb-md items-center col row focus"
        style="overflow: auto"
      >
        {{ focusedLabel }}
      </div>
      <div class="col-auto items-center justify-center col row">
        <q-btn
          v-if="true || !embedded || !editing"
          :icon="submenuRightIcon"
          size="sm"
          flat
          round
          :color="!submenuOpen && fieldset !== 'All' ? 'primary' : null"
          @click.stop.prevent="submenuClick"
        />
      </div>
    </div>
    <q-linear-progress
      class="full-width absolute-bottom"
      v-if="deleting || saving || !!loading"
      indeterminate
      :color="progressColor"
      :size="dense ? '2px' : '4px'"
      style="z-index: 99"
    />
  </div>
</template>

<script>
import { ref, computed, watch, onMounted } from "vue";
import { useRouter } from "vue-router";
import PageLink from "./PageLink";

export default {
  props: {
    deleting: Boolean,
    resource: Object,
    saving: Boolean,
    fields: Array,
    displayFields: Object,
    record: Object,
    changes: Object,
    focused: String,
    mode: String,
    dense: Boolean,
    dark: Boolean,
    loading: Number,
    embedded: Boolean,
    inline: Boolean,
    editing: Boolean,
  },
  components: {
    PageLink,
  },
  emits: ["change", "focus"],
  setup(props, context) {
    const fieldset = ref("All");
    const router = useRouter();
    const submenuOpen = ref(false);
    onMounted(() => {
      if (props.focused) {
        submenuOpen.value = true;
      }
    });
    watch(fieldset, (value) => {
      context.emit("change", value);
    });
    watch(
      () => props.focused,
      (value) => {
        if (value) {
          submenuOpen.value = true;
        } else {
          submenuOpen.value = false;
        }
      }
    );
    const focusedChanged = computed(
      () =>
        props.focused &&
        props.changes &&
        typeof props.changes[props.focused] !== "undefined"
    );
    const highlight = computed(() => (props.dark ? "grey-3" : "grey-7"));
    const progressColor = computed(() => {
      const $highlight = highlight.value;
      return props.deleting
        ? "red-5"
        : props.saving || props.loading > 1
        ? "primary"
        : $highlight;
    });
    const submenuLeftColor = computed(() =>
      focusedChanged.value ? "primary" : props.dark ? "grey-5" : "black"
    );
    const color = computed(() => props.resource.getStyle(props.record));
    const sections = computed(() => {
      let $sections = props.resource.sections;
      if (!$sections) {
        return [];
      }
      $sections = $sections.filter((section) =>
        section.fields.some(
          (field) => typeof props.displayFields[field] !== "undefined"
        )
      );
      if ($sections.length === 1) {
        // just display "All"
        return [];
      }
      return $sections;
    });
    return {
      fieldset,
      submenuOpen,
      name: computed(() => {
        if (props.mode === "create") {
          return `New ${props.resource.label}`;
        }
        return props.record && props.resource && props.resource.name_field
          ? props.record[props.resource.name_field]
          : null;
      }),
      submenuRightIcon: computed(() => {
        const back = props.focused ? "keyboard_arrow_left" : "close";
        return submenuOpen.value ? back : "unfold_more";
      }),
      focusedLabel: computed(() =>
        props.resource &&
        props.focused &&
        props.resource.getPathField(props.focused)
          ? props.resource.getPathField(props.focused).label
          : null
      ),
      submenuClick: () => {
        if (!props.focused) {
          submenuOpen.value = !submenuOpen.value;
        } else {
          submenuOpen.value = false;
          if (props.mode === "update") {
            router.go(-1);
          } else {
            context.emit("focus", null);
          }
        }
      },
      highlight,
      submenuRowClick: () => {
        if (props.focused) {
          submenuOpen.value = false;
          if (props.mode !== "update" && !props.inline) {
            router.go(-1);
          } else {
            context.emit("focus", null);
          }
        }
      },
      submenuLeftIcon: computed(() => {
        return props.focused
          ? props.resource.getFieldIcon(props.focused)
          : "view_week";
      }),
      submenuLeftColor,
      color,
      focusedChanged,
      focusName: () => {
        if (!props.focused) {
          context.emit("focus", props.resource.name_field);
        }
      },
      toResource: () => {
        router.push(props.resource.getLink());
      },
      sections,
      progressColor,
    };
  },
};
</script>
