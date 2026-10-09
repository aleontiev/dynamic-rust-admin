<style lang="scss">
.FileFieldInput {
  position: relative;
  white-space: normal;
  // The field's value box scales its text to its width; a file keeps the
  // size of the admin's other inputs.
  font-size: 14px;
  line-height: 1.5;
  .FileFieldInput__drop {
    min-height: 56px;
    padding: 8px 12px;
    border: 1px dashed rgba(0, 0, 0, 0.24);
    border-radius: 4px;
    cursor: pointer;
    transition: border-color 0.3s ease, background-color 0.3s ease;
    &:hover,
    &:focus-visible {
      border-color: rgba(0, 0, 0, 0.87);
      outline: none;
    }
  }
  &.dark .FileFieldInput__drop {
    border-color: rgba(255, 255, 255, 0.4);
    &:hover,
    &:focus-visible {
      border-color: rgba(255, 255, 255, 0.87);
    }
  }
  .FileFieldInput__file {
    min-height: 56px;
    padding: 4px 0;
  }
  // Underlined like the admin's other inputs, in the primary color once changed.
  .FileFieldInput__file--editing {
    border-bottom: 1px solid rgba(0, 0, 0, 0.24);
  }
  &.dark .FileFieldInput__file--editing {
    border-bottom-color: rgba(255, 255, 255, 0.6);
  }
  &.FileFieldInput--dragging {
    .FileFieldInput__drop,
    .FileFieldInput__file {
      border: 1px dashed $primary;
      border-radius: 4px;
      background: rgba($primary, 0.08);
    }
    .FileFieldInput__file {
      padding-left: 8px;
      padding-right: 8px;
    }
  }
  .FileFieldInput__input {
    display: none;
  }
}
.Field--changed .FileFieldInput .FileFieldInput__file--editing {
  border-bottom: 2px solid $primary;
}
</style>
<template>
  <div
    :class="{
      FileFieldInput: true,
      dark: dark,
      'FileFieldInput--dragging': dragging,
    }"
    @dragenter.prevent="onDragEnter"
    @dragover.prevent
    @dragleave="onDragLeave"
    @drop.prevent="onDrop"
  >
    <input
      v-if="!readonly"
      ref="input"
      class="FileFieldInput__input"
      type="file"
      :aria-label="`Choose a file for ${field.label || field.name}`"
      @change="onChoose"
    />
    <div
      v-if="shown"
      :class="{
        'FileFieldInput__file row items-center': true,
        'FileFieldInput__file--editing': !readonly,
      }"
    >
      <FileValue
        class="col"
        :value="shown"
        :dark="dark"
        :status="status"
      >
        <template v-if="!readonly">
          <q-btn
            flat
            round
            dense
            icon="upload"
            :class="muted"
            :aria-label="`Replace ${shown.name}`"
            @click.stop="choose"
          >
            <q-tooltip>Replace</q-tooltip>
          </q-btn>
          <q-btn
            flat
            round
            dense
            icon="close"
            :class="muted"
            :aria-label="`Remove ${shown.name}`"
            @click.stop="remove"
          >
            <q-tooltip>Remove</q-tooltip>
          </q-btn>
        </template>
      </FileValue>
    </div>
    <div
      v-else-if="!readonly"
      class="FileFieldInput__drop row no-wrap items-center"
      role="button"
      tabindex="0"
      :aria-label="`Add a file to ${field.label || field.name}`"
      @click="choose"
      @keydown.enter.prevent="choose"
      @keydown.space.prevent="choose"
    >
      <q-icon
        name="upload_file"
        size="24px"
        :color="dragging ? 'primary' : null"
        :class="['q-mr-sm', dragging ? '' : muted]"
      />
      <span :class="dragging ? 'text-primary' : muted">
        Drop a file here or <span class="text-primary">choose one</span>
      </span>
    </div>
    <div v-else :class="['FileFieldInput__file row items-center', muted]">
      No file
    </div>
    <q-linear-progress
      v-if="transfer"
      class="q-mt-xs"
      rounded
      color="primary"
      :indeterminate="!transfer.started"
      :value="progress"
      :aria-label="`Uploading ${transfer.name}`"
    />
    <div
      v-if="error"
      class="FileFieldInput__error text-negative text-caption q-mt-xs"
      role="alert"
    >
      {{ error }}
    </div>
  </div>
