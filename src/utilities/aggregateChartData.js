/**
 * Parse a function expression like "sum(amount)" into { fn, field }.
 * If no function wrapper, returns { fn: null, field: expr }.
 */
function parseExpr(expr) {
  if (!expr) return { fn: null, field: null };
  const match = expr.match(/^(\w+)\((.+)\)$/);
  if (match) {
    return { fn: match[1].toLowerCase(), field: match[2].trim() };
  }
  return { fn: null, field: expr.trim() };
}

const AGG_FUNCTIONS = {
  sum: (values) => values.reduce((a, b) => a + (parseFloat(b) || 0), 0),
  count: (values) => values.filter((v) => v !== null && v !== undefined).length,
  average: (values) => {
    const nums = values.filter((v) => v !== null && v !== undefined);
    if (!nums.length) return 0;
    return nums.reduce((a, b) => a + (parseFloat(b) || 0), 0) / nums.length;
  },
  avg: (values) => AGG_FUNCTIONS.average(values),
  max: (values) => {
    const nums = values
      .map((v) => parseFloat(v))
      .filter((v) => !isNaN(v));
    return nums.length ? Math.max(...nums) : 0;
  },
  min: (values) => {
    const nums = values
      .map((v) => parseFloat(v))
      .filter((v) => !isNaN(v));
    return nums.length ? Math.min(...nums) : 0;
  },
  distinct: (values) => new Set(values.filter((v) => v !== null && v !== undefined)).size,
};

/**
 * Get the bucket key for a record given a bucketing expression.
 * Supports: sequence(field), month(field), year(field), week(field), day(field),
 * or bare field name (use value directly).
 */
function getBucketKey(expr, record) {
  const { fn, field } = parseExpr(expr);
  const value = record[field];

  if (!fn || fn === "auto") {
    return value != null ? String(value) : "null";
  }
  if (fn === "sequence") {
    // Return raw value — each record is its own bucket
    return value;
  }
  // Date bucketing
  if (!value) return "null";
  const date = new Date(value);
  if (isNaN(date.getTime())) return String(value);

  const pad = (n) => String(n).padStart(2, "0");
  const y = date.getFullYear();
  const m = pad(date.getMonth() + 1);
  const d = pad(date.getDate());

  switch (fn) {
    case "year":
      return `${y}`;
    case "month":
      return `${y}-${m}`;
    case "week": {
      // ISO week: use Monday of the week
      const day = date.getDay() || 7;
      const monday = new Date(date);
      monday.setDate(date.getDate() - day + 1);
      return `${monday.getFullYear()}-${pad(monday.getMonth() + 1)}-${pad(monday.getDate())}`;
    }
    case "day":
      return `${y}-${m}-${d}`;
    default:
      return String(value);
  }
}

function aggregate(records, combineExpr) {
  const values = records.map((r) => r[combineExpr.field]);
  const fn = AGG_FUNCTIONS[combineExpr.fn] || AGG_FUNCTIONS.sum;
  return fn(values);
}

function groupBy(records, expr) {
  const groups = {};
  records.forEach((record) => {
    const key = getBucketKey(expr, record);
    if (!groups[key]) groups[key] = [];
    groups[key].push(record);
  });
  return groups;
}

function sortBucketKeys(keys) {
  return [...keys].sort((a, b) => {
    // Try numeric/date sort first
    const da = new Date(a);
    const db = new Date(b);
    if (!isNaN(da.getTime()) && !isNaN(db.getTime())) {
      return da - db;
    }
    const na = parseFloat(a);
    const nb = parseFloat(b);
    if (!isNaN(na) && !isNaN(nb)) {
      return na - nb;
    }
    return String(a).localeCompare(String(b));
  });
}

/**
 * For sequence mode, returns records sorted in the same order as chart data points.
 * This allows looking up the original record by datapoint index.
 */
