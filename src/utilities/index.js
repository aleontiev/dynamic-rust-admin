import { parseISO, add, format, formatISO, formatDistance } from "date-fns";
import api from "../api";

export const getCurrentURL = () => window.location.href;

export const getRatingColor = (rating) => {
  if (!rating) {
    return "grey";
  }
  if (rating === 1) {
    return "red";
  }
  if (rating === 2) {
    return "orange";
  }
  if (rating === 3) {
    return "yellow";
  }
  if (rating === 4) {
    return "blue";
  }
  return "primary";
};

export const parseQueryString = (search) =>
  [...new URLSearchParams(search).entries()].reduce(
    (acc, [key, val]) => ({
      ...acc,
      // eslint-disable-next-line no-nested-ternary
      [key]: Object.prototype.hasOwnProperty.call(acc, key)
        ? Array.isArray(acc[key])
          ? [...acc[key], val]
          : [acc[key], val]
        : val,
    }),
    {}
  );

const isPlainObject = (value) =>
  !!value && typeof value === "object" && !Array.isArray(value);

const decodeURIComponentSafe = (value) => {
  try {
    return decodeURIComponent(value);
  } catch (error) {
    return value;
  }
};

const parseQueryJSONValue = (value) => {
  if (typeof value !== "string") {
    return value;
  }
  const attempts = [value];
  const decoded = decodeURIComponentSafe(value);
  if (decoded !== value) {
    attempts.push(decoded);
  }
  for (const attempt of attempts) {
    try {
      return JSON.parse(attempt);
    } catch (error) {
      // keep trying the next representation
    }
  }
  return value;
};

export const deserializeFilterQuery = (value) => {
  if (!value) {
    return [];
  }
  if (Array.isArray(value)) {
    return deserializeFilterQuery(value[value.length - 1]);
  }
  const parsed = parseQueryJSONValue(value);
  if (Array.isArray(parsed)) {
    return parsed.filter(isPlainObject);
  }
  if (isPlainObject(parsed)) {
    return [parsed];
  }
  return [];
};

export const get = (path, context) => {
  if (!path) {
    return context;
  }
  const parts = path.split(".");
  const next = parts[0];
  return get(parts.slice(1).join("."), context[next]);
};

const getTemplateReplacer = (context) => {
  return (match, g1) => {
    if (!match || !g1) {
      return null;
    }
    return get(g1, context);
  };
};

const TEMPLATE_EXPRESSION = /{{\s*([_a-z][_a-z0-9.]*)\s*}}/i;
export const resolveTemplate = (template, context) => {
  if (typeof template !== "string") {
    // non-string values pass through
    return template;
  }
  return template.replace(TEMPLATE_EXPRESSION, getTemplateReplacer(context));
};

export const toTitleCase = (str) => {
  return str.replace(/\w\S*/g, function (txt) {
    return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
  });
};

export const formatShortNumber = (x) => "";

export const getErrorMessage = (error, shorter) => {
  if (!error) {
    return "Unknown Error";
  }
  if (typeof error === "string") {
    return shorter
      ? error.substr(0, 100) + (error.length > 100 ? "..." : "")
      : error;
  }
  const { response } = error;
  if (
    response &&
    response.status === 404 &&
    ["patch", "put", "delete"].indexOf(response.config?.method) > -1
  ) {
    // if a patch/put/delete returns a 404, it usually means
    // the user does not have access (or rarely: the record was just deleted)
    return "You do not have permission to do that";
  }
  if (Array.isArray(error)) {
    return error.map((e) => getErrorMessage(e, shorter)).join(", ");
  }
  const base = error.error
    ? error.error
    : error.errors
    ? error.errors
    : error || {};
  if (typeof base === "string") {
    return shorter
      ? base.substr(0, 100) + (base.length > 100 ? "..." : "")
      : base;
  }
  if (Array.isArray(base)) {
    return base.map((e) => getErrorMessage(e, shorter)).join(", ");
  }
  if (base.message) {
    return base.message;
  }
  return Object.entries(base)
    .map(([k, v]) => `${toTitleCase(k)}: ${v}`)
    .filter((x, i) => !shorter || i < 1)
    .join(", ");
};

