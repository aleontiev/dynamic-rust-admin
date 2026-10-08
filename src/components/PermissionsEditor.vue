<template>
  <div :class="{ PermissionsEditor: true, dark: dark, readonly: readonly }">
    <div v-if="!resources.length" class="text-grey q-pa-sm">
      No resources accept rules yet.
    </div>
    <div v-else class="PermissionsEditor__scroll">
      <table class="PermissionsEditor__table">
        <thead>
          <tr>
            <th class="PermissionsEditor__resource-head">Resource</th>
            <th v-for="operation in OPERATIONS" :key="operation">
              <q-icon :name="operationIcon(operation)" size="14px" class="q-mr-xs" />{{ operation }}
            </th>
          </tr>
        </thead>
        <tbody>
          <template v-for="entry in resources" :key="entry.name">
            <tr class="PermissionsEditor__row" :class="{ granted: granted(entry).length }">
              <td class="PermissionsEditor__resource">
                <span class="PermissionsEditor__resource-name">
                  <q-icon :name="entry.icon" size="18px" :color="granted(entry).length ? 'primary' : 'grey-6'" />
                  <span>{{ entry.label }}</span>
                </span>
              </td>
              <td v-for="operation in OPERATIONS" :key="operation" class="PermissionsEditor__cell" :class="ruleKind(entry.name, operation)">
                <q-select
                  behavior="menu"
                  :dark="dark"
                  dense
                  borderless
                  options-dense
                  :options="kinds(entry)"
                  :model-value="ruleKind(entry.name, operation)"
                  @update:model-value="setKind(entry.name, operation, $event)"
                  :readonly="readonly"
                  :hide-dropdown-icon="readonly"
                  :aria-label="`${entry.label}: ${operation}`"
                  emit-value
                  map-options
                >
                  <template v-slot:selected-item="scope">
                    <span class="PermissionsEditor__value" :class="scope.opt.value">
                      <q-icon :name="scope.opt.icon" size="16px" />{{ scope.opt.label }}
                    </span>
                  </template>
                  <template v-slot:option="scope">
                    <q-item v-bind="scope.itemProps">
                      <q-item-section avatar><q-icon :name="scope.opt.icon" size="18px" /></q-item-section>
                      <q-item-section><q-item-label>{{ scope.opt.label }}</q-item-label><q-item-label caption>{{ scope.opt.caption }}</q-item-label></q-item-section>
                    </q-item>
                  </template>
                </q-select>
              </td>
            </tr>
            <!-- The resource's own actions (approve, send, ...), granted like operations. -->
            <tr v-if="entry.actions.length" class="PermissionsEditor__actions-row">
              <td class="PermissionsEditor__actions-head">
                <q-icon name="mdi-gesture-tap-button" size="16px" />
                <span>Actions</span>
              </td>
              <td :colspan="OPERATIONS.length">
                <div class="PermissionsEditor__actions">
                <div
                  v-for="action in entry.actions"
                  :key="action.name"
                  class="PermissionsEditor__action PermissionsEditor__cell"
                  :class="ruleKind(entry.name, action.name)"
                >
                  <span class="PermissionsEditor__action-label">{{ action.label }}</span>
                  <q-select
                    behavior="menu"
                    :dark="dark"
                    dense
                    borderless
                    options-dense
                    :options="kinds({ conditional: true })"
                    :model-value="ruleKind(entry.name, action.name)"
                    @update:model-value="setKind(entry.name, action.name, $event)"
                    :readonly="readonly"
                    :hide-dropdown-icon="readonly"
                    :aria-label="`${entry.label}: ${action.label}`"
                    emit-value
                    map-options
                  >
                    <template v-slot:selected-item="scope">
                      <span class="PermissionsEditor__value" :class="scope.opt.value">
                        <q-icon :name="scope.opt.icon" size="16px" />{{ scope.opt.label }}
                      </span>
                    </template>
                    <template v-slot:option="scope">
                      <q-item v-bind="scope.itemProps">
                        <q-item-section avatar><q-icon :name="scope.opt.icon" size="18px" /></q-item-section>
                        <q-item-section><q-item-label>{{ scope.opt.label }}</q-item-label><q-item-label caption>{{ scope.opt.caption }}</q-item-label></q-item-section>
                      </q-item>
                    </template>
                  </q-select>
                </div>
                </div>
              </td>
            </tr>
            <!-- Per-field overrides: what this role sees and may change. -->
            <tr
              v-if="entry.fields.length && (!readonly || overrideCount(entry))"
              class="PermissionsEditor__fields-row"
            >
              <td :colspan="OPERATIONS.length + 1">
                <!-- Stays in view while the matrix scrolls sideways on a phone. -->
                <div class="PermissionsEditor__fields-panel">
                  <div class="PermissionsEditor__fields-bar">
                    <q-btn
                      flat
                      dense
                      no-caps
                      size="sm"
                      :dark="dark"
                      :icon="fieldsOpen(entry) ? 'mdi-chevron-down' : 'mdi-chevron-right'"
                      :aria-expanded="fieldsOpen(entry) ? 'true' : 'false'"
                      :aria-label="`${entry.label}: fields`"
                      @click="toggleFields(entry.name)"
                    >
                      <span class="q-ml-xs">Fields</span>
                      <q-badge
                        v-if="overrideCount(entry)"
                        rounded
                        color="primary"
                        class="q-ml-xs"
                        :label="overrideCount(entry)"
                      />
                    </q-btn>
                    <span
                      v-if="!fieldsOpen(entry)"
                      class="PermissionsEditor__fields-summary"
                      @click="toggleFields(entry.name)"
                    >
                      {{ overrideSummary(entry) || "As the app declares them" }}
                    </span>
                  </div>
                  <div v-if="fieldsOpen(entry)" class="PermissionsEditor__fields">
                    <div class="PermissionsEditor__fields-note">
                      Across a person's roles, a field is visible if any role shows it,
                      and changeable if any role lets them change it.
                    </div>
                    <div
                      v-for="item in entry.fields"
                      :key="item.name"
                      class="PermissionsEditor__field"
                    >
                      <span class="PermissionsEditor__field-label">{{ item.label }}</span>
                      <q-select
                        v-for="aspect in ASPECTS"
                        :key="aspect"
                        class="PermissionsEditor__choice"
                        :class="{ overridden: fieldChoice(entry.name, item.name, aspect) !== 'default' }"
                        behavior="menu"
                        :dark="dark"
                        dense
                        borderless
                        options-dense
                        :options="choiceOptions(item, aspect)"
                        :model-value="fieldChoice(entry.name, item.name, aspect)"
                        @update:model-value="setFieldChoice(entry.name, item.name, aspect, $event)"
                        :readonly="readonly"
                        :hide-dropdown-icon="readonly"
                        :aria-label="`${entry.label}: ${item.label} ${aspect}`"
                        emit-value
                        map-options
                      >
                        <template v-slot:selected-item="scope">
                          <span class="PermissionsEditor__value">
                            <q-icon :name="scope.opt.icon" size="16px" />{{ scope.opt.label }}
                          </span>
                        </template>
                        <template v-slot:option="scope">
                          <q-item v-bind="scope.itemProps">
                            <q-item-section avatar><q-icon :name="scope.opt.icon" size="18px" /></q-item-section>
                            <q-item-section><q-item-label>{{ scope.opt.label }}</q-item-label><q-item-label caption>{{ scope.opt.caption }}</q-item-label></q-item-section>
                          </q-item>
                        </template>
                      </q-select>
                    </div>
                  </div>
                </div>
              </td>
            </tr>
            <template v-for="operation in operationsOf(entry)" :key="entry.name + operation">
              <tr v-if="ruleKind(entry.name, operation) === 'conditional'" class="PermissionsEditor__conditions">
                <td :colspan="OPERATIONS.length + 1">
                  <div class="PermissionsEditor__condition">
                    <div class="PermissionsEditor__condition-title">
                      <q-icon name="mdi-filter-outline" size="14px" />
                      <strong>{{ entry.label }}</strong> · {{ operationLabel(entry, operation) }} is allowed when
                    </div>
    <div v-if="editableGroups(entry.name, operation)">
      <div
        v-for="(group, groupIndex) in groups(entry.name, operation)"
        :key="groupIndex"
        class="PermissionsEditor__group"
      >
        <div class="text-caption text-grey q-mb-xs">
          <span v-if="groupIndex === 0">all of these hold</span>
          <span v-else>… or all of these hold</span>
        </div>
        <div
          v-for="(condition, conditionIndex) in group"
          :key="conditionIndex"
          class="row items-center no-wrap PermissionsEditor__condition-row"
        >
          <div class="PermissionsEditor__indicator" />
          <q-select
            class="col-4"
            behavior="menu"
            :dark="dark"
            dense
            options-dense
            :label="condition.field ? '' : 'Choose a field'"
            :options="fieldOptions(entry.name)"
            :model-value="condition.field"
            @update:model-value="
              setCondition(
                entry.name,
                operation,
                groupIndex,
                conditionIndex,
                withField(entry.name, condition, $event)
              )
            "
            :readonly="readonly"
            emit-value
            map-options
          >
            <template v-slot:option="scope">
              <q-item v-bind="scope.itemProps">
                <q-item-section avatar>
                  <q-icon :name="scope.opt.icon" size="xs" />
                </q-item-section>
                <q-item-section>
                  <q-item-label>{{ scope.opt.label }}</q-item-label>
                </q-item-section>
              </q-item>
            </template>
          </q-select>
          <q-select
            class="PermissionsEditor__operator"
            behavior="menu"
            :dark="dark"
            dense
            options-dense
            :options="operatorOptions(entry.name, condition.field)"
            :model-value="condition.operator || 'exact'"
            @update:model-value="
              setCondition(
                entry.name,
                operation,
                groupIndex,
                conditionIndex,
                withOperator(condition, $event)
              )
            "
            :readonly="readonly"
            emit-value
            map-options
          >
            <template v-slot:selected-item="scope">
              <span class="PermissionsEditor__symbol">{{ scope.opt.symbol }}</span>
            </template>
            <template v-slot:option="scope">
              <q-item v-bind="scope.itemProps">
                <q-item-section avatar>
                  <span class="PermissionsEditor__symbol">{{ scope.opt.symbol }}</span>
                </q-item-section>
                <q-item-section>
                  <q-item-label>{{ scope.opt.label }}</q-item-label>
                </q-item-section>
              </q-item>
            </template>
          </q-select>
          <div class="col">
            <q-toggle
              v-if="condition.operator === 'isnull'"
              :dark="dark"
              dense
              :model-value="condition.value !== false"
              :label="condition.value !== false ? 'is empty' : 'is not empty'"
              @update:model-value="
                setCondition(entry.name, operation, groupIndex, conditionIndex, {
                  ...condition,
                  value: $event,
                })
              "
              :disable="readonly"
            />
            <q-select
              v-else-if="condition.operator === 'in'"
              :dark="dark"
              dense
              multiple
              use-chips
              use-input
              hide-dropdown-icon
              new-value-mode="add-unique"
              input-debounce="0"
              :options="[]"
              :model-value="listValue(condition.value)"
              @update:model-value="
                setCondition(entry.name, operation, groupIndex, conditionIndex, {
                  ...condition,
                  value: $event.map((item) =>
                    item === USER_ID ? item : typedValue(entry.name, condition.field, item)
                  ),
                })
              "
              :readonly="readonly"
              placeholder="Type a value and press Enter"
            >
              <template v-slot:selected-item="scope">
                <q-chip
                  removable
                  dense
                  :dark="dark"
                  :tabindex="scope.tabindex"
                  @remove="scope.removeAtIndex(scope.index)"
                  :icon="scope.opt === USER_ID ? 'mdi-account-circle-outline' : undefined"
                >
                  {{ scope.opt === USER_ID ? "the signed-in user" : scope.opt }}
                </q-chip>
              </template>
            </q-select>
            <q-select
              v-else-if="condition.value === USER_ID"
              :dark="dark"
              dense
              readonly
              :model-value="'the signed-in user'"
              :options="[]"
            >
              <template v-slot:prepend>
                <q-icon name="mdi-account-circle-outline" size="xs" />
              </template>
            </q-select>
            <q-toggle
              v-else-if="fieldType(entry.name, condition.field) === 'boolean'"
              :dark="dark"
              dense
              :model-value="condition.value === true"
              :label="condition.value === true ? 'yes' : 'no'"
              @update:model-value="
                setCondition(entry.name, operation, groupIndex, conditionIndex, {
                  ...condition,
                  value: $event,
                })
              "
              :disable="readonly"
            />
            <q-input
              v-else
              :dark="dark"
              dense
              :type="
                isNumeric(entry.name, condition.field) && condition.operator !== 'icontains'
                  ? 'number'
                  : 'text'
              "
              :model-value="condition.value === null ? '' : condition.value"
              @update:model-value="
                setCondition(entry.name, operation, groupIndex, conditionIndex, {
                  ...condition,
                  value: typedValue(entry.name, condition.field, $event),
                })
              "
              :readonly="readonly"
              placeholder="Value"
            />
          </div>
          <q-btn
            v-if="!readonly && userReferenceAllowed(condition)"
            flat
            round
            dense
            size="0.75rem"
            :dark="dark"
            :icon="
              usesUser(condition) ? 'mdi-account-circle' : 'mdi-account-circle-outline'
            "
            :color="usesUser(condition) ? 'primary' : 'grey-7'"
            @click="
              setCondition(
                entry.name,
                operation,
                groupIndex,
                conditionIndex,
                toggleUser(condition)
              )
            "
          >
            <q-tooltip>Compare with the signed-in user's id</q-tooltip>
          </q-btn>
          <q-btn
            v-if="!readonly"
            flat
            round
            dense
            icon="close"
            color="grey-7"
            @click="removeCondition(entry.name, operation, groupIndex, conditionIndex)"
          />
        </div>
        <div v-if="!readonly" class="row q-gutter-xs q-mt-xs">
          <q-btn
            flat
            dense
            no-caps
            icon="add"
            label="And"
            size="sm"
            @click="addCondition(entry.name, operation, groupIndex)"
          />
          <q-btn
            v-if="groupIndex === groups(entry.name, operation).length - 1"
            flat
            dense
            no-caps
            icon="mdi-source-branch"
            label="Or"
            size="sm"
            @click="addGroup(entry.name, operation)"
          />
        </div>
      </div>
    </div>
    <div v-else>
      <div class="text-caption text-grey q-mb-xs">
        This condition uses a form the editor cannot show; edit it as JSON.
      </div>
      <q-input
        :dark="dark"
        dense
        type="textarea"
        autogrow
        :model-value="rawJson(entry.name, operation)"
        @update:model-value="setRaw(entry.name, operation, $event)"
        :readonly="readonly"
        :error="!!rawError(entry.name, operation)"
        :error-message="rawError(entry.name, operation)"
      />
    </div>
                  </div>
                </td>
              </tr>
            </template>
          </template>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script>
