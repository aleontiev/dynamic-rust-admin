<style lang="scss">
.FileValue {
  min-width: 0;
  max-width: 100%;
  white-space: normal;
  .FileValue__text {
    min-width: 0;
    flex: 1 1 auto;
  }
  .FileValue__name {
    display: block;
    max-width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  &.FileValue--compact .FileValue__text {
    flex: 0 1 auto;
  }
}
</style>
<template>
  <div
    v-if="value"
    :class="{
      'FileValue row no-wrap items-center': true,
      'FileValue--compact': compact,
    }"
    :data-file="value.name"
  >
    <q-icon
      :name="icon"
      :size="compact ? '18px' : '24px'"
      :class="['q-mr-sm', muted]"
    />
    <div class="FileValue__text column">
      <a
        v-if="url"
        class="FileValue__name Link primary"
        :href="url"
        :download="value.name"
        :title="value.name"
        @click.stop
        >{{ value.name }}</a
      >
      <span v-else class="FileValue__name" :title="value.name">{{
        value.name
      }}</span>
      <span v-if="!compact && details" :class="['text-caption', muted]">{{
        details
      }}</span>
    </div>
    <span
      v-if="compact && size"
      :class="['q-ml-sm text-caption no-wrap', muted]"
      >{{ size }}</span
    >
    <q-btn
      v-if="url && !compact"
      flat
      round
      dense
      icon="download"
      :class="['q-ml-xs', muted]"
      :href="url"
      :download="value.name"
      :aria-label="`Download ${value.name}`"
      @click.stop
    >
      <q-tooltip>Download</q-tooltip>
    </q-btn>
    <slot />
  </div>
</template>

<script>
import { computed } from "vue";
import { formatDistance, parseISO } from "date-fns";
import { fileUrl, fileIcon, formatFileSize } from "../api/files";

// A file a record holds: its name (which downloads it), size and when it came.
export default {
  props: {
    value: Object,
    dark: Boolean,
    compact: Boolean,
    // What to say under the name instead of its size and upload time.
    status: String,
  },
  setup(props) {
    const size = computed(() => formatFileSize(props.value?.size));
    const uploaded = computed(() => {
      const value = props.value?.uploaded;
      if (!value) {
        return "";
      }
      try {
        return `uploaded ${formatDistance(parseISO(value), new Date(), {
          addSuffix: true,
        })}`;
      } catch (error) {
        return "";
      }
    });
    return {
      url: computed(() => fileUrl(props.value)),
      icon: computed(() => fileIcon(props.value?.content_type)),
      size,
      details: computed(
        () =>
          props.status ||
          [size.value, uploaded.value].filter(Boolean).join(" · ")
      ),
      muted: computed(() => (props.dark ? "text-grey-5" : "text-grey-7")),
    };
  },
};
</script>