const getLinkHandler = (resource, data) => {
  return () => {
    // navigator.clipboard.writeText(resource.getLink(data));
    openLink(resource, data);
  };
};

export const openLink = (resource, data) => {
  window.open(resource.getLink(data), "_blank");
};

export const buildDelete =
  ({ quasar, dark, resource, record, deleting, then }) =>
  async () => {
    const $resource = resource.value;
    const $record = record.value;
    const $id = $resource.getRecordId($record);
    const $name = $resource.getName($record);
    if (deleting) {
      deleting.value = true;
    }
    let error = null;
    try {
      await $resource.deleteAPI({ id: $id });
    } catch (err) {
      error = err;
    }
    if (deleting) {
      deleting.value = false;
    }
    if (error) {
      handleError(quasar, error);
    } else {
      const $dark = dark ? dark.value : false;
      quasar.notify({
        type: "positive",
        color: $dark ? "grey-3" : "black",
        message: `${$resource.label} "${$name}" deleted`,
        icon: "delete",
        timeout: 1000,
        onDismiss: then ? then : null,
        textColor: $dark ? "black" : "white",
        classes: "full-width q-mr-none q-ml-none",
        actions: [{ icon: "close", color: "white" }],
      });
    }
  };

export const buildAdd =
  ({
    quasar,
    saving,
    resource,
    data,
    record = null,
    field = null,
    then = null,
  }) =>
  async () => {
    if (saving) {
      saving.value = true;
    }

    const $record = record ? record.value : null;
    const $field = field ? field.value : null;
    const $resource = resource.value || resource;
    let $data = data.value;
    const $id = $record ? $record[$resource.id_field] : null;
    let response,
      error = null;
    try {
      response = await $resource.postAPI({
        id: $id,
        field: $field,
        data: $data,
      });
    } catch (err) {
      error = err;
    }
    let $related = $resource,
      $label = $resource.label;
    if ($id && $field) {
      $related = $resource.getRelationFromField($field);
      $label = $related.label;
    }
    if (error) {
      handleError(quasar, error);
    } else {
      const newRecord = response.data[$related.singular] || {};
      const newRecordId = $related.getRecordId(newRecord);
      if (!newRecordId) {
        handleError(quasar, "Unexpected error (saved but no response)");
      } else {
        if ($record && $field) {
          // also update the record
          $resource.cacheAdd({
            ...$record,
            [$field]: Array.isArray($record[$field])
              ? [...$record[$field], newRecordId]
              : newRecordId,
          });
        }
        quasar.notify({
          type: "positive",
          timeout: 5000,
          color: "primary",
          message: `${$label} added`,
          icon: "done",
          textColor: "white",
          noDismiss: false,
          persistent: true,
          classes: "full-width",
          actions: [
            {
              icon: "link",
              color: "white",
              handler: getLinkHandler($related, newRecord),
            },
          ],
        });
        data.value = {};
        if (then) {
          then(newRecord);
        }
      }
    }
    if (saving) {
      saving.value = false;
    }
  };

export const buildSave =
  ({
    changes,
    quasar,
    saving,
    record,
    resource,
    Application = null,
    updateLocal,
    then,
  }) =>
  async () => {
    // save changes to a particular record
    saving.value = true;
    const $record = record.value;
    const $changes = changes.value;
    const $resource = resource.value;
    const $id = $record[$resource.id_field];
    let error = null;
    let response;
    try {
      response = await $resource.patchAPI({
        id: $id,
        changes: $changes,
      });
    } catch (err) {
      error = err;
    }
    if (error) {
      // failed
      handleError(quasar, error);
    } else {
      // succeeded
      if (updateLocal) {
        Object.entries(response.data[$resource.singular]).forEach(
          ([field, value]) => {
            record.value[field] = value;
          }
        );
      }
      quasar.notify({
        type: "positive",
        color: "primary",
        message: "Changes saved",
        icon: "done",
        textColor: "white",
        classes: "full-width",
        actions: [{ icon: "close", color: "white" }],
      });
      if (Application) {
        Application.stopEditing();
      }
      changes.value = {};
    }
    saving.value = false;
    if (then) {
      then(record.value);
    }
  };

export const isEmpty = (x) => {
  return (
    x === null ||
    x === "" ||
    x == undefined ||
    x.length === 0 ||
    (typeof x === "object" && Object.keys(x).length === 0)
  );
};