import { computed, ref } from "vue";
import { useStore } from "vuex";
import {
  FIELD_CHOICES,
  FIELD_OVERRIDES,
  describeFieldOverrides,
  fieldChoice as storedChoice,
  fieldChoiceOptions,
  fieldOverrides,
  overrideCount as countOverrides,
  withFieldChoice,
} from "../utilities/permissions";

export const OPERATIONS = ["list", "read", "create", "update", "delete"];
export const USER_ID = "$user.id";
export const CONDITION_OPERATORS = [
  { value: "exact", label: "is", symbol: "=" },
  { value: "in", label: "is one of", symbol: "∋" },
  { value: "icontains", label: "contains", symbol: "≈" },
  { value: "gt", label: "is greater than", symbol: ">" },
  { value: "gte", label: "is at least", symbol: "≥" },
  { value: "lt", label: "is less than", symbol: "<" },
  { value: "lte", label: "is at most", symbol: "≤" },
  { value: "isnull", label: "is empty", symbol: "∅" },
];
const OPERATOR_NAMES = CONDITION_OPERATORS.map((operator) => operator.value);
const ASPECTS = Object.keys(FIELD_CHOICES);

// A lookup is a field name with an optional __operator suffix.
const splitLookup = (lookup) => {
  const index = lookup.lastIndexOf("__");
  if (index > 0 && OPERATOR_NAMES.indexOf(lookup.substr(index + 2)) !== -1) {
    return { field: lookup.substr(0, index), operator: lookup.substr(index + 2) };
  }
  return { field: lookup, operator: "exact" };
};
const joinLookup = ({ field, operator }) =>
  !operator || operator === "exact" ? field : `${field}__${operator}`;

