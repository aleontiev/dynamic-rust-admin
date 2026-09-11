import { Model } from "@vuex-orm/core";

import { formatDistance, parseISO } from "date-fns";
import {
  PAST_TIME_CHOICES,
  FUTURE_TIME_CHOICES,
  THIS_TIME_CHOICES,
  RELATIVE_TIME_CHOICES,
  dimension,
  getRange,
  makeOptions,
  evaluate,
  Cache,
  isEmpty,
  toTitleCase,
  extractJSONKeys,
} from "../utilities";
import YAML from "json-to-pretty-yaml";
import api from "../api";
import { API_URL } from "../config";
import { uploadFile } from "../api/aws";

const YAMLIFY = false;
const isPlainObject = (value) =>
  !!value && typeof value === "object" && !Array.isArray(value);

const singularizeLabel = (label) => {
  const parts = label.split(" ");
  const last = parts.length - 1;
  if (last < 0) {
    return label;
  }
  if (parts[last].endsWith("ies")) {
    parts[last] = `${parts[last].slice(0, -3)}y`;
  } else if (parts[last].endsWith("s") && !parts[last].endsWith("ss")) {
    parts[last] = parts[last].slice(0, -1);
  }
  return parts.join(" ");
};

const pluralizeLabel = (label) => {
  const parts = label.split(" ");
  const last = parts.length - 1;
  if (last >= 0 && !parts[last].endsWith("s")) {
    if (/[^aeiou]y$/i.test(parts[last])) {
      parts[last] = `${parts[last].slice(0, -1)}ies`;
    } else if (/(x|z|ch|sh)$/i.test(parts[last])) {
      parts[last] = `${parts[last]}es`;
    } else {
      parts[last] = `${parts[last]}s`;
    }
  }
  return parts.join(" ");
};

const columnCreator = (resource) => (k) => {
  const metadata = resource.fields[k] || resource.getPathField(k);
  return {
    name: k,
    field: metadata.dynamic ? (row) => resource.getValue(row, k) : k,
    label: metadata.label ? metadata.label.replace("_", " ") : k,
    sortable: resource.name.substr(0, 1) === "_" ? metadata.sortable : false,
    visible: k !== resource.id_field,
    description: metadata.description,
    align: "left",
    hidden: metadata.hidden || false,
    default: metadata.default,
    null: metadata.null,
    filter: metadata.filter,
    choices: metadata.choices,
    format: resource.getDisplayFormatter(k, true),
    type: metadata.type,
    item_type: metadata.item_type,
    depends: metadata.depends,
    choice_parent: metadata.choice_parent,
    choice_mapping: metadata.choice_mapping,
    location: metadata.location,
    hide: metadata.hide,
    ui: metadata.ui,
    deferred: metadata.deferred,
    icon: resource.getFieldIcon(k),
    related: metadata.related,
    reference: metadata.reference,
    resource_field: metadata.resource_field,
    extra: metadata.extra,
    dynamic: metadata.dynamic,
    resource,
  };
};

const _addColors = (resource, colors) => {
  if (resource.style && typeof resource.style === "object") {
    Object.entries(resource.style).forEach(([_, styles]) => {
      if (styles && typeof styles === "object") {
        Object.entries(styles).forEach(([key, style]) => {
          colors[key.toLowerCase()] = style;
        });
      }
    });
  }
};
const translateChangesToAPI = (x) => {
  // turn [{"id": 1}, {"name": "A"}] -> {"id": 1, "name": "A"}
  if (Array.isArray(x)) {
    return x.reduce((acc, item) => {
      const key = Object.keys(item)[0];
      const value = item[key];
      acc[key] = value;
      return acc;
    }, {});
  }
  return x;
};
const translateFilterConditionToAPI = (
  resource,
  condition,
  operators,
  context
) => {
  const keys = Object.keys(condition);
  const invalid = [null, null, false];
  if (!keys.length) {
    return invalid;
  }
  let key = keys[0];
  let raw = false;
  const keyParts = key.split(".");
  let operatorName = keyParts[keyParts.length - 1];
  let reflexive = false;
  if (operatorName && operatorName.substr(operatorName.length - 1) === "*") {
    operatorName = operatorName.substr(0, operatorName.length - 1);
    reflexive = true;
  }
  const operator = operators[operatorName];
  if (!operator) {
    raw = true;
  }
  const api = operator ? operator.api || {} : {};
  let value = typeof api.value === "undefined" ? condition[key] : api.value;
  if (typeof value === "function") {
    value = value({
      ...context,
      ...resource.getField(keyParts.slice(0, keyParts.length - 1).join("."), {
        withResource: true,
      }),
      value: condition[key],
    });
  }
  if (!raw) {
    const apiKey = api.key || operatorName.replace("$", "");

    // Handle JSON operators
    if (api.json) {
      // For JSON operators, we need to handle the field path differently
      const fieldPath = keyParts.slice(0, -1).join(".");

      // Special handling for JSON path equals operator
      if (
        apiKey === "path_eq" &&
        condition[key] &&
        typeof condition[key] === "object"
      ) {
        const jsonPath = condition[key].path || "";
        key = `${fieldPath}.${jsonPath}`;
        return [key, value, true];
      } else {
        // Handle negative JSON operators
        if (api.negative) {
          key = `-${fieldPath}__${apiKey}`;
        } else {
          key = `${fieldPath}__${apiKey}`;
        }
      }
    } else {
      // Original logic for non-JSON operators
      if (apiKey === "eq") {
        keyParts.pop();
      } else {
        keyParts[keyParts.length - 1] = apiKey;
      }
      key = keyParts.join(".");
      if (api.negative) {
        key = `-${key}`;
      }
    }
  }

  if (reflexive) {
    key = `${key}*`;
  }

  if (Array.isArray(value)) {
    value = value.map((x) => (x.label && x.value ? x.value : x));
  } else if (value) {
    value = value.label && value.value ? value.value : value;
  }

  return [key, value, raw];
};