import { reactive } from "vue";

export class Cache {
  static instances = {};

  constructor(name) {
    this.name = name || "cache";
    Cache.instances[name] = this;
    this.loaded = false;
    this.data = reactive({});
  }
  static getCache(name) {
    let cache = Cache.instances[name];
    if (!cache) {
      cache = Cache.instances[name] = new Cache(name);
    }
    return cache;
  }
  static clearAll({ resetMemory = true } = {}) {
    Object.keys(localStorage)
      .filter((key) => {
        return key.startsWith("cache");
      })
      .forEach((key) => localStorage.removeItem(key));
    if (resetMemory) {
      Object.entries(Cache.instances).forEach(([_, cache]) => cache.clear());
    }
  }
  get(key) {
    if (!this.loaded) {
      this.load();
    }
    if (!key) {
      return this.data;
    }
    return this.data[key];
  }
  delete(id) {
    if (this.data[id]) {
      delete this.data[id];
    }
    this.save();
  }
  add(data, key) {
    if (!data || (Array.isArray(data) && !data.length)) {
      return;
    }
    if (!key) {
      throw new Error("Cache.add: key is required");
    }
    if (Array.isArray(data)) {
      data.forEach((record) => {
        const id = record[key];
        if (id) {
          this.data[id] = {
            ...(this.data[id] || {}),
            ...record,
          };
        }
      });
    } else {
      const id = data[key];
      if (id) {
        this.data[id] = {
          ...(this.data[id] || {}),
          ...data,
        };
      }
    }
    this.save();
  }
  clear() {
    Object.keys(this.data).forEach((key) => {
      delete this.data[key];
    });
    this.data = reactive({});
    this.save();
  }
  load() {
    this.data = reactive(JSON.parse(localStorage.getItem(this.name) || "{}"));
    this.loaded = true;
  }
  save() {
    const serialized = JSON.stringify(this.data);
    try {
      localStorage.setItem(this.name, serialized);
    } catch (exception) {
      try {
        // free space from other cache entries without wiping active in-memory data
        Cache.clearAll({ resetMemory: false });
        localStorage.setItem(this.name, serialized);
      } catch (retryException) {
        console.warn(
          `Cache.save: failed to persist "${this.name}" to localStorage`,
          retryException
        );
      }
    }
  }
}
export const cache = Cache.getCache();

export const isTruthy = (a) => !!a && !isEmpty(a);
export const isEqualish = (a, b) => {
  return (
    a === b ||
    (!Array.isArray(b) && Array.isArray(a) && b && a.includes(b)) ||
    (!Array.isArray(a) && Array.isArray(b) && a && b.includes(a)) ||
    (b === true && isTruthy(a))
  );
};

const OPERATORS = {
  eq: (a, b) => isEqualish(a, b),
  in: (a, b) => b && b.includes(a),
  isnull: (a, b) => !a === !!b,
};
/**
 * Filter choice dropdown options using DREST `choice_parent` / `choice_mapping`
 * metadata. `baseOptions` are `{ value, label }` (value = choice id).
 */
export const filterChoiceOptionsByParent = (field, mergedRecord, baseOptions) => {
  if (
    !field?.choice_parent ||
    !field.choice_mapping ||
    typeof field.choice_mapping !== "object"
  ) {
    return baseOptions;
  }
  const pv = mergedRecord[field.choice_parent];
  if (isEmpty(pv)) {
    return [];
  }
  const allowed = field.choice_mapping[pv];
  if (allowed === undefined) {
    return baseOptions;
  }
  if (!Array.isArray(allowed)) {
    return baseOptions;
  }
  return baseOptions.filter((opt) =>
    allowed.some((a) => a == opt.value)
  );
};

/**
 * When a parent choice changes, return dependent field names whose stored value
 * is no longer allowed (empty parent or not in mapping). Caller should clear
 * those fields (e.g. `null`) and repeat until stable — this function runs the
 * full multi-pass internally.
 */