const OPERATION_ICONS = {
  list: "mdi-format-list-bulleted",
  read: "mdi-eye-outline",
  create: "mdi-plus-box-outline",
  update: "mdi-pencil-outline",
  delete: "mdi-delete-outline",
};

const isPlainCondition = (value) =>
  value &&
  typeof value === "object" &&
  !Array.isArray(value) &&
  Object.keys(value).every((key) => key.substr(0, 1) !== "$");

// The editor shows a rule as groups of conditions: every condition in a group
// must hold, and any group suffices. Rules in other shapes fall back to JSON.
const toGroups = (rule) => {
  if (rule === true || rule === false || rule === null || rule === undefined) {
    return [];
  }
  const conditions = (object) =>
    Object.entries(object).map(([lookup, value]) => ({
      ...splitLookup(lookup),
      value,
    }));
  if (isPlainCondition(rule)) {
    return [conditions(rule)];
  }
  if (
    rule &&
    typeof rule === "object" &&
    Object.keys(rule).length === 1 &&
    Array.isArray(rule.$or) &&
    rule.$or.every(isPlainCondition)
  ) {
    return rule.$or.map(conditions);
  }
  return null;
};

const fromGroups = (groups) => {
  const objects = groups.map((group) =>
    group.reduce((acc, condition) => {
      if (condition.field) {
        acc[joinLookup(condition)] =
          condition.value === undefined ? null : condition.value;
      }
      return acc;
    }, {})
  );
  return objects.length === 1 ? objects[0] : { $or: objects };
};

