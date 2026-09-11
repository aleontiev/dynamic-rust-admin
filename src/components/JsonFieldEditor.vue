<style lang="scss" scoped>
.JsonFieldEditor {
  width: 100%;
  overflow: hidden;
}

.body--dark .JsonFieldEditor {
  color: inherit;
}
</style>

<template>
  <div class="JsonFieldEditor">
    <template v-if="mode === 'raw'">
      <div class="text-caption text-grey-6 q-mb-xs" v-if="editable && rawStale">
        Raw draft is out of sync with visual changes.
        <q-btn flat dense size="sm" color="primary" label="Sync" @click="syncRawToVisual" />
      </div>
      <JsonRawEditor v-model:draft="rawDraft" :editable="editable" :dark="dark" @parsed="onRawParsed"
        @parse-error="onRawParseError" />
    </template>
    <JsonTreeEditor v-else :tree="tree" :root-id="tree.rootId" :editable="editable" :dark="dark"
      @request-key-rename="onKeyRename" @request-type-change="onTypeChange" @request-value-change="onValueChange"
      @request-remove="onRemoveNode" @request-add-property="onAddProperty" @request-add-array-item="onAddArrayItem" />
  </div>
</template>

<script>
import { computed, ref, watch } from "vue";
import { uuid } from "../utilities";
import {
  areJsonValuesEqual,
  coerceValueForType,
  createDefaultValueForType,
  parseJsonToNodeTree,
  serializeNodeTree,
} from "./JsonEditorModel";
import JsonTreeEditor from "./JsonTreeEditor.vue";
import JsonRawEditor from "./JsonRawEditor.vue";