export const getChoiceCascadeInvalidations = (fields, record, changes) => {
  const merged = { ...record, ...changes };
  const invalidated = [];
  let dirty = true;
  while (dirty) {
    dirty = false;
    for (const f of fields) {
      if (
        !f.choice_mapping ||
        typeof f.choice_mapping !== "object" ||
        !f.choice_parent
      ) {
        continue;
      }
      const pv = merged[f.choice_parent];
      const cv = merged[f.name];
      if (isEmpty(pv)) {
        if (!isEmpty(cv)) {
          merged[f.name] = null;
          invalidated.push(f.name);
          dirty = true;
        }
        continue;
      }
      const allowed = f.choice_mapping[pv];
      if (allowed === undefined) {
        continue;
      }
      const valid = (val) => {
        if (isEmpty(val)) return true;
        if (Array.isArray(val)) {
          return val.every((v) => allowed.some((a) => a == v));
        }
        return allowed.some((a) => a == val);
      };
      if (!valid(cv)) {
        merged[f.name] = null;
        invalidated.push(f.name);
        dirty = true;
      }
    }
  }
  return invalidated;
};

export const evaluate = (condition, context) => {
  let result = true;
  const $condition =
    typeof condition === "object" ? condition : { [condition]: true };
  Object.entries($condition).forEach(([key, value]) => {
    if (!result) {
      return;
    }
    let parts = key.split(".");
    let negate = false;
    if (key[0] === "-") {
      negate = true;
    }
    const last = parts[parts.length - 1];
    let operator = OPERATORS.eq;
    if (OPERATORS[last]) {
      operator = OPERATORS[last];
      parts = parts.slice(0, parts.length - 1);
    }
    let current = context;
    parts.forEach((part) => {
      current = current[part];
    });
    result = operator(current, value);
    if (negate) {
      result = !result;
    }
  });
  return result;
};

export const sameType = (left, right) => {
  if (Array.isArray(left) ^ Array.isArray(right)) {
    return false;
  }
  if ((left === null) ^ (right === null)) {
    return false;
  }
  return typeof left === typeof right;
};
export const isEqual = (left, right, { looseEmptyComparison = true } = {}) => {
  if (
    isEmpty(left) &&
    isEmpty(right) &&
    (looseEmptyComparison || sameType(left, right))
  ) {
    return true;
  }
  if (Array.isArray(left) || Array.isArray(right)) {
    // arrays
    if (!Array.isArray(right) || !Array.isArray(left)) {
      return false;
    }
    return (
      left.length === right.length &&
      left.map((x, i) => isEqual(x, right[i])).every((x) => x)
    );
  }
  if (
    (left !== null && typeof left === "object") ||
    (right !== null && typeof right === "object")
  ) {
    // objects
    if (
      !(right !== null && typeof right === "object") ||
      !(left !== null && typeof left === "object")
    ) {
      return false;
    }
    const leftKeys = Object.keys(left);
    const rightKeys = Object.keys(right);
    return (
      leftKeys.length === rightKeys.length &&
      isEqual(leftKeys.sort(), rightKeys.sort()) &&
      Object.entries(left)
        .map(([k, v]) => isEqual(v, right[k]))
        .every((x) => x)
    );
  }
  if (!left || !right) {
    // strict equality check when one value is empty and the other is not
    // e.g. 0 is not empty and '' is empty
    // but we do not want isEqual(0, '') to be true
    return left === right;
  }
  // loose equality check for non-empty values
  return left == right;
};

export const toAPICase = (x) => x.replaceAll(" ", "_").toLowerCase();
export const makeOptions = (values) => {
  let $values = values;
  if (!Array.isArray($values)) {
    $values = Object.entries($values).map(([key, value]) => ({
      name: key,
      id: key,
      label: value,
      value,
    }));
  }
  return $values.map((value) => ({
    icon: value.icon,
    label: value.label || value,
    value: value.name || value,
    id: value.name || value,
  }));
};

export const first = (x, def) => {
  let $x = x;
  if (typeof x === "object" && x) {
    $x = Object.values(x);
  }
  if (Array.isArray($x)) {
    return $x.length ? $x[0] : def;
  }
  throw new Error(`${x} unexpected argument for "first"`);
};

export const dimension = { value: 3, bar: 3, donut: 2, line: 3 };

const ONE_BILLION = 1000000000.0;
const ONE_MILLION = 1000000.0;
const ONE_THOUSAND = 1000.0;