class Resource extends Model {
  static entity = "_resources";
  static primaryKey = "name";
  static fields() {
    return {
      name: this.string(),
      singular: this.string(),
      id_field: this.string(),
      name_field: this.string(),
      description: this.string().nullable(),
      label: this.string().nullable(),
      icon: this.string().nullable(),
      section: this.string().nullable(),
      style: this.attr(),
      features: this.attr(),
      fields: this.attr(),
      permissions: this.attr(),
      sections: this.attr(),
      actions: this.attr(),
      search_key: this.attr(),
    };
  }
  get title() {
    return toTitleCase(this.name).replace("_", " ");
  }
  get singularTitle() {
    return toTitleCase(this.singular).replace("_", " ");
  }
  getFeature(name, defaultValue = null) {
    if (
      this.features &&
      Object.prototype.hasOwnProperty.call(this.features, name)
    ) {
      return this.features[name];
    }
    return defaultValue;
  }
  getListEndpoint() {
    return this.getFeature("list_endpoint", this.name);
  }
  getOptionsEndpoint() {
    return this.getFeature("options_endpoint", this.getListEndpoint());
  }
  getResponseKey() {
    return this.getFeature("response_key", this.name);
  }
  getClientRecordIdField() {
    return this.getFeature("client_id_field", this.id_field);
  }
  getAPIIdField() {
    return this.getFeature("api_id_field", this.id_field);
  }
  canCache() {
    return this.getFeature("cache", true);
  }
  canDetail() {
    return this.getFeature("detail", true);
  }
  normalizeListRecords(records, { page = 1 } = {}) {
    const clientIdField = this.getClientRecordIdField();
    if (
      !Array.isArray(records) ||
      !clientIdField ||
      clientIdField === this.id_field
    ) {
      return records;
    }
    return records.map((record, index) => {
      if (!isPlainObject(record)) {
        return record;
      }
      return {
        ...record,
        [clientIdField]:
          typeof record[clientIdField] !== "undefined"
            ? record[clientIdField]
            : `${page}-${index}`,
      };
    });
  }
  normalizeAPIResponse(response, { id, combine, page } = {}) {
    if (!response || !response.data) {
      return response;
    }
    const responseKey = this.getResponseKey();
    if (combine) {
      if (Array.isArray(response.data)) {
        response.data = { data: response.data };
        return response;
      }
      if (
        isPlainObject(response.data) &&
        responseKey &&
        !Array.isArray(response.data.data) &&
        Array.isArray(response.data[responseKey])
      ) {
        response.data = {
          ...response.data,
          data: response.data[responseKey],
        };
      }
      return response;
    }
    if (typeof id !== "undefined") {
      return response;
    }
    if (Array.isArray(response.data)) {
      const rows = this.normalizeListRecords(response.data, { page });
      response.data = {
        [this.name]: rows,
        meta: {
          page: page || 1,
          total_results: rows.length,
          total_pages: 1,
        },
      };
      return response;
    }
    if (isPlainObject(response.data)) {
      let rows = null;
      if (Array.isArray(response.data[this.name])) {
        rows = response.data[this.name];
      } else if (responseKey && Array.isArray(response.data[responseKey])) {
        rows = response.data[responseKey];
      }
      if (rows) {
        rows = this.normalizeListRecords(rows, { page });
        response.data = {
          ...response.data,
          [this.name]: rows,
        };
      }
    }
    return response;
  }
  getVisibleFieldNames(filters = {}) {
    return this.getFields(filters)
      .filter((c) => c.visible)
      .map((c) => c.name);
  }
  getActions(record) {
    const id = this.getRecordId(record);
    return this.actions
      .filter((action) => {
        return !action.when || evaluate(action.when, { instance: record });
      })
      .map((action) => {
        return {
          ...action,
          url: action.url.replace(":id", id),
        };
      });
  }
  getFieldSection(name) {
    const sections = this.sections.filter((s) => s.name === name);
    if (sections.length === 1) {
      return sections[0];
    }
    throw Error(`Resource ${this.name} has no section called "${name}"`);
  }
  async postAPI({ id, field, data, signal = null }) {
    const endpoint =
      id && field ? `${this.name}/${id}/${field}` : `${this.name}`;
    const uploadPromises = [];
    const updatedData = { ...data };
    const keys = [];
    for (const key in data) {
      keys.push(key);
      if (
        (!field && this.fields[key]?.location) ||
        (field &&
          this.getRelation(this.fields[field].related).fields[key]?.location &&
          data[key])
      ) {
        const location =
          this.fields[key] !== undefined
            ? this.fields[key].location
            : this.getRelation(this.fields[field].related).fields[key].location;
        const uploadPromise = uploadFile(
          data[key],
          data[key]?.name || data.name,
          location,
          signal
        );
        uploadPromises.push(
          uploadPromise.then((result) => {
            updatedData[key] = result.Key.replace(location + "/", "");
          })
        );
      }
    }
    await Promise.all(uploadPromises);

    const response = await api.post(endpoint, {
      data: updatedData,
      params: {
        ...this.getAPIFields({
          view: "detail",
          include: keys,
        }),
      },
      signal,
    });
    Resource.cacheResponse(response);
    return response;
  }
  async actionAPI({ id, data, action, signal = null }) {
    const endpoint = id ? `${this.name}/${id}/${action}` : ``;
    const response = await api.post(endpoint, {
      data,
      signal,
    });
    Resource.cacheResponse(response);
    return response;
  }
  async deleteAPI({ id, signal = null }) {
    const endpoint = `${this.name}/${id}`;
    const response = await api.delete(endpoint, {
      signal,
    });
    this.cacheDelete(id);
    return response;
  }
  async patchAPI({
    id,
    changes,
    view,
    deferred = false,
    relations = true,
    signal = null,
  }) {
    const endpoint = `${this.name}/${id}`;
    const data = translateChangesToAPI(changes);
    const uploadPromises = [];
    const updatedData = { ...data };

    const keys = [];
    for (const key in data) {
      keys.push(key);
      if (this.fields[key]?.location) {
        if (data[key]) {
          const uploadPromise = uploadFile(
            data[key],
            data[key]?.name || data.name,
            this.fields[key].location,
            signal
          );
          uploadPromises.push(
            uploadPromise.then((result) => {
              updatedData[key] = result.Key.replace(
                this.fields[key].location + "/",
                ""
              );
            })
          );
        }
      }
    }
    await Promise.all(uploadPromises);

    const response = await api.patch(endpoint, {
      data: updatedData,
      params: {
        ...this.getAPIFields({
          view: view || "detail",
          include: keys,
          relations,
          deferred,
        }),
      },
      signal,
    });
    Resource.cacheResponse(response);
    return response;
  }
  async getAPI({
    id,
    page,
    perPage,
    sort,
    include,
    filter,
    combine,
    deferred = null,
    manyRelations = true,
    signal = null,
    other = {},
  }) {
    const view = typeof id === "undefined" ? "list" : "detail";
    const baseEndpoint = this.getListEndpoint();
    const endpoint =
      typeof id === "undefined" ? baseEndpoint : `${baseEndpoint}/${id}`;

    const excludeCount = this.features?.exclude_count ? { exclude_count: 1 } : {};
    const params = {
      ...(combine
        ? {}
        : this.getAPIFields({ view, include, deferred, manyRelations })),
      ...this.getAPIFilters(filter),
      ...this.getAPICombines(combine),
      ...this.getAPISorts(sort),
      ...excludeCount,
      ...other,
      exclude_links: 1,
    };
    if (view === "list" && !combine) {
      params.page = page || 1;
      params.per_page = perPage || 50;
    }
    const response = this.normalizeAPIResponse(
      await api.get(endpoint, { params, signal }),
      { id, combine, page: params.page }
    );
    if (!combine) {
      Resource.cacheResponse(response);
    }
    return response;
  }
  async getRelatedAPI({
    id,
    field,
    page,
    perPage,
    sort,
    include,
    filter,
    combine,
    signal = null,
    other = {},
  }) {
    const related = this.getRelationFromField(field);
    const endpoint = `${this.name}/${id}/${field}`;
    let includeMap = include || {};
    if (typeof includeMap === "string") {
      includeMap = [includeMap];
    }
    if (Array.isArray(includeMap)) {
      includeMap = Object.fromEntries(includeMap.map((name) => [name, true]));
    }
    Object.entries(related.fields).forEach(([name, relatedField]) => {
      if (relatedField.related === this.name) {
        includeMap[name] = false;
      }
    });
    const params = {
      ...(combine
        ? {}
        : related.getAPIFields({ view: "list", include: includeMap })),
      ...related.getAPIFilters(filter),
      ...related.getAPICombines(combine),
      ...related.getAPISorts(sort),
      ...other,
      exclude_links: 1,
    };
    if (!combine) {
      params.page = page || 1;
      params.per_page = perPage || 100;
    }
    const response = await api.get(endpoint, { params, signal });
    Resource.cacheResponse(response);
    return response;
  }
  static getFieldById(fieldId) {
    const parts = fieldId.split(".");
    if (parts.length !== 2) {
      throw new Error(
        `invalid field ID "${fieldId}", should be in resource.field format`
      );
    }
    const resource = this.find(parts[0]);
    if (!resource) {
      throw new Error(
        `invalid field ID "${fieldId}", no resource "${parts[0]}"`
      );
    }
    const field = resource.getField(parts[1]);
    if (!field) {
      throw new Error(`invalid field ID "${fieldId} no field "${parts[1]}"`);
    }
    return field;
  }
  static getColorMap(resource) {
    if (resource) {
      // for a specific resource
      const colors = {};
      _addColors(resource, colors);
      return colors;
    } else {
      // default with no resource, return generic map
      if (!this._colorMap) {
        const colors = {};
        Resource.all().forEach((resource) => _addColors(resource, colors));
        this._colorMap = colors;
      }
      return this._colorMap;
    }
  }

