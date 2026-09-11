import { uuid } from "../utilities";

export const NODE_TYPES = [
  "string",
  "integer",
  "float",
  "boolean",
  "object",
  "array",
  "null",
];

export const isPrimitiveType = (type) =>
  type !== "object" && type !== "array";

export const inferNodeTypeFromValue = (value) => {
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  if (typeof value === "object") return "object";
  if (typeof value === "boolean") return "boolean";
  if (typeof value === "string") return "string";
  if (typeof value === "number") {
    return Number.isInteger(value) ? "integer" : "float";
  }
  // Fallback for unexpected JSON-like values.
  return "string";
};

export const createDefaultValueForType = (type) => {
  switch (type) {
    case "string":
      return "";
    case "integer":
      return 0;
    case "float":
      return 0;
    case "boolean":
      return false;
    case "null":
      return null;
    case "object":
    case "array":
      return null;
    default:
      return "";
  }
};

export const coerceValueForType = (value, type) => {
  if (type === "null") return null;
  if (type === "object" || type === "array") return null;

  if (type === "boolean") {
    if (value === true || value === false) return value;
    if (typeof value === "string") return value.toLowerCase() === "true";
    if (typeof value === "number") return value !== 0;
    return false;
  }

  if (type === "string") {
    if (value === null || typeof value === "undefined") return "";
    return typeof value === "string" ? value : String(value);
  }

  if (type === "integer") {
    if (typeof value === "number" && Number.isFinite(value)) {
      return Math.trunc(value);
    }
    const parsed =
      typeof value === "string" && value.trim() !== ""
        ? parseInt(value, 10)
        : typeof value === "boolean"
        ? (value ? 1 : 0)
        : null;
    return Number.isFinite(parsed) ? parsed : 0;
  }

  if (type === "float") {
    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }
    const parsed =
      typeof value === "string" && value.trim() !== ""
        ? parseFloat(value)
        : typeof value === "boolean"
        ? (value ? 1 : 0)
        : null;
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return value;
};

const makeNode = ({ type, key = null, value = null, children = [] }) => {
  const node = {
    id: uuid(),
    key,
    type,
    value,
    children,
  };
  return node;
};

export const parseJsonToNodeTree = (jsonValue) => {
  // First pass: create all nodes and child links.
  const nodesById = {};
  const visit = (val, { key = null } = {}) => {
    const type = inferNodeTypeFromValue(val);
    if (type === "object") {
      const node = makeNode({ type, key, value: null, children: [] });
      nodesById[node.id] = node;
      const entries = val && typeof val === "object" ? Object.entries(val) : [];
      node.children = entries.map(([childKey, childVal]) => {
        const child = visit(childVal, { key: childKey });
        return child.id;
      });
      return node;
    }
    if (type === "array") {
      const node = makeNode({ type, key, value: null, children: [] });
      nodesById[node.id] = node;
      const arr = Array.isArray(val) ? val : [];
      node.children = arr.map((childVal) => {
        const child = visit(childVal, { key: null });
        return child.id;
      });
      return node;
    }

    const node = makeNode({
      type,
      key,
      value: coerceValueForType(val, type),
      children: [],
    });
    nodesById[node.id] = node;
    return node;
  };

  const root = visit(jsonValue === undefined ? null : jsonValue, { key: null });
  return { rootId: root.id, nodesById };
};

export const serializeNodeTree = (tree) => {
  if (!tree || !tree.rootId || !tree.nodesById) return null;
  const { rootId, nodesById } = tree;

  const serializeNode = (nodeId) => {
    const node = nodesById[nodeId];
    if (!node) return null;
    switch (node.type) {
      case "object": {
        const result = {};
        for (const childId of node.children || []) {
          const child = nodesById[childId];
          const k = child?.key;
          if (k !== null && typeof k !== "undefined") {
            result[k] = serializeNode(childId);
          }
        }
        return result;
      }
      case "array":
        return (node.children || []).map((childId) => serializeNode(childId));
      case "null":
        return null;
      default:
        return node.value;
    }
  };

  return serializeNode(rootId);
};

export const nodeTypeLabel = (type) => {
  switch (type) {
    case "integer":
      return "Integer";
    case "float":
      return "Float";
    case "boolean":
      return "Boolean";
    case "object":
      return "Object";
    case "array":
      return "Array";
    case "null":
      return "null";
    case "string":
    default:
      return "String";
  }
};

export const nodeTypeShortLabel = (type) => {
  switch (type) {
    case "integer":
      return "Int";
    case "float":
      return "Float";
    case "boolean":
      return "Bool";
    case "object":
      return "Obj";
    case "array":
      return "Arr";
    case "null":
      return "null";
    case "string":
    default:
      return "Str";
  }
};

// Strict JSON equality (type-aware, no loose `==` comparisons).
// This is important for distinguishing e.g. `1` vs `"1"` during dirty tracking and raw/visual sync.
export const areJsonValuesEqual = (a, b) => {
  if (a === b) return true;
  if (typeof a !== typeof b) return false;
  if (a === null || b === null) return a === b;

  if (Array.isArray(a)) {
    if (!Array.isArray(b)) return false;
    if (a.length !== b.length) return false;
    return a.every((v, i) => areJsonValuesEqual(v, b[i]));
  }

  if (typeof a === "object") {
    if (typeof b !== "object" || b === null) return false;
    const aKeys = Object.keys(a).sort();
    const bKeys = Object.keys(b).sort();
    if (aKeys.length !== bKeys.length) return false;
    for (let i = 0; i < aKeys.length; i += 1) {
      if (aKeys[i] !== bKeys[i]) return false;
    }
    return aKeys.every((k) => areJsonValuesEqual(a[k], b[k]));
  }

  // Primitive types with same typeof but not strictly equal.
  return false;
};