export const formatInterval = (interval, value) => {
  if (!value) {
    return value;
  }
  if (interval === "year") {
    return value.substr(0, 4);
  }
  if (interval === "quarter") {
    const month = value.substr(5, 2);
    const quarter = Math.floor(month / 3) + 1;
    return value.substr(0, 4) + "-Q" + quarter;
  }
  if (interval === "month") {
    return value.substr(0, 7);
  }
  if (interval === "week") {
    return "W: " + value.substr(0, 10);
  }
  if (interval === "day") {
    return value.substr(0, 10);
  }
  if (interval === "hour") {
    return value.substr(0, 13);
  }
  if (interval === "minute") {
    return value.substr(0, 16);
  }
  return value;
};
export const formatNumber = (number, { round = null } = {}) => {
  let suffix = "";
  let prefix = number < 0 ? "-" : "";
  let base = Math.abs(number);
  if (base >= ONE_BILLION) {
    base = number / ONE_BILLION;
    suffix = "B";
  } else if (base >= ONE_MILLION) {
    base = number / ONE_MILLION;
    suffix = "M";
  } else if (base >= ONE_THOUSAND) {
    base = number / ONE_THOUSAND;
    suffix = "K";
  }
  if (round !== null) {
    base = base.toFixed(round);
    base = base.toString();
    const parts = base.split(".");
    if (parts[parts.length - 1].split("").every((x) => x === "0")) {
      base = parts.slice(0, parts.length - 1).join(".");
    }
  }
  return `${prefix}${base}${suffix}`;
};

export const THIS_TIME_CHOICES = {
  minute: "This Minute",
  hour: "This Hour",
  day: "Today",
  week: "This Week",
  month: "This Month",
  quarter: "This Quarter",
  year: "This Year",
};

export const FUTURE_TIME_CHOICES = {
  day: "Tomorrow",
  week: "Next Week",
  month: "Next Month",
  quarter: "Next Quarter",
  year: "Next Year",
};

export const PAST_TIME_CHOICES = {
  day: "Yesterday",
  week: "Last Week",
  month: "Last Month",
  quarter: "Last Quarter",
  year: "Last Year",
};

export const RELATIVE_TIME_CHOICES = {
  "60seconds": "60 Seconds",
  "2minutes": "2 Minutes",
  "5minutes": "5 Minutes",
  "15minutes": "15 minutes",
  "60minutes": "60 Minutes",
  "2hours": "2 Hours",
  "5hours": "5 Hours",
  "12hours": "12 Hours",
  "24hours": "24 Hours",
  "2days": "2 Days",
  "3days": "3 Days",
  "7days": "7 Days",
  "14days": "14 Days",
  "30days": "30 Days",
  "60days": "60 Days",
  "90days": "90 Days",
  "120days": "120 Days",
  "365days": "365 Days",
  "2years": "2 Years",
  "5years": "5 Years",
};

export const datetimeAs = (date, as) => {
  if (!as || !date) {
    // return date as-is (JS date format or null)
    return date;
  }
  // otherwise, either "date" or "datetime"
  return as === "date" ? format(date, "yyyy-MM-dd") : formatISO(date);
};

export const getDatetimeAddOptions = (interval) => {
  let sign = 1;
  let $interval = interval;
  if ($interval.charAt(0) === "-") {
    sign = -1;
    $interval = $interval.slice(1);
  }
  const options = {};
  // matches "10 days", "1week", etc
  const match = $interval.match(/^\s*(\d+)\s*([a-z]+)\s*$/);
  if (!match) {
    return options;
  }
  options[match[2]] = sign * match[1];
  return options;
};

export const datetimeDelta = (interval, date, as) => {
  const newDate = add(date, getDatetimeAddOptions(interval));
  return datetimeAs(newDate, as);
};

const MILLISECONDS = {
  second: 1000,
  minute: 1000 * 60,
  hour: 1000 * 60 * 60,
};

const m1s = (d) => add(d, { seconds: -1 });
const a1s = (d) => add(d, { seconds: 1 });