  static cacheResponse(response) {
    Object.entries(response.data).forEach(([key, data]) => {
      if (!Array.isArray(data) && typeof data !== "object") {
        // only array/object type responses should be considered
        return;
      }
      const match = key.replace("+", "");
      const resources = this.query()
        .where((x) => x.name === match || x.singular === match)
        .get();
      if (resources && resources.length) {
        const resource = resources[0];
        resource.cacheAdd(data);
      }
    });
  }
  cacheAdd(data) {
    if (!this.canCache()) {
      return;
    }
    this.cache.add(data, this.getClientRecordIdField() || "id"); // this.updateCache(data));
  }
  cacheDelete(id) {
    if (!this.canCache()) {
      return;
    }
    this.cache.delete(id);
  }
  canList() {
    if (!this.permissions) {
      // no permissions at all
      return true;
    }
    return this.permissions.list;
  }
  canDelete() {
    if (!this.permissions) {
      // no permissions at all
      return true;
    }
    return this.permissions.delete;
  }
  canCreate(field) {
    const pathField = field ? this.getPathField(field) : null;
    if (pathField && pathField.dynamic) {
      return false;
    }
    if (!this.permissions) {
      // no permissions at all
      return true;
    }
    if (!field) {
      return this.permissions.create;
    }
    const permissions = this.permissions.fields[field];
    if (!permissions || !permissions.create) {
      return false;
    }
    return true;
  }
  canWriteCreate(field, record) {
    return this.canWrite(field, record, "create");
  }
  canRead(field) {
    if (!this.permissions) {
      // no permissions at all
      return true;
    }
    const pathField = this.getPathField(field);
    if (pathField && pathField.dynamic) {
      return pathField.resource.canRead(pathField.field_name);
    }
    const permissions = this.permissions.fields[field];
    if (!permissions || !permissions.read) {
      return false;
    }
    return true;
  }
  canWrite(field, _, mode) {
    const pathField = field ? this.getPathField(field) : null;
    if (pathField && (pathField.dynamic || pathField.ui === "read")) {
      return false;
    }
    if (!this.permissions) {
      // no permissions at all
      return true;
    }
    if (!field) {
      return this.permissions.update;
    }
    const permissions = this.permissions.fields[field];
    if (!permissions || !permissions.write) {
      return false;
    }
    if (mode === "create") {
      if (typeof permissions.write.create !== "undefined") {
        return permissions.write.create;
      }
    } else {
      if (typeof permissions.write.update !== "undefined") {
        return permissions.write.update;
      }
    }
    return true;
  }
  get cache() {
    if (!this._cache) {
      this._cache = this.getCache();
    }
    return this._cache;
  }
  getCache() {
    return Cache.getCache(`cache.${this.name}`);
  }
  getField(path, { withResource = false } = {}) {
    if (!path) {
      return null;
    }

    let resource = this;
    let field = null;
    const parts = path.split(".");
    const length = parts.length;
    parts.forEach((part, index) => {
      if (!resource) {
        return;
      }
      field = resource.fields[part];
      if (!field) {
        resource = null;
        field = null;
        return;
      }
      if (index < length - 1) {
        resource = resource.getRelation(field.related);
      }
    });
    if (field) {
      field = { ...field };
      field.name = parts[length - 1];
      field.resource = resource;
    }
    return withResource ? { resource, field } : field;
  }

  getPathField(path) {
    if (!path || !path.includes(".")) {
      return this.fields[path] || null;
    }

    let resource = this;
    let field = null;
    let crossesMany = false;
    const labels = [];
    const parts = path.split(".");
    for (let index = 0; index < parts.length; index += 1) {
      const name = parts[index];
      field = resource && resource.fields[name];
      if (!field) {
        return null;
      }

      const last = index === parts.length - 1;
      if (last) {
        crossesMany = crossesMany || field.type === "many";
        const leafLabel = field.label || toTitleCase(name);
        labels.push(crossesMany ? pluralizeLabel(leafLabel) : leafLabel);
        break;
      }

      if (field.type !== "one" && field.type !== "many") {
        return null;
      }
      crossesMany = crossesMany || field.type === "many";
      labels.push(singularizeLabel(field.label || toTitleCase(name)));
      resource = resource.getRelation(field.related);
    }

    const leafType = field.type;
    const relationLeaf = leafType === "one" || leafType === "many";
    return {
      ...field,
      name: path,
      path,
      field_name: parts[parts.length - 1],
      label: labels.join(" "),
      type: relationLeaf
        ? crossesMany
          ? "many"
          : "one"
        : crossesMany
        ? "list"
        : leafType,
      item_type: crossesMany && !relationLeaf ? leafType : null,
      deferred: true,
      dynamic: true,
      many: crossesMany,
      resource,
    };
  }