export default {
  props: ["dark", "dense", "field", "value", "readonly"],
  emits: ["update"],
  setup(props, context) {
    const store = useStore();
    const database = store.$db();
    const Resource = database.model("_resources");
    // Rules the person is editing as JSON, kept verbatim until they parse.
    const raw = ref({});
    const rawErrors = ref({});

    const map = computed(() =>
      props.value && typeof props.value === "object" ? props.value : {}
    );
    const resources = computed(() => {
      const offered = (props.field && props.field.resources) || {};
      return Object.entries(offered)
        .map(([name, meta]) => {
          const resource = Resource.find(name);
          const declared =
            meta && meta.fields && typeof meta.fields === "object" && !Array.isArray(meta.fields)
              ? meta.fields
              : {};
          return {
            name,
            label: (meta && meta.label) || (resource && resource.label) || name,
            conditional: !!(meta && meta.conditional),
            // An action is never named like the field overrides beside it.
            actions: ((meta && Array.isArray(meta.actions) && meta.actions) || []).filter(
              (action) => action && action.name !== FIELD_OVERRIDES
            ),
            // Fields a role may show, hide, open or lock; older runtimes send none.
            fields: Object.entries(declared)
              .map(([field, info]) => ({
                name: field,
                label: (info && info.label) || field,
                read_only: !!(info && info.read_only),
                write_only: !!(info && info.write_only),
              }))
              .sort((a, b) => a.label.localeCompare(b.label)),
            labels: declared,
            icon: resource && resource.icon ? `mdi-${resource.icon}` : "mdi-table",
          };
        })
        .sort((a, b) => a.label.localeCompare(b.label));
    });
    const rule = (name, operation) =>
      map.value[name] ? map.value[name][operation] : undefined;
    const ruleKind = (name, operation) => {
      const value = rule(name, operation);
      if (value === true) {
        return "allowed";
      }
      if (value && typeof value === "object") {
        return "conditional";
      }
      return "denied";
    };
    // The operations and actions a role may be granted on a resource.
    const operationsOf = (entry) => [
      ...OPERATIONS,
      ...entry.actions.map((action) => action.name),
    ];
    const operationLabel = (entry, operation) => {
      const action = entry.actions.find((item) => item.name === operation);
      return action ? action.label : operation;
    };
    const granted = (entry) =>
      operationsOf(entry).filter(
        (operation) => ruleKind(entry.name, operation) !== "denied"
      );
    const kinds = (entry) => {
      const options = [
        { label: "Denied", value: "denied", icon: "mdi-minus-circle-outline", caption: "This role adds no access" },
        { label: "Allowed", value: "allowed", icon: "mdi-check-circle-outline", caption: "Every record" },
      ];
      if (entry.conditional) {
        options.push({ label: "When…", value: "conditional", icon: "mdi-filter-outline", caption: "Only records that meet conditions" });
      }
      return options;
    };
    const emit = (next) => {
      // Drop resources that grant and override nothing so the stored map stays small.
      const cleaned = {};
      Object.entries(next).forEach(([name, rules]) => {
        const kept = {};
        Object.entries(rules || {}).forEach(([operation, value]) => {
          if (operation === FIELD_OVERRIDES) {
            if (value && typeof value === "object" && Object.keys(value).length) {
              kept[operation] = value;
            }
          } else if (value === true || (value && typeof value === "object")) {
            kept[operation] = value;
          }
        });
        if (Object.keys(kept).length) {
          cleaned[name] = kept;
        }
      });
      context.emit("update", cleaned);
    };
    const setRule = (name, operation, value) => {
      const next = { ...map.value, [name]: { ...(map.value[name] || {}) } };
      if (value === undefined) {
        delete next[name][operation];
      } else {
        next[name][operation] = value;
      }
      emit(next);
    };
    const setKind = (name, operation, kind) => {
      if (kind === "allowed") {
        setRule(name, operation, true);
      } else if (kind === "conditional") {
        setRule(name, operation, { [defaultField(name)]: null });
      } else {
        setRule(name, operation, undefined);
      }
    };
    const fieldOptions = (name) => {
      const resource = Resource.find(name);
      if (!resource) {
        return [];
      }
      return Object.values(resource.fields)
        .filter((field) => field.ui !== false && !field.hidden)
        .map((field) => ({
          value: field.name,
          label: field.label || field.name,
          icon: resource.getFieldIcon(field.name, "mdi-form-textbox"),
        }))
        .sort((a, b) => a.label.localeCompare(b.label));
    };
    const defaultField = (name) => {
      const options = fieldOptions(name);
      return options.length ? options[0].value : "id";
    };
    // Changing the field keeps the operator when the new field supports it.
    const withField = (name, condition, field) => {
      const allowed = operatorOptions(name, field).map((option) => option.value);
      const operator = allowed.indexOf(condition.operator || "exact") !== -1 ? condition.operator : "exact";
      return withOperator({ ...condition, field }, operator || "exact");
    };
    const fieldType = (name, field) => {
      const resource = Resource.find(name);
      const meta = resource && field ? resource.fields[field] : null;
      return meta ? meta.type : "string";
    };
    const isNumeric = (name, field) =>
      ["number", "integer", "decimal"].indexOf(fieldType(name, field)) !== -1;
    const typedValue = (name, field, input) => {
      if (input === "" || input === null || input === undefined) {
        return null;
      }
      if (isNumeric(name, field)) {
        const number = Number(input);
        return Number.isNaN(number) ? input : number;
      }
      return input;
    };
    const operatorOptions = (name, field) => {
      const type = fieldType(name, field);
      return CONDITION_OPERATORS.filter((operator) => {
        if (type === "boolean") {
          return ["exact", "isnull"].indexOf(operator.value) !== -1;
        }
        if (isNumeric(name, field)) {
          return operator.value !== "icontains";
        }
        return true;
      });
    };
    const listValue = (value) =>
      Array.isArray(value) ? value : value === null || value === undefined ? [] : [value];
    // Keep what carries over when the operator changes: a list becomes its
    // first value and back, and emptiness tests start as "is empty".
    const withOperator = (condition, operator) => {
      let value = condition.value;
      if (operator === "isnull") {
        value = true;
      } else if (operator === "in") {
        value = listValue(condition.operator === "isnull" ? null : value);
      } else if (condition.operator === "in") {
        value = listValue(value)[0] === undefined ? null : listValue(value)[0];
      } else if (condition.operator === "isnull") {
        value = null;
      }
      return { ...condition, operator, value };
    };
    const userReferenceAllowed = (condition) =>
      ["exact", "in"].indexOf(condition.operator || "exact") !== -1;
    const usesUser = (condition) =>
      condition.operator === "in"
        ? listValue(condition.value).indexOf(USER_ID) !== -1
        : condition.value === USER_ID;
    const toggleUser = (condition) => {
      if (condition.operator === "in") {
        const items = listValue(condition.value);
        return {
          ...condition,
          value: usesUser(condition)
            ? items.filter((item) => item !== USER_ID)
            : [...items, USER_ID],
        };
      }
      return { ...condition, value: usesUser(condition) ? null : USER_ID };
    };
    const groups = (name, operation) => toGroups(rule(name, operation)) || [];
    const editableGroups = (name, operation) =>
      !raw.value[`${name}.${operation}`] &&
      toGroups(rule(name, operation)) !== null;
    const setGroups = (name, operation, next) => {
      const kept = next.filter((group) => group.length);
      setRule(
        name,
        operation,
        kept.length ? fromGroups(kept) : { [defaultField(name)]: null }
      );
    };
    const setCondition = (name, operation, groupIndex, conditionIndex, condition) => {
      const next = groups(name, operation).map((group) => group.slice());
      next[groupIndex][conditionIndex] = condition;
      setGroups(name, operation, next);
    };
    const addCondition = (name, operation, groupIndex) => {
      const next = groups(name, operation).map((group) => group.slice());
      next[groupIndex].push({ field: null, value: null });
      setGroups(name, operation, next);
    };
    const removeCondition = (name, operation, groupIndex, conditionIndex) => {
      const next = groups(name, operation).map((group) => group.slice());
      next[groupIndex].splice(conditionIndex, 1);
      setGroups(name, operation, next);
    };
    const addGroup = (name, operation) => {
      const next = groups(name, operation).map((group) => group.slice());
      next.push([{ field: null, value: null }]);
      setGroups(name, operation, next);
    };
    const rawJson = (name, operation) => {
      const key = `${name}.${operation}`;
      if (typeof raw.value[key] === "string") {
        return raw.value[key];
      }
      return JSON.stringify(rule(name, operation), null, 2);
    };
    const rawError = (name, operation) => rawErrors.value[`${name}.${operation}`] || null;
    const setRaw = (name, operation, text) => {
      const key = `${name}.${operation}`;
      raw.value = { ...raw.value, [key]: text };
      try {
        const parsed = JSON.parse(text);
        if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
          throw new Error("A condition must be a JSON object.");
        }
        rawErrors.value = { ...rawErrors.value, [key]: null };
        setRule(name, operation, parsed);
      } catch (error) {
        rawErrors.value = { ...rawErrors.value, [key]: error.message };
      }
    };
    // Which resources show their field overrides; one with overrides starts open.
    const open = ref({});
    const fieldsOpen = (entry) =>
      open.value[entry.name] === undefined
        ? countOverrides(map.value[entry.name]) > 0 && !props.readonly
        : open.value[entry.name];
    const toggleFields = (name) => {
      const entry = resources.value.find((item) => item.name === name);
      open.value = { ...open.value, [name]: !(entry && fieldsOpen(entry)) };
    };
    const overrideCount = (entry) => countOverrides(map.value[entry.name]);
    const overrideSummary = (entry) =>
      describeFieldOverrides(map.value[entry.name], entry.labels);
    const fieldChoice = (name, field, aspect) =>
      storedChoice(fieldOverrides(map.value[name]), field, aspect);
    const choiceOptions = (item, aspect) => fieldChoiceOptions(item, aspect);
    const setFieldChoice = (name, field, aspect, choice) => {
      const overrides = withFieldChoice(
        fieldOverrides(map.value[name]),
        field,
        aspect,
        choice
      );
      setRule(name, FIELD_OVERRIDES, Object.keys(overrides).length ? overrides : undefined);
    };
    return {
      OPERATIONS,
      ASPECTS,
      USER_ID,
      resources,
      fieldsOpen,
      toggleFields,
      overrideCount,
      overrideSummary,
      fieldChoice,
      choiceOptions,
      setFieldChoice,
      granted,
      operationsOf,
      operationLabel,
      ruleKind,
      kinds,
      setKind,
      operationIcon: (operation) => OPERATION_ICONS[operation],
      fieldOptions,
      withField,
      fieldType,
      isNumeric,
      typedValue,
      operatorOptions,
      listValue,
      withOperator,
      userReferenceAllowed,
      usesUser,
      toggleUser,
      groups,
      editableGroups,
      setCondition,
      addCondition,
      removeCondition,
      addGroup,
      rawJson,
      rawError,
      setRaw,
    };
  },
};
</script>