export const datetimeNearest = (interval, date, as, fn) => {
  if (typeof date === "string") {
    date = parseISO(date);
  }
  const ms = MILLISECONDS[interval];
  if (ms) {
    const $fn = Math[fn];
    // subtract 1ms for ceil
    const delta = fn === "ceil" ? 1 : 0;
    return datetimeAs(new Date($fn(date.getTime() / ms) * ms - delta), as);
  }
  const year = date.getFullYear();
  const month = date.getMonth();
  const day = date.getDate();
  // subtract 1s for ceil
  if (interval === "day") {
    if (fn === "floor") {
      return datetimeAs(new Date(year, month, day), as);
    } else {
      return datetimeAs(m1s(new Date(year, month, day + 1)), as);
    }
  }
  if (interval === "week") {
    if (fn === "floor") {
      return datetimeAs(new Date(year, month, day - date.getDay() + 1), as);
    } else {
      return datetimeAs(
        m1s(new Date(year, month, day - date.getDay() + 8)),
        as
      );
    }
  }
  if (interval === "month") {
    if (fn === "floor") {
      return datetimeAs(new Date(year, month, 1), as);
    } else {
      return datetimeAs(m1s(new Date(year, month + 1, 1)), as);
    }
  }
  if (interval === "quarter") {
    if (fn === "floor") {
      return datetimeAs(new Date(year, month - (month % 3), 1), as);
    } else {
      return datetimeAs(m1s(new Date(year, month - (month % 3) + 3, 1)), as);
    }
  }
  if (interval === "year") {
    if (fn === "floor") {
      return datetimeAs(new Date(year, 0, 1), as);
    } else {
      return datetimeAs(m1s(new Date(year + 1, 0, 1)), as);
    }
  }
  throw new Error(`Unexpected interval: ${interval}`);
};

export const datetimeFloor = (interval, date, as) =>
  datetimeNearest(interval, date, as, "floor");
export const datetimeCeil = (interval, date, as) =>
  datetimeNearest(interval, date, as, "ceil");

export const getInterval = (interval, date, as) => {
  return [datetimeFloor(interval, date, as), datetimeCeil(interval, date, as)];
};

export const getRange = (range, field, direction) => {
  let $range = range.value || range;
  let result;
  let now = new Date();
  switch ($range) {
    case "minute":
    case "hour":
    case "day":
    case "week":
    case "month":
    case "quarter":
    case "year":
      if (direction === "past") {
        const endOf = m1s(datetimeFloor($range, now));
        result = [
          datetimeFloor($range, endOf, field.type),
          datetimeAs(endOf, field.type),
        ];
      } else if (direction === "future") {
        const startOf = a1s(datetimeCeil($range, now));
        result = [
          datetimeAs(startOf, field.type),
          datetimeCeil($range, startOf, field.type),
        ];
      } else {
        result = [
          datetimeFloor($range, now, field.type),
          datetimeCeil($range, now, field.type),
        ];
      }
      break;
    default:
      if (direction === "next") {
        result = [
          datetimeAs(now, field.type),
          datetimeDelta($range, now, field.type),
        ];
      } else if (direction === "last") {
        result = [
          datetimeDelta(`-${$range}`, now, field.type),
          datetimeAs(now, field.type),
        ];
      }
  }
  return result;
};

export const byId = (items) =>
  items.reduce((acc, item) => {
    acc[item.id] = item;
    return acc;
  }, {});

export const formatDatetime = (datetime, shorter) => {
  const formatString = shorter ? "MMM D" : "MMM D, YYYY";
  return format(datetime, formatString);
};

export const handleError = (quasar, error, { prefix, shorter } = {}) => {
  let errorMessage = getErrorMessage(error, shorter);
  if (errorMessage === "canceled") {
    return;
  }
  if (prefix) {
    errorMessage = `${prefix}: ${errorMessage}`;
  }
  let $shorter =
    shorter || (errorMessage.length < 100 && errorMessage.indexOf("\n") === -1);
  quasar.notify({
    type: "negative",
    timeout: 0,
    color: "red-5",
    icon: "error",
    message: errorMessage,
    multiLine: !$shorter,
    position: $shorter ? null : "center",
    textColor: "white",
    classes: "full-width",
    noDismiss: true,
    persistent: true,
    actions: [{ icon: "close", color: "white" }],
  });
};

