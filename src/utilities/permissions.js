// Field overrides in a role's access map. Next to its operations and actions,
// a resource's rules may hold `fields`: per field, `read_only` (false lets the
// role change a field declared read-only, true keeps it from changing it) and
// `write_only` (false lets the role see a field declared hidden, true hides
// it). Across the roles a person holds, a field is visible if any of them
// makes it visible and changeable if any makes it changeable.

export const FIELD_OVERRIDES = "fields";

// The two choices a field offers, each mapped onto one override flag.
export const FIELD_CHOICES = {
  visibility: {
    flag: "write_only",
    on: { value: "visible", label: "Visible", icon: "mdi-eye-outline" },
    off: { value: "hidden", label: "Hidden", icon: "mdi-eye-off-outline" },
  },
  editing: {
    flag: "read_only",
    on: { value: "editable", label: "Editable", icon: "mdi-pencil-outline" },
    off: { value: "read_only", label: "Read-only", icon: "mdi-pencil-off-outline" },
  },
};

const isObject = (value) =>
  !!value && typeof value === "object" && !Array.isArray(value);

// A resource's stored overrides, by field.
export const fieldOverrides = (rules) =>
  isObject(rules) && isObject(rules[FIELD_OVERRIDES]) ? rules[FIELD_OVERRIDES] : {};

// The choice a role makes for one aspect of a field: "default", or the value
// of the matching option ("visible", "hidden", "editable", "read_only").
export const fieldChoice = (overrides, field, aspect) => {
  const { flag, on, off } = FIELD_CHOICES[aspect];
  const value = isObject(overrides[field]) ? overrides[field][flag] : undefined;
  if (value === false) {
    return on.value;
  }
  if (value === true) {
    return off.value;
  }
  return "default";
};

// The overrides with one aspect of a field set to `choice`; "default" removes
// it, and a field left with no overrides is dropped.
export const withFieldChoice = (overrides, field, aspect, choice) => {
  const { flag, on, off } = FIELD_CHOICES[aspect];
  const entry = { ...(isObject(overrides[field]) ? overrides[field] : {}) };
  if (choice === on.value) {
    entry[flag] = false;
  } else if (choice === off.value) {
    entry[flag] = true;
  } else {
    delete entry[flag];
  }
  const next = { ...overrides };
  if (Object.keys(entry).length) {
    next[field] = entry;
  } else {
    delete next[field];
  }
  return next;
};

// The options for one aspect of a field, the first naming what it is declared as.
export const fieldChoiceOptions = (declared, aspect) => {
  const { flag, on, off } = FIELD_CHOICES[aspect];
  const restricted = !!(declared && declared[flag]);
  const fallback = restricted ? off : on;
  return [
    {
      value: "default",
      label: `Default (${fallback.label})`,
      icon: fallback.icon,
      caption: "As the app declares it",
    },
    { ...on, caption: aspect === "visibility" ? "This role sees it" : "This role may change it" },
    { ...off, caption: aspect === "visibility" ? "Hidden from this role" : "This role may not change it" },
  ];
};

// How many fields a resource's rules override.
export const overrideCount = (rules) => Object.keys(fieldOverrides(rules)).length;

// A short description of a resource's overrides, e.g. "Notes visible, Status editable".
export const describeFieldOverrides = (rules, labels) =>
  Object.entries(fieldOverrides(rules))
    .map(([field, entry]) => {
      const words = Object.keys(FIELD_CHOICES)
        .map((aspect) => fieldChoice({ [field]: entry }, field, aspect))
        .filter((choice) => choice !== "default")
        .map((choice) => (choice === "read_only" ? "read-only" : choice));
      if (!words.length) {
        return null;
      }
      const label = (labels && labels[field] && labels[field].label) || field;
      return `${label} ${words.join(" and ")}`;
    })
    .filter(Boolean)
    .join(", ");