export function getSequenceRecords(records, chartConfig) {
  const { over, by } = chartConfig;
  if (!over) return [];
  const overExpr = parseExpr(over);
  if (overExpr.fn !== "sequence") return [];
  const field = overExpr.field;
  const sorted = [...records].sort((a, b) => {
    const va = a[field], vb = b[field];
    if (va == null) return 1;
    if (vb == null) return -1;
    return va < vb ? -1 : va > vb ? 1 : 0;
  });
  if (!by) return sorted;
  // With by: records are grouped by "by" field, then sorted within each group
  // DataChart renders series per by-group, each bar index maps within a group
  // Return a map: { groupKey: [records...] }
  const groups = {};
  sorted.forEach((record) => {
    const key = record[by] != null ? String(record[by]) : "null";
    if (!groups[key]) groups[key] = [];
    groups[key].push(record);
  });
  return groups;
}

/**
 * Aggregate raw records into chart data format compatible with DataChart.
 *
 * @param {Array<Object>} records - Raw record objects from the relationship
 * @param {Object} chartConfig - { type, stacked, combine, over, by }
 * @returns {Object} Data shaped for DataChart component
 */
export function aggregateChartData(records, chartConfig) {
  const { combine, over, by, type } = chartConfig;
  if (!combine || !records.length) return {};

  const combineExpr = parseExpr(combine);
  const isSequence = over && parseExpr(over).fn === "sequence";

  // Case 1: combine only — single value
  if (!over && !by) {
    return { [combine]: aggregate(records, combineExpr) };
  }

  // Case 2: combine + over (no by)
  if (over && !by) {
    if (isSequence) {
      const field = parseExpr(over).field;
      const sorted = [...records].sort((a, b) => {
        const va = a[field], vb = b[field];
        if (va == null) return 1;
        if (vb == null) return -1;
        return va < vb ? -1 : va > vb ? 1 : 0;
      });
      const pairs = sorted.map((r) => [
        r[field] != null ? String(r[field]) : "null",
        aggregate([r], combineExpr),
      ]);
      return { [combine]: pairs };
    }
    const groups = groupBy(records, over);
    const keys = sortBucketKeys(Object.keys(groups));
    const pairs = keys.map((k) => [k, aggregate(groups[k], combineExpr)]);
    return { [combine]: pairs };
  }

  // Case 3: combine + by (no over)
  if (!over && by) {
    const groups = groupBy(records, by);
    if (type === "donut") {
      // Donut: flat { "CategoryA": value, "CategoryB": value }
      const result = {};
      Object.entries(groups).forEach(([k, recs]) => {
        result[k] = aggregate(recs, combineExpr);
      });
      return result;
    }
    // Bar/other: { "CategoryA": {"sum(amount)": value}, ... }
    const result = {};
    Object.entries(groups).forEach(([k, recs]) => {
      result[k] = { [combine]: aggregate(recs, combineExpr) };
    });
    return result;
  }

  // Case 4: combine + over + by
  if (over && by) {
    const byGroups = groupBy(records, by);
    const result = {};
    Object.entries(byGroups).forEach(([byKey, byRecs]) => {
      if (isSequence) {
        const field = parseExpr(over).field;
        const sorted = [...byRecs].sort((a, b) => {
          const va = a[field], vb = b[field];
          if (va == null) return 1;
          if (vb == null) return -1;
          return va < vb ? -1 : va > vb ? 1 : 0;
        });
        const pairs = sorted.map((r) => [
          r[field] != null ? String(r[field]) : "null",
          aggregate([r], combineExpr),
        ]);
        result[byKey] = { [combine]: pairs };
      } else {
        const overGroups = groupBy(byRecs, over);
        const keys = sortBucketKeys(Object.keys(overGroups));
        const pairs = keys.map((k) => [k, aggregate(overGroups[k], combineExpr)]);
        result[byKey] = { [combine]: pairs };
      }
    });
    return result;
  }

  return {};
}