export const getExtraRelatedFilters = (resource, field, record, changes) => {
  if (!field || !record) {
    return [];
  }
  let filter = field.filter;
  if (!filter) {
    return [];
  }
  if (typeof filter === "string") {
    filter = parseQueryString(filter);
  }
  if (typeof filter !== "object") {
    return [];
  }
  const liveRecord = { ...record, ...(changes || {}) };
  const result = [];
  Object.entries(filter).forEach(([key, value]) => {
    let newKey = resolveTemplate(key, liveRecord);
    const newValue = resolveTemplate(value, liveRecord);
    if (!newKey) {
      // if key does not resolve, ignore
      return;
    }
    if (newKey.indexOf("$") === -1 && resource.fields[newKey.split(".")[0]]) {
      newKey = `${newKey}.$eq`;
    }
    result.push({ [newKey]: newValue });
  });
  return result;
};

export const findRelated = async (
  resource,
  fieldName,
  input,
  record,
  changes
) => {
  const related = resource.getRelationFromField(fieldName);
  const relatedField = resource.getField(fieldName);
  return await findResource(related, input, relatedField, record, changes);
};

export const findResource = async (resource, input, field, record, changes) => {
  let filters = input;
  if (field) {
    const extraFilters = getExtraRelatedFilters(
      resource,
      field,
      record,
      changes
    );
    if (extraFilters) {
      if (resource.search_key) {
        filters = [{ [resource.search_key]: input }];
      } else {
        const inputKey = `${resource.name_field}.$icontains`;
        filters = [{ [inputKey]: input }];
      }
      filters.push(...getExtraRelatedFilters(resource, field, record, changes));
    }
  }
  const response = await api.get(`${resource.name}`, {
    params: {
      ...resource.getAPIFilters(filters),
      exclude: ["*"],
      include: [resource.name_field, resource.id_field],
      per_page: 50,
    },
  });
  resource.constructor.cacheResponse(response);
  const data = response.data[resource.name];
  return data.map((record) => ({
    value: record[resource.id_field],
    label: record[resource.name_field],
  }));
};

export const uuid = () => {
  return ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, (c) =>
    (
      c ^
      (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (c / 4)))
    ).toString(16)
  );
};

export const timeId = () => {
  const result = new Date().getTime();
  return `${result}`;
};

export const representsInterval = (interval, value) => {
  if (!value) {
    return false;
  }
  try {
    const parsed = typeof value === "string" ? parseISO(value) : value;
    if (isNaN(parsed.getTime())) return false;
    const isDateOnly = typeof value === "string" && value.match(/^\d{4}-\d{2}-\d{2}$/);
    const dateFloor = datetimeFloor(
      interval,
      value,
      isDateOnly ? "date" : "datetime"
    );
    return value === dateFloor;
  } catch (e) {
    return false;
  }
};

export const getDatetimeBucket = (values) => {
  let result = null;
  ["year", "quarter", "month", "week", "day", "hour", "minute"].forEach(
    (interval) => {
      if (result !== null) {
        return result;
      }
      if (values.every((val) => !val || representsInterval(interval, val))) {
        result = interval;
      }
    }
  );
  return result;
};

export const isUuid = (str) =>
  typeof str === "string" &&
  /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(str);

export const isURL = (str) =>
  typeof str === "string" &&
  /^(?:\w+:)?\/\/([^\s\.]+\.\S{2}|localhost[\:?\d]*)\S*$/.test(str);

export const buildAction =
  ({
    quasar,
    saving,
    resource,
    data,
    record = null,
    field = null,
    then = null,
    action,
  }) =>
  async () => {
    if (saving) {
      saving.value = true;
    }

    const $record = record ? record.value : null;
    const $field = field ? field.value : null;
    const $resource = resource.value || resource;
    let $data = data.value;
    let $action = action.value.name;
    const $id = $record ? $record[$resource.id_field] : null;
    let response,
      error = null;
    try {
      response = await $resource.actionAPI({
        id: $id,
        field: $field,
        data: $data,
        action: $action,
      });
    } catch (err) {
      error = err;
    }
    if (error) {
      // failed
      handleError(quasar, error);
    } else {
      // succeeded
      let message = `Action "${$action}" completed`;
      if (typeof response.data !== "string") {
        if (response.data.message && Object.keys(response.data).length === 1) {
          // extract message from response data
          message = response.data.message;
        } else {
          // update self/store properties
          Object.entries(response.data[$resource.singular] || {}).forEach(
            ([field, value]) => {
              record.value[field] = value;
            }
          );
        }
      }
      // show response
      quasar.notify({
        type: "positive",
        color: "primary",
        timeout: 0,
        message,
        html: true,
        icon: "done",
        textColor: "white",
        classes: "full-width",
        actions: [{ icon: "close", color: "white" }],
      });
    }
    saving.value = false;
    if (then) {
      then();
    }
  };