  // New method to handle JSON fields
  getJSONField(path, { withResource = false } = {}) {
    if (!path) {
      return null;
    }

    try {
      // Parse JSON path: field_name or field_name.key or field_name.key.subkey
      const pathParts = path.split(".");
      if (pathParts.length < 1) {
        return null;
      }

      const baseFieldName = pathParts[0];
      const jsonPath =
        pathParts.length > 1 ? "." + pathParts.slice(1).join(".") : "";

      // Get the base field
      const baseField = this.fields[baseFieldName];
      if (!baseField) {
        return null;
      }

      // Check if base field is JSON-compatible
      if (baseField.type !== "object" && baseField.type !== "json") {
        return null;
      }

      // Create a virtual field for the JSON path
      const virtualField = {
        ...baseField,
        name: path,
        jsonPath: jsonPath,
        baseField: baseFieldName,
        isJSONField: true,
      };

      return withResource
        ? { resource: this, field: virtualField }
        : virtualField;
    } catch (error) {
      console.warn("Error resolving JSON field:", error);
      return null;
    }
  }

  // Extract first-level keys from a JSON field
  getJSONFieldKeys(fieldName) {
    const field = this.fields[fieldName];
    if (!field || (field.type !== "object" && field.type !== "json")) {
      return [];
    }

    // Get sample records to extract keys
    const records = this.cache.get();
    return extractJSONKeys(records, fieldName);
  }

  // Check if a field is a JSON field
  isJSONField(fieldName) {
    const field = this.fields[fieldName];
    return field && (field.type === "object" || field.type === "json");
  }

  // Get JSON field options for filtering
  getJSONFieldOptions(fieldName) {
    const keys = this.getJSONFieldKeys(fieldName);
    return keys.map((key) => ({
      value: key,
      label: key,
      icon: "mdi-code-json",
      type: "string", // Default to string, can be refined based on actual data
    }));
  }

