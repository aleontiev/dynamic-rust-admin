import api from "../api";
import { toTitleCase } from ".";

// Hosts can opt into extra report endpoints; the library assumes no business models.
const hostConfig = window.__DYNAMIC_ADMIN_CONFIG__ || window.__DREAM_ADMIN_CONFIG__ || window.__DREAM_CONFIG__ || {};
const SYNTHETIC_RESOURCES = Array.isArray(hostConfig.syntheticResources)
  ? hostConfig.syntheticResources
  : [];

const isPlainObject = (value) =>
  !!value && typeof value === "object" && !Array.isArray(value);

const toLabel = (key) => {
  if (!key) {
    return "";
  }
  return toTitleCase(key.replace(/_/g, " "));
};

const extractOptionResource = (payload) =>
  [payload?.resource, payload?.data, payload].find(
    (candidate) => isPlainObject(candidate) && isPlainObject(candidate.fields)
  ) || {};

const extractOptionFields = (payload) => {
  const optionResource = extractOptionResource(payload);
  if (isPlainObject(optionResource.fields)) {
    return optionResource.fields;
  }
  if (isPlainObject(payload?.actions?.GET)) {
    return payload.actions.GET;
  }
  return {};
};

const pickField = (candidates, fields, fallback = null) => {
  const fieldNames = Object.keys(fields || {});
  const found = (candidates || []).find((candidate) =>
    fieldNames.includes(candidate)
  );
  if (found) {
    return found;
  }
  return fallback || fieldNames[0] || null;
};

const buildFields = (optionFields) =>
  Object.entries(optionFields || {}).reduce((result, [key, rawOptionField]) => {
    const optionField = isPlainObject(rawOptionField) ? rawOptionField : {};
    const type = optionField.type || "string";

    result[key] = {
      ...optionField,
      label: optionField.label || toLabel(key),
      type,
      sortable:
        typeof optionField.sortable === "boolean" ? optionField.sortable : true,
      filterable:
        typeof optionField.filterable === "boolean"
          ? optionField.filterable
          : !["one", "many"].includes(type),
      ui: typeof optionField.ui === "undefined" ? true : optionField.ui,
      hidden: !!optionField.hidden,
    };

    return result;
  }, {});

const buildSections = (fields, optionSections) => {
  const keys = Object.keys(fields || {});

  if (Array.isArray(optionSections) && optionSections.length) {
    const sections = optionSections
      .map((section) => ({
        ...section,
        fields: (section.fields || []).filter((field) => keys.includes(field)),
      }))
      .filter((section) => section.fields.length);

    if (sections.length) {
      return sections;
    }
  }

  if (!keys.length) {
    return [];
  }

  return [
    {
      name: "report",
      label: "Report",
      fields: keys,
    },
  ];
};

const buildPermissions = (fields, basePermissions = {}) => {
  const fieldPermissions = Object.keys(fields || {}).reduce((result, key) => {
    const explicit = basePermissions.fields?.[key];
    result[key] = explicit || {
      read: true,
      write: false,
    };
    return result;
  }, {});

  return {
    list:
      typeof basePermissions.list === "boolean" ? basePermissions.list : true,
    create:
      typeof basePermissions.create === "boolean"
        ? basePermissions.create
        : false,
    update:
      typeof basePermissions.update === "boolean"
        ? basePermissions.update
        : false,
    delete:
      typeof basePermissions.delete === "boolean"
        ? basePermissions.delete
        : false,
    fields: fieldPermissions,
  };
};

const sanitizeStyle = (style, fields) => {
  if (!isPlainObject(style)) {
    return null;
  }

  const validEntries = Object.entries(style).filter(
    ([fieldName, value]) =>
      Object.prototype.hasOwnProperty.call(fields || {}, fieldName) &&
      isPlainObject(value)
  );

  return validEntries.length ? Object.fromEntries(validEntries) : null;
};

const buildSyntheticResource = ({ config, optionResource, optionFields }) => {
  const fields = buildFields(optionFields);
  const style = sanitizeStyle(optionResource.style, fields);
  const idField =
    optionResource.id_field ||
    pickField(config.idFieldCandidates, fields, Object.keys(fields)[0] || null);
  const nameField =
    optionResource.name_field ||
    pickField(config.nameFieldCandidates, fields, idField);
  const defaultChartCombine =
    optionResource.features?.default_chart_combine ||
    pickField(config.defaultChartCombineCandidates, fields, nameField);

  return {
    name: optionResource.name || config.name,
    singular: optionResource.singular || config.singular,
    description: optionResource.description || null,
    label: optionResource.label || config.label,
    icon: optionResource.icon || config.icon,
    section: typeof config.section !== "undefined" ? config.section: optionResource.section ?? null,
    style,
    features: {
      ...(optionResource.features || {}),
      cache: typeof config.cache === "boolean" ? config.cache : true,
      detail: false,
      api_include_all: true,
      list_endpoint: config.endpoint,
      options_endpoint: config.endpoint,
      ...(defaultChartCombine
        ? { default_chart_combine: defaultChartCombine }
        : {}),
    },
    id_field: idField,
    name_field: nameField,
    fields,
    permissions: buildPermissions(fields, optionResource.permissions || {}),
    sections: buildSections(fields, optionResource.sections),
    actions: optionResource.actions || [],
    search_key: optionResource.search_key || null,
  };
};

const fetchSyntheticResource = async (config) => {
  const optionsResponse = await api
    .options(config.endpoint, { params: { exclude_links: 1 } })
    .catch(() => null);

  if (!optionsResponse) {
    return null;
  }

  const optionResource = extractOptionResource(optionsResponse.data);
  const optionFields = extractOptionFields(optionsResponse.data);

  if (!Object.keys(optionFields).length) {
    return null;
  }

  return buildSyntheticResource({
    config,
    optionResource,
    optionFields,
  });
};

export const loadSyntheticResources = async () => {
  const resources = await Promise.all(
    SYNTHETIC_RESOURCES.map((config) => fetchSyntheticResource(config))
  );

  return resources.filter(Boolean);
};