export const getRelativeTimeLabel = (
  value,
  { dense = true, addSuffix = false } = {}
) => {
  let label = value;
  if (label) {
    try {
      label = formatDistance(parseISO(label), new Date(), {
        addSuffix: addSuffix,
      });
    } catch(error) {
      return null;
    }
    label = label.replace("about", "").replace("almost", "").trim();
    let over = false;
    if (label.substr(0, 4) === "over") {
      over = true;
    }
    if (dense) {
      // further shorten
      // from 10 days -> 10d
      if (over) {
        label = label.split(" ");
        label = `>${label[1]} ${label[2]}`;
      }
      label = label.split(" ");
      let unit = label[1].replace(">", "");
      if (unit === "minute" || unit === "minutes") {
        unit = "mi";
      } else {
        unit = unit.substr(0, 1);
      }
      label = `${label[0]}${unit}`;
    }
  }
  return label;
};

export const stripHTML = (value) => {
  let text = "";
  const parser = new DOMParser();
  const dom = parser.parseFromString(value, "text/html");
  let div = dom.querySelector("body>*");
  if (div) {
    text = div.textContent || div.innerText || "";
  }
  return text;
};

export const firstLine = (value, ellipsis = true) => {
  const parts = value.split(/<br\s*\/?>|\n/);
  return ellipsis && parts.length > 1 ? `${parts[0]} ...` : parts[0];
};

export const slackToHTML = (value) => {
  // look for <http.*|.*> and convert into <a href=$1>$2</a>
  let result = value.replaceAll(
    /<(http[^|>]+)\|([^>]+)>/gi,
    `<a href="$1">$2</a>`
  );
  // look for :emoji: and replace with unicode
  result = result.replaceAll(/:([a-z_-]+):/gi, (match) => {
    return slackEmojiToUnicode(match.replaceAll(":", ""));
  });
  // look for <@UID> and replace with user reference
  return result;
};

export const slackEmojiToUnicode = (value) => {
  if (!value) {
    return "";
  }
  return (
    {
      ticket: "🎫",
      x: "❌",
      heavy_check_mark: "✔",
      check_mark: "✅",
      white_check_mark: "✅",
      bell: "🔔",
      no_bell: "🔕",
    }[value.replaceAll("-", "_")] || `:${value}:`
  );
};

export const isoNow = () => {
  return formatISO(new Date());
};

export const getMetafieldValue = (field, metafield) => {
  const translate = (value) => {
    if (value === true) {
      return "Yes";
    }
    if (value === false) {
      return "No";
    }
    return value;
  };
  const source = metafield.source;
  if (typeof source === "string") {
    return translate(field[source]);
  }
  return translate(source(field));
};

export const all = async (args) => {
  if (Array.isArray(all)) {
    return await Promise.all(args);
  }
  if (typeof args === "object") {
    const names = Object.keys(args);
    const promises = names.map((key) => args[key]);
    const results = await Promise.all(promises);
    return results
      .map((r, i) => [i, r])
      .reduce((acc, item) => {
        acc[names[item[0]]] = item[1];
        return acc;
      }, {});
  }
  throw new Error(`no supported for ${args}`);
};


// Extract JSON field keys from sample data
export const extractJSONKeys = (data, fieldName) => {
  if (!data || !fieldName) return [];

  const keys = new Set();

  // Handle different data formats
  const records = Array.isArray(data) ? data : Object.values(data);

  records.forEach((record) => {
    if (record && typeof record === "object" && record[fieldName]) {
      const value = record[fieldName];
      if (value && typeof value === "object" && !Array.isArray(value)) {
        Object.keys(value).forEach((key) => keys.add(key));
      }
    }
  });

  return Array.from(keys).sort();
};