</template>

<script>
import { computed, onBeforeUnmount, reactive, ref } from "vue";
import FileValue from "./FileValue.vue";
import {
  describeUpload,
  formatFileSize,
  uploadErrorMessage,
  uploadFile,
} from "../api/files";

// A Dynamic Rust file field being edited. Choosing or dropping a file uploads
// it at once; the field then holds `{"upload": "<id>"}` until the record is
// saved. Remove sets it to null; the file the record had stays until then.
export default {
  props: {
    value: null,
    field: Object,
    resource: Object,
    readonly: Boolean,
    dark: Boolean,
  },
  emits: ["update"],
  components: { FileValue },
  setup(props, context) {
    const input = ref(null);
    const transfer = ref(null);
    const error = ref(null);
    const depth = ref(0);
    const dragging = computed(() => depth.value > 0 && !props.readonly);

    const shown = computed(() => {
      if (transfer.value) {
        return transfer.value;
      }
      const value = props.value;
      if (value && value.upload) {
        return describeUpload(value.upload) || { name: "New file" };
      }
      return value && typeof value === "object" && value.name ? value : null;
    });
    const progress = computed(() => {
      const $transfer = transfer.value;
      return $transfer && $transfer.total
        ? $transfer.loaded / $transfer.total
        : 0;
    });
    const status = computed(() => {
      const size = formatFileSize(shown.value?.size);
      if (transfer.value) {
        const percent = Math.floor(progress.value * 100);
        return [size, `uploading ${percent}%`].filter(Boolean).join(" · ");
      }
      if (props.value && props.value.upload) {
        return [size, "ready to save"].filter(Boolean).join(" · ");
      }
      return null;
    });

    // Stop the upload in progress; the field goes back to what it held.
    const cancel = () => {
      const $transfer = transfer.value;
      if (!$transfer) {
        return undefined;
      }
      transfer.value = null;
      $transfer.abort();
      return $transfer.before;
    };
    const pick = (file) => {
      if (!file || props.readonly) {
        return;
      }
      const stopped = transfer.value ? cancel() : props.value;
      const before = typeof stopped === "undefined" ? null : stopped;
      error.value = null;
      const state = reactive({
        name: file.name,
        size: file.size,
        content_type: file.type,
        loaded: 0,
        total: file.size,
        started: false,
        before,
        abort: () => {},
      });
      transfer.value = state;
      const { promise, abort } = uploadFile({
        model: props.resource.name,
        field: props.field.name,
        file,
        onStart: (upload) => {
          state.started = true;
          context.emit("update", { upload: upload.id });
        },
        onProgress: (loaded, total) => {
          state.loaded = loaded;
          state.total = total;
        },
      });
      state.abort = abort;
      promise.then(
        () => {
          if (transfer.value === state) {
            transfer.value = null;
          }
        },
        (reason) => {
          if (reason?.aborted || transfer.value !== state) {
            return;
          }
          transfer.value = null;
          error.value = uploadErrorMessage(reason);
          context.emit("update", before);
        }
      );
    };
    const choose = () => {
      if (input.value && !props.readonly) {
        input.value.value = "";
        input.value.click();
      }
    };
    const onChoose = (event) => {
      const files = event.target.files;
      pick(files && files[0]);
    };
    const remove = () => {
      cancel();
      error.value = null;
      context.emit("update", null);
    };
    const onDragEnter = () => {
      depth.value += 1;
    };
    const onDragLeave = () => {
      depth.value = Math.max(0, depth.value - 1);
    };
    const onDrop = (event) => {
      depth.value = 0;
      const files = event.dataTransfer && event.dataTransfer.files;
      pick(files && files[0]);
    };
    // Leaving the form (discarding it, or going elsewhere) drops its upload.
    onBeforeUnmount(() => {
      if (transfer.value) {
        transfer.value.abort();
      }
    });
    return {
      input,
      transfer,
      error,
      dragging,
      shown,
      progress,
      status,
      muted: computed(() => (props.dark ? "text-grey-5" : "text-grey-7")),
      choose,
      onChoose,
      remove,
      onDragEnter,
      onDragLeave,
      onDrop,
    };
  },
};
</script>
