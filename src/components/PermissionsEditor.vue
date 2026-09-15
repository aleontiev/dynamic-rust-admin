<template>
  <div :class="{ PermissionsEditor: true, dark: dark, readonly: readonly }">
    <div v-if="!resources.length" class="text-grey q-pa-sm">
      No resources accept rules yet.
    </div>
    <q-list v-else separator>
      <q-expansion-item
        v-for="entry in resources"
        :key="entry.name"
        :dark="dark"
        :dense="dense"
        expand-separator
        :default-opened="granted(entry.name).length > 0"
        header-class="PermissionsEditor__header"
      >
        <template v-slot:header>
          <q-item-section avatar>
            <q-icon
              :name="entry.icon"
              :color="granted(entry.name).length ? 'primary' : 'grey-6'"
            />
          </q-item-section>
          <q-item-section>
            <q-item-label>{{ entry.label }}</q-item-label>
            <q-item-label caption>
              <span v-if="!granted(entry.name).length">No access</span>
              <span v-else>
                <q-chip
                  v-for="operation in granted(entry.name)"
                  :key="operation"
                  dense
                  size="sm"
                  :dark="dark"
                  :color="
                    ruleKind(entry.name, operation) === 'conditional'
                      ? 'secondary'
                      : 'primary'
                  "
                  text-color="white"
                  :icon="
                    ruleKind(entry.name, operation) === 'conditional'
                      ? 'mdi-filter-outline'
                      : undefined
                  "
                  >{{ operation }}</q-chip
                >
              </span>
            </q-item-label>
          </q-item-section>
        </template>
        <div
          v-for="operation in OPERATIONS"
          :key="operation"
          class="PermissionsEditor__operation"
        >
          <div class="row items-center no-wrap">
            <div class="PermissionsEditor__name">
              <q-icon :name="operationIcon(operation)" size="xs" class="q-mr-xs" />
              {{ operation }}
            </div>
            <q-btn-toggle
              :model-value="ruleKind(entry.name, operation)"
              @update:model-value="setKind(entry.name, operation, $event)"
              :options="kinds(entry)"
              :dark="dark"
              dense
              flat
              no-caps
              toggle-color="primary"
              :readonly="readonly"
              :disable="readonly"
            />
          </div>
          <div
            v-if="ruleKind(entry.name, operation) === 'conditional'"
            class="PermissionsEditor__condition"
          >
            <div v-if="editableGroups(entry.name, operation)">
              <div
                v-for="(group, groupIndex) in groups(entry.name, operation)"
                :key="groupIndex"
                class="PermissionsEditor__group"
              >
                <div class="text-caption text-grey q-mb-xs">
                  <span v-if="groupIndex === 0">Allowed when all of these hold</span>
                  <span v-else>… or when all of these hold</span>
                </div>
                <div
                  v-for="(condition, conditionIndex) in group"
                  :key="conditionIndex"
                  class="row items-center no-wrap PermissionsEditor__row"
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
                    :model-value="fieldOption(entry.name, condition.field)"
                    @update:model-value="
                      setCondition(entry.name, operation, groupIndex, conditionIndex, {
                        field: $event ? $event.value : null,
                        value: condition.value,
                      })
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
                  <span class="PermissionsEditor__equals">=</span>
                  <div class="col">
                    <q-select
                      v-if="condition.value === USER_ID"
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
                          field: condition.field,
                          value: $event,
                        })
                      "
                      :disable="readonly"
                    />
                    <q-input
                      v-else
                      :dark="dark"
                      dense
                      :type="isNumeric(entry.name, condition.field) ? 'number' : 'text'"
                      :model-value="condition.value === null ? '' : condition.value"
                      @update:model-value="
                        setCondition(entry.name, operation, groupIndex, conditionIndex, {
                          field: condition.field,
                          value: typedValue(entry.name, condition.field, $event),
                        })
                      "
                      :readonly="readonly"
                      placeholder="Value"
                    />
                  </div>
                  <q-btn
                    v-if="!readonly"
                    flat
                    round
                    dense
                    size="0.75rem"
                    :dark="dark"
                    :icon="
                      condition.value === USER_ID ? 'mdi-account-circle' : 'mdi-account-circle-outline'
                    "
                    :color="condition.value === USER_ID ? 'primary' : 'grey-7'"
                    @click="
                      setCondition(entry.name, operation, groupIndex, conditionIndex, {
                        field: condition.field,
                        value: condition.value === USER_ID ? null : USER_ID,
                      })
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
        </div>
      </q-expansion-item>
    </q-list>
  </div>
</template>

<script>
import { computed, ref } from "vue";
import { useStore } from "vuex";

export const OPERATIONS = ["list", "read", "create", "update", "delete"];
export const USER_ID = "$user.id";

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
  if (isPlainCondition(rule)) {
    return [
      Object.entries(rule).map(([field, value]) => ({ field, value })),
    ];
  }
  if (
    rule &&
    typeof rule === "object" &&
    Object.keys(rule).length === 1 &&
    Array.isArray(rule.$or) &&
    rule.$or.every(isPlainCondition)
  ) {
    return rule.$or.map((group) =>
      Object.entries(group).map(([field, value]) => ({ field, value }))
    );
  }
  return null;
};

const fromGroups = (groups) => {
  const objects = groups.map((group) =>
    group.reduce((acc, { field, value }) => {
      if (field) {
        acc[field] = value === undefined ? null : value;
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
          return {
            name,
            label: (meta && meta.label) || (resource && resource.label) || name,
            conditional: !!(meta && meta.conditional),
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
    const granted = (name) =>
      OPERATIONS.filter((operation) => ruleKind(name, operation) !== "denied");
    const kinds = (entry) => {
      const options = [
        { label: "Denied", value: "denied" },
        { label: "Allowed", value: "allowed" },
      ];
      if (entry.conditional) {
        options.push({ label: "When…", value: "conditional" });
      }
      return options;
    };
    const emit = (next) => {
      // Drop resources that grant nothing so the stored map stays small.
      const cleaned = {};
      Object.entries(next).forEach(([name, rules]) => {
        const kept = {};
        Object.entries(rules || {}).forEach(([operation, value]) => {
          if (value === true || (value && typeof value === "object")) {
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
    const fieldOption = (name, field) =>
      fieldOptions(name).find((option) => option.value === field) || null;
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
    return {
      OPERATIONS,
      USER_ID,
      resources,
      granted,
      ruleKind,
      kinds,
      setKind,
      operationIcon: (operation) => OPERATION_ICONS[operation],
      fieldOptions,
      fieldOption,
      fieldType,
      isNumeric,
      typedValue,
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
  .PermissionsEditor__operation {
    padding: 4px 8px 4px 16px;
  }
  .PermissionsEditor__name {
    width: 90px;
    text-transform: capitalize;
    display: flex;
    align-items: center;
  }
  .PermissionsEditor__condition {
    margin: 4px 0 8px 90px;
  }
  .PermissionsEditor__group {
    margin-bottom: 8px;
  }
  .PermissionsEditor__row {
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
  .PermissionsEditor__equals {
    padding: 0 8px;
    color: $grey-7;
  }
  .q-chip {
    margin: 0 4px 0 0;
  }
}
</style>