  getRecordId(record) {
    return record[this.getClientRecordIdField()];
  }
  getRecordName(record) {
    return record[this.name_field];
  }
  getRecord(id) {
    return this.cache.get(id);
  }
  getRecords(filter) {
    const records = this.cache.get();
    if (filter) {
      return Object.fromEntries(
        Object.entries(records).filter(([_, b]) => filter(b))
      );
    }
    return records;
  }
  getSectionFieldOrder(name) {
    if (!this._sectionFieldOrder) {
      this._sectionFieldOrder = {};
      let index = 1;
      (this.sections || []).forEach((section) =>
        section.fields.forEach((key) => {
          if (!this._sectionFieldOrder[key]) {
            this._sectionFieldOrder[key] = index;
            index += 1;
          }
        })
      );
      Object.keys(this.fields).forEach((key) => {
        if (!this._sectionFieldOrder[key]) {
          this._sectionFieldOrder[key] = index;
          index += 1;
        }
      });
    }
    return this._sectionFieldOrder[name];
  }
  getFieldOptions(filters = {}, sorts) {
    return makeOptions(this.getFields(filters, sorts));
  }
  getFields(filters = {}, sorts) {
    filters = filters || {};
    const fields = this.getFieldNames({ ...filters })
      .map(columnCreator(this))
      .sort((a, b) => {
        let result = 0;
        // always name field first
        (sorts ? sorts : ["name_field", "section"]).forEach((sort) => {
          if (result === 0) {
            let aSort, bSort;
            if (sort === "name_field") {
              if (a.name === this.name_field) {
                result = -1;
              }
              if (b.name === this.name_field) {
                result = 1;
              }
            } else if (sort === "name") {
              if (a.name !== b.name) {
                result = a.name < b.name ? -1 : 1;
              }
            } else if (sort === "section") {
              aSort = this.getSectionFieldOrder(a.name);
              bSort = this.getSectionFieldOrder(b.name);
              result = aSort < bSort ? -1 : 1;
            } else if (sort === "required") {
              aSort = this.isFieldRequired(a.name);
              bSort = this.isFieldRequired(b.name);
              if (aSort !== bSort) {
                result = aSort ? -1 : 1;
              }
            } else if (sort === "simple") {
              aSort = a.type === "one" || a.type === "many";
              bSort = b.type === "one" || b.type === "many";
              if (aSort != bSort) {
                result = aSort ? 1 : -1;
              }
            }
          }
        });
        return result;
      });
    const dynamicFields = Object.entries(filters.include || {})
      .filter(([path, included]) => included && path.includes("."))
      .map(([path]) => this.getPathField(path))
      .filter((field) => field && field.resource.canRead(field.field_name))
      .map((field) => columnCreator(this)(field.path))
      .sort((a, b) => a.label.localeCompare(b.label));
    return [...fields, ...dynamicFields];
  }
  isFieldRequired(name) {
    const field = this.fields[name];
    return (
      (typeof field.default === "undefined" || field.default === null) &&
      !field.null
    );
  }
  getFieldPermissions(fieldName) {
    const permissions = this.permissions;
    if (!permissions) {
      return {};
    }
    return permissions.fields ? permissions.fields[fieldName] || {} : {};
  }
  getFieldNames({
    type = null,
    deferred = null,
    include = null,
    filterable = null,
    read = null,
    write = null,
    hidden = null,
    ui = true,
  }) {
    return Object.entries(this.fields)
      .filter(([k, f]) => {
        if (include && include[k] === false) {
          // exclude this no matter what
          return false;
        }
        const defer = f.deferred && (!include || !include[k]);

        // Check if field is filterable
        let isFilterable = f.filterable;
        if (filterable !== null) {
          // For JSON fields, consider them filterable if they have data
          if (f.type === "object" || f.type === "json") {
            isFilterable = this.getJSONFieldKeys(k).length > 0;
          }
        }

        return (
          (deferred === null || deferred === defer) &&
          (!type ||
            (typeof type === "function" && type(f.type)) ||
            f.type === type) &&
          (filterable === null || filterable === isFilterable) &&
          (read === null || read === this.getFieldPermissions(k).read) &&
          (write === null || write === this.getFieldPermissions(k).write) &&
          (hidden === null || hidden === f.hidden) &&
          (ui === null ||
            ui === f.ui ||
            (ui === "read" && f.ui === true) ||
            (ui === true && f.ui === "read"))
        );
      })
      .map(([k]) => k);
  }
  getAPISorts(sort) {
    const result = {};
    if (sort && sort.length) {
      result.sort = sort;
    }
    return result;
  }
  getAPICombines(combine) {
    // combine+combine_using+combine_ex -> combine
    // by+by_using+by_ex -> by
    // over+over_using+over_ex -> over
    const result = {};
    if (!combine) {
      return result;
    }
    const type = combine.type;
    if (combine.advanced) {
      if (combine.combine_ex) {
        result["combine"] = combine.combine_ex;
      }
      if (combine.by_ex && (dimension[type] || 0) >= 2) {
        result["combine.by"] = combine.by_ex;
      }
      if (combine.over_ex && (dimension[type] || 0) >= 3) {
        result["combine.over"] = combine.over_ex;
      }
    } else {
      if (combine.combine) {
        const combineUsing = combine.combine_using || "count";
        result["combine"] = `${combineUsing}(${combine.combine})`;
      }
      const by = combine.by;
      if (by && (dimension[type] || 0) >= 2) {
        const byUsing = combine.by_using;
        const byField = this.getField(by);
        let byPath = by;
        if (byField && (byField.type === "one" || byField.type === "many")) {
          byPath = `${by}.${this.getRelation(byField.related).name_field}`;
        }
        result["combine.by"] = byUsing ? `${byUsing}(${byPath})` : byPath;
      }
      const over = combine.over;
      if (over && (dimension[type] || 0) >= 3) {
        const overUsing = combine.over_using;
        const overField = this.getField(over);
        let overPath = over;
        if (
          overField &&
          (overField.type === "one" || overField.type === "many")
        ) {
          overPath = `${over}.${
            this.getRelation(overField.related).name_field
          }`;
        }
        result["combine.over"] = overUsing
          ? `${overUsing}(${overPath})`
          : overPath;
      }
    }
    return result;
  }
  static getApplication() {
    const model = this.store().$db().model("_application");
    return model.getInstance();
  }
  getAPIFilters(arg) {
    const application = Resource.getApplication();
    const filters = {};
    if (!arg) {
      return filters;
    }
    if (typeof arg === "string") {
      if (this.search_key) {
        filters[this.search_key] = arg;
      } else {
        const key = `${this.name_field}.icontains`;
        filters["filter"] = { [key]: arg };
      }
    }
    if (Array.isArray(arg) && arg.length) {
      const filter = {};
      arg.forEach((condition) => {
        const [key, value, raw] = translateFilterConditionToAPI(
          this,
          condition,
          OPERATOR_MAP,
          application
        );
        if (raw) {
          const isJsonPathFilter =
            !key.startsWith("filter{") &&
            key.includes(".") &&
            !key.includes("__") &&
            !key.includes("$") &&
            !key.match(
              /\.(icontains|eq|neq|gt|gte|lt|lte|in|nin|isnull|notnull)$/
            );
          if (isJsonPathFilter) {
            filters[`filter{${key}}`] = value;
          } else {
            filters[key] = value;
          }
        } else {
          if (key !== null) {
            filter[key] = value;
          }
        }
      });
      if (Object.keys(filter).length) {
        filters["filter"] = filter;
      }
    }
    return filters;
  }
  getAPIFields({ view, ...rest }) {
    // always include id field even if deferred in list
    let includeMap = rest.include || {};
    if (typeof includeMap === "string") {
      includeMap = [includeMap];
    }
    if (Array.isArray(includeMap)) {
      includeMap = Object.fromEntries(includeMap.map((i) => [i, true]));
    } else {
      includeMap = { ...includeMap };
    }
    if (
      !Object.keys(includeMap).length &&
      this.getFeature("api_include_all", false)
    ) {
      includeMap = Object.fromEntries(
        Object.keys(this.fields || {}).map((name) => [name, true])
      );
    }
    const relationships =
      typeof rest.relations === "undefined" ? true : rest.relations;
    const include = [];
    const exclude = [];
    const excludeAll = includeMap["*"] === false;
    if (excludeAll) {
      // Shortcut: emit a single exclude=* rather than exploding every
      // un-requested field into its own exclude entry.
      delete includeMap["*"];
    }
    const manyRelationsEnabled =
      typeof rest.manyRelations === "undefined"
        ? relationships
        : rest.manyRelations;
    let manyRelations;
    let oneRelations;
    if (excludeAll) {
      // When excluding all, only pull in relations that were explicitly asked for.
      const pickByType = (type) =>
        Object.keys(includeMap).filter(
          (k) => includeMap[k] && this.fields[k] && this.fields[k].type === type
        );
      oneRelations = pickByType("one");
      manyRelations = manyRelationsEnabled ? pickByType("many") : [];
    } else {
      manyRelations = manyRelationsEnabled
        ? this.getFieldNames({
            type: "many",
            deferred: rest.deferred || false,
            include: includeMap,
          })
        : [];
      oneRelations = this.getFieldNames({
        type: "one",
        deferred: rest.deferred || false,
        include: includeMap,
      });
    }
    Object.entries(includeMap).forEach(([name, included]) => {
      // make sure all explicitly included entries are added to include (except relationship fields)
      if (included) {
        const field = this.fields[name];
        if (name.includes(".")) {
          const pathField = this.getPathField(name);
          const relationLeaf =
            pathField &&
            (pathField.type === "one" || pathField.type === "many");
          include.push(relationLeaf ? `${name}.*` : name);
        } else if (field && field.type !== "many" && field.type !== "one") {
          include.push(name);
        }
      }
    });
    if (relationships) {
      // include the non-deferred one-relations
      include.push(...oneRelations.map((f) => [`${f}.*`].flat()));
      // include the non-deferred many-relations
      if (manyRelationsEnabled) {
        include.push(...manyRelations.map((f) => [`${f}.*`]).flat());
      }
    }
    // include the ID field
    const apiIdField = this.getAPIIdField();
    if (apiIdField && include.indexOf(apiIdField) === -1) {
      include.push(apiIdField);
    }
    if (excludeAll) {
      exclude.push("*");
    } else {
      // remove explicitly excluded fields
      exclude.push(
        ...Object.entries(includeMap)
          .filter(
            ([name, value]) =>
              !value &&
              value !== "*" &&
              !Object.entries(includeMap).some(
                ([path, included]) => included && path.startsWith(`${name}.`)
              )
          )
          .map(([key]) => key)
      );
    }
    if (rest.deferred) {
      const deferredNonRelations = this.getFieldNames({
        type: (t) => t !== "one" && t !== "many",
        deferred: true,
        include: includeMap,
      });
      include.push(...deferredNonRelations);
      if (exclude.indexOf("*") === -1) {
        exclude.push("*");
      }
    }
    // console.log({oneRelations, manyRelations, include, exclude, name: this.name});
    return {
      include,
      exclude,
    };
  }
  getRelationFromField(name) {
    const field = this.fields[name] || this.getPathField(name);
    if (!field) {
      throw new Error(`No field ${this.name}.${name}`);
    }
    if (!field.related) {
      throw new Error(`Field ${this.name}.${name} is not a relation`);
    }
    return (field.resource || this).getRelation(field.related);
  }
  getRelation(name) {
    return Resource.find(name);
  }
  getFieldIcon(name, defaultValue = null) {
    const field = this.fields[name] || this.getPathField(name);
    if (!field) {
      return defaultValue;
    }
    if (name === this.name_field) {
      return "title";
    }
    let related = field.related;
    if (related) {
      related = (field.resource || this).getRelation(related);
    }
    if (name === this.id_field) {
      return "key";
    }
    switch (field.type) {
      case "string":
        return "text_fields";
      case "number":
      case "integer":
      case "decimal":
        return "numbers";
      case "one":
      case "many":
        return related.icon ? `mdi-${related.icon}` : "question_mark";
      case "choice":
        return "arrow_drop_down_circle";
      case "date":
      case "datetime":
        return "today";
      case "boolean":
        return "check_box";
      case "image upload":
        return "image";
      case "file upload":
      case "file":
        return "upload_file";
      case "list":
        return "list";
      case "chart":
        return "bar_chart";
      case "iframe":
        return "web";
      case "resource":
      case "resources":
        return "mdi-format-list-bulleted-type";
      case "json":
      case "object":
        return "mdi-code-json";
      default:
        return "data_object";
    }
  }
  getValue(record, name, limit) {
    if (name.includes(".")) {
      const base = this.getPathValue(record, name);
      return limit && base && base.slice ? base.slice(0, limit) : base;
    }
    let base = record ? record[name] : undefined;
    const field = this.fields[name];
    if (!field) {
      throw Error(`No such field ${this.name}.${name}`);
    }
    if (field.type === "decimal") {
      base = isEmpty(base) ? null : parseFloat(base);
    }
    return !limit || !base || !base.slice ? base : base.slice(0, limit);
  }
  getPathValue(record, path) {
    let resource = this;
    let values = [record];
    let crossesMany = false;
    const parts = path.split(".");

    for (let index = 0; index < parts.length; index += 1) {
      const name = parts[index];
      const field = resource && resource.fields[name];
      if (!field) {
        return undefined;
      }

      const rawValues = [];
      values.forEach((value) => {
        const raw = value && typeof value === "object" ? value[name] : null;
        if (Array.isArray(raw)) {
          crossesMany = true;
          rawValues.push(...raw);
        } else {
          rawValues.push(raw);
        }
      });

      if (field.type === "one" || field.type === "many") {
        crossesMany = crossesMany || field.type === "many";
        const related = resource.getRelation(field.related);
        const relatedValues = rawValues
          .filter((value) => value !== null && typeof value !== "undefined")
          .map((value) =>
            typeof value === "object" ? value : related.getRecord(value)
          )
          .filter((value) => value);
        if (index === parts.length - 1) {
          values = relatedValues;
        } else {
          values = relatedValues;
          resource = related;
        }
      } else {
        if (index < parts.length - 1) {
          return undefined;
        }
        values = rawValues;
        if (field.type === "decimal") {
          values = values.map((value) =>
            isEmpty(value) ? null : parseFloat(value)
          );
        }
      }
    }

    const result = values.filter(
      (value) => value !== null && typeof value !== "undefined"
    );
    return crossesMany ? result : result[0];
  }
  getRelatedName(fieldName, value) {
    const relation = this.getRelationFromField(fieldName);
    if (!relation) {
      return "";
    }
    const nameField = relation.name_field;
    if (!value) {
      return "";
    }
    if (typeof value === "object" && value && value[nameField]) {
      return value[relation.name_field];
    }
    const cache = relation.cache;
    const record = cache ? cache.get(value) : null;
    if (record) {
      return record[nameField];
    }
    return "?";
  }
  getDisplayFormatter(fieldName, shorter) {
    const field = this.fields[fieldName] || this.getPathField(fieldName);
    if (!field) {
      return null;
    }
    const self = this;
    return (value, record) => {
      let result;
      switch (field.type) {
        case "one":
          result = this.getRelatedName(fieldName, value);
          break;
        case "boolean":
          if (value === true) {
            result = "yes";
          } else if (value === false) {
            result = "no";
          } else {
            result = "";
          }
          break;
        case "many":
          result =
            value && value.length
              ? value.map((v) => this.getRelatedName(fieldName, v)).join("\n")
              : "";
          break;
        case "date":
        case "datetime":
          if (!shorter && value) {
            result = formatDistance(parseISO(value), new Date(), {
              addSuffix: true,
            });
            result = `${result} (${self
              .getValue(record, fieldName)
              .slice(0, 19)
              .replace("T", " ")})`;
          } else {
            result = value;
          }
          break;
        case "choice":
          result = (field.resource || self).getChoiceDisplayValue(
            value,
            field.field_name || fieldName,
            record
          );
          break;
        case "number":
        case "integer":
        case "decimal":
          result = self.getNumberDisplayValue(value);
          break;
        case "object":
          if (YAMLIFY && value && typeof value !== "string") {
            result = value ? YAML.stringify(value) : value;
          } else {
            result = value;
          }
          break;
        case "list":
          result = value ? value.join("\n") : value;
          break;
        case "resources":
          result = value
            ? Resource.query()
                .where((r) => value.indexOf(r.name) > -1)
                .get()
                .map((r) => r.label.replace("_", " "))
                .join("\n")
            : "";
          break;
        case "resource":
          result = value
            ? Resource.find(value)?.label.replace("_", " ") || value
            : null;
          break;
        default:
          result = value;
      }

      if (shorter && result && result.indexOf && result.indexOf("\n") !== -1) {
        result = result.substr(0, result.indexOf("\n")) + " ...";
      }
      return result;
    };
  }
  getNumberDisplayValue(value) {
    return value && !isNaN(Number(value))
      ? Number(value).toLocaleString("en-US")
      : value;
  }
  getChoiceDisplayValue(value, fieldName, record) {
    const field = this.fields[fieldName];
    if (!field || !field.choices) {
      return value;
    }
    let display = value;
    let choices = field.choices;
    if (typeof choices === "function") {
      choices = choices({ resource: this, record });
    }
    choices.forEach(({ id, label }) => {
      if (id === value) {
        display = label;
      }
    });
    return display;
  }
  getChoiceValue(display, fieldName, record) {
    const field = this.fields[fieldName];
    let choices = field.choices;
    if (!field || !choices) {
      return display;
    }
    let value = display;
    if (typeof choices === "function") {
      choices = choices({ resource: this, record });
    }
    choices.forEach(({ id, label }) => {
      if (label === display) {
        value = id;
      }
    });
    return value;
  }
  getExportValue(record, name) {
    const field = this.fields[name] || this.getPathField(name);
    if (field.type === "one") {
      return this.getExportLink(record, name);
    }
    if (field.type === "many") {
      return this.getValue(record, name)
        .map((value) => this.getExportLink(record, name, value))
        .join("\n");
    }
    if (field.type === "field" || field.type === "object") {
      const value = this.getValue(record, name);
      return typeof value === "string" ? value : JSON.stringify(value, null, 2);
    }
    return field.type !== "date" && field.type !== "datetime"
      ? this.getDisplayValue(record, name)
      : this.getValue(record, name);
  }
  getDisplayValue(record, name, shorter) {
    return this.getDisplayFormatter(name, shorter)(
      this.getValue(record, name),
      record
    );
  }
  getStyle(record) {
    const style = this.style;
    if (!style || !Object.keys(style).length) {
      return null;
    }
    // assumes only one dimension / field
    const fieldName = Object.keys(style)[0];
    if (!fieldName || !this.fields[fieldName]) {
      return null;
    }

    const styleMap = style[fieldName];
    if (!styleMap || typeof styleMap !== "object") {
      return null;
    }

    const value = this.getValue(record, fieldName);

    const result = styleMap[value && value.toString ? value.toString() : value];
    if (["primary", "white", "black"].indexOf(result) >= 0) {
      return result;
    }
    return result; // `${result}-8`;
  }
  getName(record, name, relation) {
    if (typeof record === "undefined" || !record) {
      return toTitleCase(this.name);
    }
    const fieldName = name || this.name_field;
    const field = this.fields[fieldName] || this.getPathField(fieldName);
    if (!field) {
      if (
        fieldName &&
        typeof record[fieldName] !== "undefined" &&
        record[fieldName] !== null
      ) {
        return record[fieldName];
      }
      return toTitleCase(this.name);
    }
    const value = relation || this.getValue(record, fieldName);
    const nameField = field.related
      ? (field.resource || this).getRelation(field.related).name_field
      : this.name_field;
    if (typeof value === "object" && value) {
      return value[nameField];
    } else if (field.type === "one" || field.type === "many") {
      // id
      return this.getRelatedName(name, value);
    } else {
      return value;
    }
  }
  getExportLink(record, name, relation) {
    return `${API_URL}${this.getLink(record, name, relation)}`;
  }
  static getResourceLink(resource, view, filters) {
    let rest = "";
    // TODO: handle customizations to chart/include/sort
    let $view = view;
    if (typeof view === "string") {
      const Views = this.find("views");
      $view = Views ? Views.getRecord(view) : null;
    }
    if ($view) {
      const { id, data } = $view;
      let $chart = data ? data.chart : null;
      rest = `view=${id}`;
      if (filters && $chart) {
        $chart = JSON.stringify($chart);
        rest += `&chart=${$chart}`;
      }
    }
    if (filters) {
      let $filters = filters;
      $filters = JSON.stringify($filters);
      rest += `&filter=${$filters}`;
    }
    const resourceName = resource.name ? resource.name : resource;
    const result = rest ? `/${resourceName}/?${rest}` : `/${resourceName}/`;
    return result;
  }
  getLink(record, name, relation) {
    const fieldName = name || this.name_field;
    const field = this.fields[fieldName] || this.getPathField(fieldName);
    const related = field && field.related;
    const endpoint = related || this.name;
    const relatedResource = related
      ? (field.resource || this).getRelation(related)
      : null;
    const idField = related ? fieldName : this.id_field;
    if (!relation && !record) {
      return `/${endpoint}/`;
    }
    if (!relation && record && !related && !this.canDetail()) {
      return `/${endpoint}/`;
    }
    let ids = relation || this.getValue(record, idField);
    let many = true;
    if (!Array.isArray(ids)) {
      ids = [ids];
      many = false;
    }
    ids = ids.map((id) => {
      if (typeof id === "object" && id !== null) {
        id = relatedResource
          ? relatedResource.getRecordId(id)
          : this.getRecordId(id);
      }
      return `/${endpoint}/${id}/`;
    });
    return many ? ids : ids[0];
  }
}
export const OPERATORS = [
  // general
  {
    name: "$in",
    label: "is one of",
    symbol: "∋",
    notTypes: ["date", "datetime", "time", "boolean"],
    many: true,
  },
  {
    name: "$nin",
    label: "is none of",
    symbol: "∌",
    notTypes: ["date", "datetime", "time", "boolean"],
    many: true,
    api: {
      key: "in",
      negative: true,
    },
  },
  {
    name: "$isnull",
    label: "is empty",
    types: "*",
    type: "none",
    api: {
      value: 1,
    },
    symbol: "∅",
  },
  {
    name: "$isme",
    label: "is me",
    types: ["many", "one"],
    resources: ["users"],
    type: "none",
    icon: "mdi-account",
    api: {
      key: "eq",
      value: ({ user }) => user?.id,
    },
  },
  {
    name: "$notme",
    label: "is not me",
    resources: ["users"],
    types: ["many", "one"],
    type: "none",
    icon: "mdi-account-cancel",
    api: {
      key: "eq",
      negative: true,
      value: ({ user }) => user?.id,
    },
  },
  {
    name: "$isfalse",
    label: "is not true",
    types: ["boolean"],
    type: "none",
    symbol: "⊭",
    api: {
      key: "eq",
      value: "true",
      negative: true,
    },
  },
  {
    name: "$istrue",
    label: "is true",
    types: ["boolean"],
    type: "none",
    symbol: "⊨",
    api: {
      key: "eq",
      value: "true",
    },
  },
  {
    name: "$notnull",
    label: "is not empty",
    types: "*",
    symbol: "*",
    api: {
      key: "isnull",
      value: 0,
    },
    type: "none",
  },
  {
    name: "$eq",
    label: "is equal to",
    symbol: "=",
  },
  {
    name: "$neq",
    label: "is not equal to",
    api: {
      key: "eq",
      negative: true,
    },
    symbol: "≠",
  },
  {
    name: "$icontains",
    label: "contains",
    type: "string",
    symbol: "∋",
    types: ["string", "list"],
  },
  {
    name: "$nicontains",
    label: "does not contain",
    type: "string",
    types: ["string"],
    symbol: "∉",
    api: {
      key: "icontains",
      negative: true,
    },
  },
  {
    name: "$istartswith",
    label: "starts with",
    symbol: "≪",
    type: "string",
    types: ["string"],
  },
  {
    name: "$iendswith",
    label: "ends with",
    symbol: "≫",
    type: "string",
    types: ["string"],
  },
  {
    name: "$regex",
    label: "matches",
    types: [], // TODO: consider if we need this
    type: "string",
    type: "regex",
    symbol: "≅",
  },
  {
    name: "$range",
    label: "is between",
    symbol: "≬",
    types: ["integer", "decimal", "number", "date", "datetime"],
    length: 2,
  },
  {
    name: "$gt",
    symbol: ">",
    label: "is more than",
    types: ["integer", "decimal", "number"],
  },
  {
    name: "$gtd",
    symbol: ">",
    label: "is after",
    types: ["date", "datetime", "time"],
    api: {
      key: "gt",
    },
  },
  {
    name: "$lt",
    label: "is less than",
    symbol: "<",
    types: ["integer", "decimal", "number"],
  },
  {
    name: "$ltd",
    label: "is before",
    symbol: "<",
    types: ["date", "datetime", "time"],
    api: {
      key: "lt",
    },
  },
  {
    name: "$gte",
    label: "is more or equal to",
    symbol: "≥",
    types: ["integer", "decimal", "number"],
  },
  {
    name: "$gted",
    label: "is after or on",
    symbol: "≥",
    types: ["date"],
    api: {
      key: "gte",
    },
  },
  {
    name: "$lte",
    label: "is less or equal to",
    symbol: "≤",
    types: ["integer", "decimal", "number"],
  },
  {
    name: "$lted",
    label: "is before or on",
    symbol: "≤",
    types: ["date"],
    api: {
      key: "lte",
    },
  },
  {
    name: "$this",
    label: "present",
    icon: "mdi-clock-outline",
    types: ["date", "datetime"],
    field: {
      name: "$this",
      type: "choice",
      choices: THIS_TIME_CHOICES,
    },
    api: {
      key: "range",
      value: ({ value, field }) => getRange(value, field),
    },
  },
  {
    name: "$last",
    label: "in the last",
    icon: "mdi-clock-end",
    field: {
      name: "$last",
      type: "choice",
      choices: RELATIVE_TIME_CHOICES,
    },
    types: ["date", "datetime"],
    api: {
      key: "range",
      value: ({ value, field }) => getRange(value, field, "last"),
    },
  },
  {
    name: "$past",
    label: "past",
    icon: "mdi-history",
    field: {
      name: "$past",
      type: "choice",
      choices: PAST_TIME_CHOICES,
    },
    types: ["date", "datetime"],
    api: {
      key: "range",
      value: ({ value, field }) => getRange(value, field, "past"),
    },
  },
  {
    name: "$next",
    label: "in the next",
    icon: "mdi-clock-start",
    field: {
      name: "$next",
      type: "choice",
      choices: RELATIVE_TIME_CHOICES,
    },
    types: ["date", "datetime"],
    api: {
      key: "range",
      value: ({ value, field }) => getRange(value, field, "next"),
    },
  },
  {
    name: "$future",
    label: "future",
    icon: "mdi-update",
    field: {
      name: "$future",
      type: "choice",
      choices: FUTURE_TIME_CHOICES,
    },
    types: ["date", "datetime"],
    api: {
      key: "range",
      value: ({ value, field }) => getRange(value, field, "future"),
    },
  },
  // JSON-specific operators
  {
    name: "$path_eq",
    label: "JSON path equals",
    symbol: "=",
    types: ["object", "json"],
    type: "object",
    icon: "mdi-code-json",
    api: {
      key: "path_eq",
      json: true,
      value: (context) => context.value?.value || "",
    },
  },
  {
    name: "$has_key",
    label: "has JSON key",
    symbol: "∋",
    types: ["object", "json"],
    type: "string",
    icon: "mdi-code-json",
    api: {
      key: "has_key",
      json: true,
    },
  },
  {
    name: "$not_has_key",
    label: "does not have JSON key",
    symbol: "∌",
    types: ["object", "json"],
    type: "string",
    icon: "mdi-code-json",
    api: {
      key: "has_key",
      negative: true,
      json: true,
    },
  },
  {
    name: "$has_keys",
    label: "has JSON keys",
    symbol: "∋",
    types: ["object", "json"],
    type: "string",
    icon: "mdi-code-json",
    api: {
      key: "has_keys",
      json: true,
    },
  },
  {
    name: "$not_has_keys",
    label: "does not have JSON keys",
    symbol: "∌",
    types: ["object", "json"],
    type: "string",
    icon: "mdi-code-json",
    api: {
      key: "has_keys",
      negative: true,
      json: true,
    },
  },
  {
    name: "$has_any_keys",
    label: "has any JSON keys",
    symbol: "∋",
    types: ["object", "json"],
    type: "string",
    icon: "mdi-code-json",
    api: {
      key: "has_any_keys",
      json: true,
    },
  },
  {
    name: "$not_has_any_keys",
    label: "does not have any JSON keys",
    symbol: "∌",
    types: ["object", "json"],
    type: "string",
    icon: "mdi-code-json",
    api: {
      key: "has_any_keys",
      negative: true,
      json: true,
    },
  },
  {
    name: "$path_contains",
    label: "JSON path contains",
    symbol: "∋",
    types: ["object", "json"],
    type: "string",
    icon: "mdi-code-json",
    api: {
      key: "path_contains",
      json: true,
    },
  },
  {
    name: "$path_in",
    label: "JSON path in list",
    symbol: "∈",
    types: ["object", "json"],
    type: "string",
    icon: "mdi-code-json",
    api: {
      key: "path_in",
      json: true,
    },
  },
  {
    name: "$path_exists",
    label: "JSON path exists",
    symbol: "∃",
    types: ["object", "json"],
    type: "string",
    icon: "mdi-code-json",
    api: {
      key: "path_exists",
      json: true,
    },
  },
  {
    name: "$is_empty",
    label: "JSON is empty",
    symbol: "∅",
    types: ["object", "json"],
    type: "none",
    icon: "mdi-code-json",
    api: {
      key: "is_empty",
      json: true,
    },
  },
  {
    name: "$not_is_empty",
    label: "JSON is not empty",
    symbol: "≠∅",
    types: ["object", "json"],
    type: "none",
    icon: "mdi-code-json",
    api: {
      key: "is_empty",
      negative: true,
      json: true,
    },
  },
  {
    name: "$array_contains",
    label: "JSON array contains",
    symbol: "∋",
    types: ["object", "json"],
    type: "string",
    icon: "mdi-code-json",
    api: {
      key: "array_contains",
      json: true,
    },
  },
];
export const OPERATOR_MAP = OPERATORS.reduce((acc, item) => {
  acc[item.name] = item;
  return acc;
}, {});

export const operatorMatches = (option, field, onlyFields) => {
  const op = OPERATOR_MAP[option.value || option];
  if (onlyFields && !(op.field && op.field.choices)) {
    return false;
  }
  if (op.resources && field.related) {
    return op.resources.includes(field.related);
  }
  if (op.types) {
    if (op.types === "*" || op.types.includes("*")) {
      return true;
    }
    // Check if this is a JSON field using centralized method
    if (
      field.isJSONField &&
      (op.types.includes("object") || op.types.includes("json"))
    ) {
      return true;
    }
    return op.types.includes(field.type);
  }
  if (op.notTypes) {
    return !op.notTypes.includes(field.type);
  }
  return field.type !== "boolean";
};

export default Resource;
