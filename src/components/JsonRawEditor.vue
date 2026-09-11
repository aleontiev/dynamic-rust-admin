<template>
  <div class="JsonRawEditor column">
    <div class="raw-editor-shell">
      <pre class="raw-highlight-layer" v-html="highlightedDraft" />
      <textarea
        v-model="localDraft"
        class="raw-input-layer"
        :readonly="!editable"
        spellcheck="false"
        @scroll="syncScroll"
        ref="rawTextarea"
      />
    </div>

    <div v-if="parseError" class="text-negative text-caption q-mt-xs">
      Invalid JSON: {{ parseError.message }}
    </div>
  </div>
</template>

<script>
import { computed, ref, watch } from "vue";

export default {
  name: "JsonRawEditor",
  props: {
    draft: { type: String, default: "" },
    editable: { type: Boolean, default: false },
    dark: { type: Boolean, default: false },
  },
  emits: ["update:draft", "parsed", "parse-error"],
  setup(props, { emit }) {
    const rawTextarea = ref(null);
    const localDraft = computed({
      get() {
        return props.draft;
      },
      set(v) {
        emit("update:draft", v);
      },
    });

    const parseError = ref(null);
    const lastValidValue = ref(null);
    const canFormat = computed(() => lastValidValue.value !== null);

    const escapeHtml = (str) =>
      str
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");

    const highlightedDraft = computed(() => {
      const source = localDraft.value || "";
      const escaped = escapeHtml(source);
      const withTokens = escaped.replace(
        /("(?:\\u[\da-fA-F]{4}|\\[^u]|[^\\"])*"\s*:?)|(-?\b\d+(?:\.\d+)?(?:[eE][+\-]?\d+)?\b)|\b(true|false)\b|\bnull\b|([{}\[\],:])/g,
        (match, pString, pNumber, pBool, pPunct) => {
          if (pString) {
            const isKey = /:\s*$/.test(pString);
            return `<span class="${isKey ? "tok-key" : "tok-string"}">${pString}</span>`;
          }
          if (pNumber) return `<span class="tok-number">${pNumber}</span>`;
          if (pBool) return `<span class="tok-boolean">${pBool}</span>`;
          if (match === "null") return `<span class="tok-null">${match}</span>`;
          if (pPunct) return `<span class="tok-punctuation">${pPunct}</span>`;
          return match;
        }
      );
      return withTokens || "&nbsp;";
    });

    let timer = null;
    const tryParse = () => {
      const text = localDraft.value ?? "";
      if (!text.trim()) {
        parseError.value = { message: "Empty JSON" };
        lastValidValue.value = null;
        emit("parse-error", parseError.value);
        return;
      }
      try {
        const parsed = JSON.parse(text);
        parseError.value = null;
        lastValidValue.value = parsed;
        emit("parsed", parsed);
      } catch (e) {
        parseError.value = {
          message: e?.message ? e.message : String(e),
        };
        emit("parse-error", parseError.value);
      }
    };

    watch(
      () => localDraft.value,
      () => {
        if (timer) clearTimeout(timer);
        timer = setTimeout(() => {
          tryParse();
        }, 350);
      },
      { immediate: true }
    );

    const format = () => {
      if (!lastValidValue.value) return;
      const formatted = JSON.stringify(lastValidValue.value, null, 2);
      emit("update:draft", formatted);
    };

    const syncScroll = () => {
      if (!rawTextarea.value) return;
      const pre = rawTextarea.value.previousElementSibling;
      if (!pre) return;
      pre.scrollTop = rawTextarea.value.scrollTop;
      pre.scrollLeft = rawTextarea.value.scrollLeft;
    };

    return { localDraft, parseError, canFormat, format, highlightedDraft, rawTextarea, syncScroll };
  },
};
</script>

<style lang="scss" scoped>
.font-mono {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono",
    "Courier New", monospace;
  font-size: 0.9rem;
}

.raw-editor-shell {
  position: relative;
  min-height: 220px;
  border: 1px solid rgba(127, 127, 127, 0.35);
  border-radius: 6px;
  overflow: hidden;
}

.raw-highlight-layer,
.raw-input-layer {
  margin: 0;
  padding: 12px;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono",
    "Courier New", monospace;
  font-size: 0.9rem;
  line-height: 1.4;
  white-space: pre;
  overflow: auto;
}

.raw-highlight-layer {
  pointer-events: none;
  min-height: 220px;
}

.raw-input-layer {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  border: none;
  outline: none;
  background: transparent;
  color: transparent;
  caret-color: #e0e0e0;
  resize: vertical;
}

.raw-editor-shell :deep(.tok-key) {
  color: #4fc3f7;
}
.raw-editor-shell :deep(.tok-string) {
  color: #81c784;
}
.raw-editor-shell :deep(.tok-number) {
  color: #ffb74d;
}
.raw-editor-shell :deep(.tok-boolean) {
  color: #ba68c8;
}
.raw-editor-shell :deep(.tok-null) {
  color: #ef5350;
}
.raw-editor-shell :deep(.tok-punctuation) {
  color: #90a4ae;
}
</style>