<style lang="scss">
.PermissionsEditor {
  width: 100%;
  // Sizes the fields panel to the editor's visible width.
  container-type: inline-size;
  // The detail view enlarges values for the focused field; a matrix reads at one size.
  font-size: 13px;
  line-height: 1.4;
  .PermissionsEditor__scroll {
    overflow-x: auto;
  }
  .PermissionsEditor__table {
    width: 100%;
    min-width: 640px;
    border-collapse: collapse;
    th, td {
      text-align: left;
      padding: 6px 8px;
      border-bottom: 1px solid rgba(128, 160, 144, 0.22);
      vertical-align: middle;
      font-size: 13px;
    }
    th {
      font-weight: 500;
      font-size: 11px;
      text-transform: capitalize;
      opacity: 0.75;
      white-space: nowrap;
    }
    th:not(.PermissionsEditor__resource-head) {
      width: 112px;
    }
  }
  .PermissionsEditor__resource-name {
    display: inline-flex;
    align-items: center;
    gap: 10px;
    font-weight: 500;
    white-space: nowrap;
  }
  .PermissionsEditor__row:not(.granted) .PermissionsEditor__resource {
    opacity: 0.75;
  }
  .PermissionsEditor__cell {
    padding-top: 0;
    padding-bottom: 0;
    .q-field {
      font-size: 13px;
    }
    .q-field__native, .q-field__control {
      min-height: 34px;
    }
    &.denied .PermissionsEditor__value {
      opacity: 0.55;
    }
    &.allowed .PermissionsEditor__value {
      color: var(--q-primary);
    }
    &.conditional .PermissionsEditor__value {
      color: var(--q-secondary);
    }
  }
  .PermissionsEditor__actions-row td {
    border-bottom-style: dashed;
  }
  .PermissionsEditor__actions-head {
    padding-left: 36px !important;
    font-size: 12px;
    opacity: 0.8;
    white-space: nowrap;
    .q-icon {
      margin-right: 6px;
    }
  }
  .PermissionsEditor__actions {
    display: flex;
    flex-wrap: wrap;
    gap: 4px 20px;
  }
  .PermissionsEditor__action {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 0;
    border: 0;
  }
  .PermissionsEditor__action-label {
    font-size: 12px;
    font-weight: 500;
    white-space: nowrap;
  }
  .PermissionsEditor__fields-row td {
    padding: 2px 8px 6px 28px;
    border-bottom-style: dashed;
  }
  .PermissionsEditor__fields-panel {
    position: sticky;
    left: 0;
    max-width: calc(100vw - 96px);
    // The visible width less the row's padding.
    max-width: calc(100cqw - 36px);
  }
  .PermissionsEditor__fields-bar {
    display: flex;
    align-items: center;
    gap: 8px;
    min-width: 0;
    .q-btn {
      font-size: 12px;
      opacity: 0.85;
      flex: none;
    }
  }
  .PermissionsEditor__fields-summary {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 12px;
    opacity: 0.7;
    cursor: pointer;
  }
  .PermissionsEditor__fields {
    padding: 2px 0 4px 8px;
  }
  .PermissionsEditor__fields-note {
    font-size: 12px;
    opacity: 0.7;
    margin-bottom: 6px;
  }
  .PermissionsEditor__field {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0 16px;
    border-bottom: 1px solid rgba(128, 160, 144, 0.12);
    &:last-child {
      border-bottom: 0;
    }
  }
  .PermissionsEditor__field-label {
    flex: 1 1 140px;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-weight: 500;
  }
  .PermissionsEditor__choice {
    flex: 0 0 168px;
    .q-field__native,
    .q-field__control {
      min-height: 32px;
    }
    .PermissionsEditor__value {
      opacity: 0.6;
    }
    &.overridden .PermissionsEditor__value {
      opacity: 1;
      color: var(--q-primary);
    }
  }
  // On a phone each field's name sits above its two choices.
  @media (max-width: 599px) {
    .PermissionsEditor__field {
      padding-top: 4px;
    }
    .PermissionsEditor__field-label {
      flex-basis: 100%;
    }
    .PermissionsEditor__choice {
      flex: 1 1 120px;
    }
  }
  .PermissionsEditor__value {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    white-space: nowrap;
  }
  .PermissionsEditor__conditions td {
    padding: 8px 8px 12px 24px;
    background: rgba(128, 160, 144, 0.06);
  }
  .PermissionsEditor__condition-title {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 12px;
    margin-bottom: 8px;
    opacity: 0.85;
  }
  .PermissionsEditor__group {
    margin-bottom: 8px;
  }
  .PermissionsEditor__condition-row {
    position: relative;
    padding-left: 10px;
    margin-bottom: 3px;
    .PermissionsEditor__indicator {
      position: absolute;
      left: 0px;
      top: 8px;
      bottom: 8px;
      width: 1px;
      background-color: $grey-7;
    }
  }
  .PermissionsEditor__operator {
    width: 64px;
    margin: 0 8px;
  }
  .PermissionsEditor__symbol {
    display: inline-block;
    min-width: 24px;
    text-align: center;
    font-size: 1.1em;
  }
}
</style>