export default {
  name: "JsonFieldEditor",
  components: {
    JsonTreeEditor,
    JsonRawEditor,
  },
  props: {
    value: { default: null },
    editable: { type: Boolean, default: false },
    dark: { type: Boolean, default: false },
    mode: { type: String, default: "visual" },
  },
  emits: ["update"],
  setup(props, { emit }) {
    const MAX_HISTORY = 80;

    const normalizeInput = (v) => (typeof v === "undefined" ? null : v);
    const deepClone = (x) => {
      if (x === undefined) return undefined;
      if (x === null) return null;
      if (typeof x === "object") return JSON.parse(JSON.stringify(x));
      return x;
    };

    const tree = ref(parseJsonToNodeTree(normalizeInput(props.value)));
    const originalValue = ref(deepClone(normalizeInput(props.value)));

    const serializedValue = computed(() => serializeNodeTree(tree.value));
    const isDirty = computed(
      () => !areJsonValuesEqual(serializedValue.value, originalValue.value)
    );

    const rawDraft = ref(JSON.stringify(serializedValue.value, null, 2));
    const lastRawAppliedValue = ref(deepClone(originalValue.value));
    const rawDraftDirty = ref(false);
    const suppressRawDirty = ref(false);

    const rawStale = computed(
      () => !areJsonValuesEqual(serializedValue.value, lastRawAppliedValue.value)
    );

    const history = ref([]);
    const historyIndex = ref(-1);

    const deepCloneTree = (t) => JSON.parse(JSON.stringify(t));

    const pushSnapshotNow = () => {
      const current = deepCloneTree(tree.value);

      // Avoid exact duplicate snapshots.
      if (historyIndex.value >= 0) {
        const lastSnapshot = history.value[historyIndex.value];
        if (areJsonValuesEqual(serializeNodeTree(lastSnapshot), serializedValue.value)) {
          return;
        }
      }

      history.value = history.value.slice(0, historyIndex.value + 1);
      history.value.push(current);
      if (history.value.length > MAX_HISTORY) {
        history.value.shift();
      }
      historyIndex.value = history.value.length - 1;
    };

    const pendingTimer = ref(null);
    const flushPendingSnapshot = () => {
      if (pendingTimer.value) {
        clearTimeout(pendingTimer.value);
        pendingTimer.value = null;
        pushSnapshotNow();
      }
    };

    const scheduleSnapshot = () => {
      if (!props.editable) return;
      if (pendingTimer.value) clearTimeout(pendingTimer.value);
      pendingTimer.value = setTimeout(() => {
        pendingTimer.value = null;
        pushSnapshotNow();
      }, 350);
    };

    const emitUpdate = () => {
      emit("update", deepClone(serializedValue.value));
    };

    const canUndo = computed(() => historyIndex.value > 0);
    const canRedo = computed(
      () => historyIndex.value >= 0 && historyIndex.value < history.value.length - 1
    );

    const initHistory = () => {
      history.value = [deepCloneTree(tree.value)];
      historyIndex.value = 0;
      pendingTimer.value = null;
    };

    const syncRawToVisual = () => {
      suppressRawDirty.value = true;
      rawDraft.value = JSON.stringify(serializedValue.value, null, 2);
      lastRawAppliedValue.value = deepClone(serializedValue.value);
      rawDraftDirty.value = false;
      suppressRawDirty.value = false;
    };

    const applyTree = (nextTree, { snapshot = "debounced" } = {}) => {
      tree.value = nextTree;
      emitUpdate();

      // Keep raw synchronized when the user isn't actively editing it.
      if (props.mode !== "raw" && !rawDraftDirty.value) {
        syncRawToVisual();
      }

      if (snapshot === "immediate") {
        flushPendingSnapshot();
        pushSnapshotNow();
      } else {
        scheduleSnapshot();
      }
    };

    const findParentId = (t, childId) => {
      for (const [id, node] of Object.entries(t.nodesById || {})) {
        if ((node.type === "object" || node.type === "array") && (node.children || []).includes(childId)) {
          return id;
        }
      }
      return null;
    };

    const collectDescendants = (t, nodeId, acc) => {
      const node = t.nodesById[nodeId];
      if (!node) return acc;
      if (!acc.has(nodeId)) acc.add(nodeId);
      if (node.type === "object" || node.type === "array") {
        for (const childId of node.children || []) {
          collectDescendants(t, childId, acc);
        }
      }
      return acc;
    };

    const removeSubtreeNodes = (t, nodeId) => {
      const acc = collectDescendants(t, nodeId, new Set());
      for (const id of acc) {
        delete t.nodesById[id];
      }
    };

    const onKeyRename = ({ nodeId, key }) => {
      if (!props.editable) return;
      const nextTree = deepCloneTree(tree.value);
      const node = nextTree.nodesById[nodeId];
      if (!node || node.type === "object" || node.type === "array") return;
      const parentId = findParentId(nextTree, nodeId);
      const parent = parentId ? nextTree.nodesById[parentId] : null;
      if (!parent || parent.type !== "object") return;

      const nextKey = (key || "").trim();
      if (!nextKey || nextKey === node.key) return;

      const siblings = (parent.children || [])
        .map((id) => nextTree.nodesById[id]?.key)
        .filter((k) => k !== null && typeof k !== "undefined");

      if (siblings.some((k) => k === nextKey && k !== node.key)) return;

      node.key = nextKey;
      applyTree(nextTree, { snapshot: "debounced" });
    };

    const onValueChange = ({ nodeId, value }) => {
      if (!props.editable) return;
      const nextTree = deepCloneTree(tree.value);
      const node = nextTree.nodesById[nodeId];
      if (!node || node.type === "object" || node.type === "array") return;
      node.value = coerceValueForType(value, node.type);
      applyTree(nextTree, { snapshot: "debounced" });
    };

    const onTypeChange = ({ nodeId, type }) => {
      if (!props.editable) return;
      const nextTree = deepCloneTree(tree.value);
      const node = nextTree.nodesById[nodeId];
      if (!node || node.type === type) return;

      const wasContainer = node.type === "object" || node.type === "array";
      const nextIsContainer = type === "object" || type === "array";

      if (wasContainer) {
        // Discard all descendants when the node changes away from container semantics.
        const toDelete = new Set();
        for (const childId of node.children || []) {
          collectDescendants(nextTree, childId, toDelete);
        }
        for (const id of toDelete) {
          delete nextTree.nodesById[id];
        }
        node.children = [];
      }

      node.type = type;
      if (nextIsContainer) {
        node.value = null;
        node.children = [];
      } else {
        node.value = coerceValueForType(node.value, type);
        node.children = [];
      }

      applyTree(nextTree, { snapshot: "immediate" });
    };

    const onRemoveNode = (nodeId) => {
      if (!props.editable) return;
      if (nodeId === tree.value.rootId) return;

      const nextTree = deepCloneTree(tree.value);
      const parentId = findParentId(nextTree, nodeId);
      const parent = parentId ? nextTree.nodesById[parentId] : null;
      if (!parent || !(parent.type === "object" || parent.type === "array")) return;

      parent.children = (parent.children || []).filter((id) => id !== nodeId);
      removeSubtreeNodes(nextTree, nodeId);

      applyTree(nextTree, { snapshot: "immediate" });
    };

    const onAddProperty = ({ parentId, key }) => {
      if (!props.editable) return;
      const nextTree = deepCloneTree(tree.value);
      const parent = nextTree.nodesById[parentId];
      if (!parent || parent.type !== "object") return;
      const nextKey = (key || "").trim();
      if (!nextKey) return;

      const existing = (parent.children || [])
        .map((id) => nextTree.nodesById[id]?.key)
        .filter((k) => k !== null && typeof k !== "undefined");
      if (existing.includes(nextKey)) return;

      const newId = uuid();
      nextTree.nodesById[newId] = {
        id: newId,
        key: nextKey,
        type: "string",
        value: createDefaultValueForType("string"),
        children: [],
      };
      parent.children = [...(parent.children || []), newId];

      applyTree(nextTree, { snapshot: "immediate" });
    };

    const onAddArrayItem = ({ parentId, index, initialType }) => {
      if (!props.editable) return;
      const nextTree = deepCloneTree(tree.value);
      const parent = nextTree.nodesById[parentId];
      if (!parent || parent.type !== "array") return;

      const nextType = initialType || "string";
      const newId = uuid();
      const nextValue = createDefaultValueForType(nextType);
      nextTree.nodesById[newId] = {
        id: newId,
        key: null,
        type: nextType,
        value: nextType === "object" || nextType === "array" ? null : nextValue,
        children: nextType === "object" || nextType === "array" ? [] : [],
      };

      const children = [...(parent.children || [])];
      if (typeof index === "number") {
        children.splice(index, 0, newId);
      } else {
        children.push(newId);
      }
      parent.children = children;

      applyTree(nextTree, { snapshot: "immediate" });
    };

    const undo = () => {
      if (!canUndo.value) return;
      flushPendingSnapshot();
      historyIndex.value -= 1;
      tree.value = deepCloneTree(history.value[historyIndex.value]);
      emitUpdate();
      syncRawToVisual();
    };

    const redo = () => {
      if (!canRedo.value) return;
      flushPendingSnapshot();
      historyIndex.value += 1;
      tree.value = deepCloneTree(history.value[historyIndex.value]);
      emitUpdate();
      syncRawToVisual();
    };

    const onRawParsed = (parsed) => {
      // Only apply when the parse result actually differs from the current Visual state.
      if (areJsonValuesEqual(parsed, serializedValue.value)) {
        lastRawAppliedValue.value = deepClone(parsed);
        return;
      }
      const nextTree = parseJsonToNodeTree(parsed);
      lastRawAppliedValue.value = deepClone(parsed);
      rawDraftDirty.value = false;
      applyTree(nextTree, { snapshot: "immediate" });
    };

    const onRawParseError = () => {
      // JsonRawEditor already surfaces error UI.
    };

    // Initialize history once.
    initHistory();

    watch(
      rawDraft,
      () => {
        if (suppressRawDirty.value) return;
        if (props.mode === "raw") {
          rawDraftDirty.value = true;
        }
      },
      { immediate: false }
    );

    // Reset editor if the field value changes from outside.
    watch(
      () => props.value,
      (newVal) => {
        const normalized = normalizeInput(newVal);
        const unchanged = areJsonValuesEqual(normalized, originalValue.value);
        if (unchanged && !rawDraftDirty.value) return;
        originalValue.value = deepClone(normalized);
        tree.value = parseJsonToNodeTree(normalized);
        rawDraft.value = JSON.stringify(
          normalizeInput(serializeNodeTree(tree.value)),
          null,
          2
        );
        lastRawAppliedValue.value = deepClone(normalized);
        rawDraftDirty.value = false;
        initHistory();
        if (!unchanged) emitUpdate();
      },
      { deep: true }
    );

    // Reset when leaving edit mode (e.g. cancel)
    watch(
      () => props.editable,
      (next, prev) => {
        if (!next && prev) {
          const normalized = normalizeInput(props.value);
          originalValue.value = deepClone(normalized);
          tree.value = parseJsonToNodeTree(normalized);
          rawDraft.value = JSON.stringify(
            normalizeInput(serializeNodeTree(tree.value)),
            null,
            2
          );
          lastRawAppliedValue.value = deepClone(normalized);
          rawDraftDirty.value = false;
          initHistory();
        }
      }
    );

    return {
      tree,
      rawDraft,
      rawStale,
      canUndo,
      canRedo,
      isDirty,
      undo,
      redo,
      syncRawToVisual,
      onKeyRename,
      onTypeChange,
      onValueChange,
      onRemoveNode,
      onAddProperty,
      onAddArrayItem,
      onRawParsed,
      onRawParseError,
    };
  },
};
</script>
