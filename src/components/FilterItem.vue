<style lang="scss">
.Filter {
  &.changed .Filter__indicator {
    background-color: var(--q-primary);
    width: 2px;
  }
  .Filter__indicator {
    position: absolute;
    left: 0px;
    top: 8px;
    bottom: 8px;
    width: 1px;
    background-color: $grey-7;
  }
  padding-left: 10px;
  padding-right: 0px;
  margin-bottom: 3px;

  .Filter__parts div {
    padding-right: 5px;
  }
  .Filter__parts div:last-child {
    margin-right: 0px;
  }
  &.dense .q-item__section--main ~ .q-item__section--side {
    padding-left: 4px;
  }
  .q-field .q-field__native {
    white-space: nowrap;
  }
}
</style>
<template>
  <q-item :class="{ Filter: true, dense: dense, changed: changed }">
    <div class="Filter__indicator" />
    <div class="column full-width no-wrap">
      <div class="row full-width">
        <q-item-section>
          <div class="row Filter__parts">
            <div :class="f.class" :key="index" v-for="(f, index) in filters">
              <q-select
                behavior="menu"
                :dense="dense"
                :dark="dark"
                :label="f.key ? '' : 'Choose a field'"
                :options="getFilteredOptions(index)"
                :model-value="values[index]"
                @update:model-value="onKeyUpdate(index, $event)"
                :readonly="!editable"
                use-input
                input-debounce="0"
                @filter="(val, update) => onFilterOptions(index, val, update)"
              >
                <template v-slot:selected-item="scope">
                  <span style="white-space: nowrap">
                    <q-icon
                      v-if="scope.opt.value === 'Previous'"
                      name="mdi-history"
                      size="xs"
                      class="q-mr-xs q-mb-xs"
                    />
                    <q-icon
                      v-else-if="scope.opt.value === '$count'"
                      name="mdi-counter"
                      size="xs"
                      class="q-mr-xs q-mb-xs"
                    />
                    <q-icon
                      v-else-if="
                        f.resource && f.resource.getFieldIcon(scope.opt.value)
                      "
                      :name="f.resource.getFieldIcon(scope.opt.value)"
                      size="xs"
                      class="q-mr-xs q-mb-xs"
                    />
                    <span
                      class="text-h7 q-mr-sm q-mb-xs w-30px text-center"
                      v-else-if="getOperatorSymbol(scope.opt.value)"
                      >{{ getOperatorSymbol(scope.opt.value) }}</span
                    >
                    <q-icon
                      size="sm"
                      v-else
                      :name="getOperatorIcon(scope.opt.value)"
                    />
                    <span>{{ scope.opt.label }}</span>
                  </span>
                </template>
                <template v-slot:option="scope">
                  <q-item v-bind="scope.itemProps">
                    <q-item-section avatar>
                      <q-icon
                        v-if="scope.opt.value === 'Previous'"
                        name="mdi-history"
                        size="xs"
                        class="q-mr-xs q-mb-xs"
                      />
                      <q-icon
                        v-else-if="scope.opt.value === '$count'"
                        name="mdi-counter"
                        size="xs"
                        class="q-mr-xs q-mb-xs"
                      />
                      <q-icon
                        v-else-if="
                          f.resource && f.resource.getFieldIcon(scope.opt.value)
                        "
                        :name="f.resource.getFieldIcon(scope.opt.value)"
                      />
                      <span
                        class="text-h5 q-mr-xs q-mb-xs w-30px text-center"
                        v-else-if="getOperatorSymbol(scope.opt.value)"
                        >{{ getOperatorSymbol(scope.opt.value) }}</span
                      >
                      <q-icon
                        size="sm"
                        v-else
                        :name="getOperatorIcon(scope.opt.value)"
                      />
                    </q-item-section>
                    <q-item-section>
                      <q-item-label>{{ scope.opt.label }}</q-item-label>
                    </q-item-section>
                  </q-item>
                </template>
              </q-select>
            </div>
          </div>
        </q-item-section>
        <q-item-section side class="q-pl-none">
          <q-btn
            v-if="editable"
            flat
            round
            icon="close"
            @click="$emit('delete')"
            :color="changed ? 'primary' : 'grey-7'"
          />
        </q-item-section>
      </div>
      <div v-if="hasInput" class="row full-width">
        <q-item-section>
          <FilterReflexiveInput
            v-if="reflexive"
            :value="filterValue"
            @update="onValueUpdate"
            :resource="resource"
            :dark="dark"
            :dense="dense"
            :editable="editable"
          />
          <FilterInput
            v-else
            :editable="editable"
            :dark="dark"
            :dense="dense"
            :operator="operator"
            :field="operator.field || filterField"
            :resource="filterResource"
            :value="filterValue"
            @update="onValueUpdate"
          />
        </q-item-section>
        <q-item-section side v-if="editable">
          <FilterReflexiveToggle
            :value="reflexive"
            @update="onToggleReflexive"
            :dark="dark"
            :dense="dense"
          />
        </q-item-section>
      </div>
    </div>
  </q-item>
</template>

<script>
import { computed, ref } from "vue";
import FilterInput from "./FilterInput";
import FilterReflexiveToggle from "./FilterReflexiveToggle";
import FilterReflexiveInput from "./FilterReflexiveInput";
import { OPERATORS, OPERATOR_MAP, operatorMatches } from "../models/resource";
import { makeOptions } from "../utilities";
export default {
  props: [
    "dark",
    "dense",
    "resource",
    "value",
    "original",
    "editable",
    "hasPrevious",
  ],
  emits: ["update", "delete"],
  components: {
    FilterInput,
    FilterReflexiveToggle,
    FilterReflexiveInput,
  },
  setup(props, context) {
    const operators = OPERATORS.map((x) => x.name);
    const changed = computed(
      () => JSON.stringify(props.value) !== JSON.stringify(props.original)
    );
    const operatorMap = OPERATOR_MAP;
    const operatorOptions = makeOptions(OPERATORS);
    const filterKey = computed(() => {
      const $value = props.value;
      if (!$value) {
        return null;
      }
      return Object.keys(props.value)[0] || null;
    });
    const filterValue = computed(() => {
      if (filterKey.value) {
        return props.value[filterKey.value];
      }
      return undefined;
    });
    const filterParts = computed(() =>
      filterKey.value ? filterKey.value.split(".") : [null]
    );
    const filters = computed(() => {
      let $resource = props.resource;
      const $parts = filterParts.value;
      const result = $parts.map((part, index) => {
        let $previous = $resource;
        let field = null;
        if (part === "$count") {
          field = { type: "number", id: "$count" };
        } else if (part !== "Previous") {
          if ($resource) {
            field = $resource.fields[part];
            try {
              $resource = $resource.getRelationFromField(part);
            } catch (error) {
              $resource = null;
            }
          }
        }
        let className;
        className = $parts.length > 2 ? "col-6" : "col";
        if (index === $parts.length - 1 && $parts.length % 2) {
          className = "col-12";
        }
        return { class: className, key: part, resource: $previous, field };
      });
      return result;
    });
    const options = computed(() => {
      const result = [];
      const parts = filterParts.value;
      let $field = null;
      let $resource = props.resource;
      parts.forEach((part, index) => {
        let partOptions = [];
        if (index === 0 && props.hasPrevious) {
          partOptions = [
            {
              value: "Previous",
              id: "Previous",
              label: "Previous",
              icon: "mdi-history",
            },
          ];
        }
        if ($resource && $field) {
          partOptions.push({
            value: "$count",
            id: "$count",
            label: "Count",
            icon: "mdi-counter",
          });
        }
        if (index > 0 && $field) {
          // add operators
          let availableOperators = operatorOptions.filter((option) =>
            operatorMatches(option, $field)
          );

          partOptions.push(...availableOperators);
        }
        if ($resource) {
          if (index === 1 && parts[0] && $resource.isJSONField(parts[0])) {
            const jsonKeys = $resource.getJSONFieldOptions(parts[0]);
            partOptions.push(...jsonKeys);
          } else {
            partOptions.push(
              ...makeOptions(
                $resource.getFields({ filterable: true }, ["name_field", "name"])
              )
            );
          }
        }
        result.push(partOptions);
        if (part === "$count") {
          $field = { id: "$count", type: "number" };
          $resource = null;
        } else if (part && part[0] !== "$") {
          // get next $field / $resource
          if (part !== "Previous") {
            if (index === 1 && parts[0] && $resource.isJSONField(parts[0])) {
              $field = {
                name: `${parts[0]}.${part}`,
                type: "string",
                isJSONField: true,
                baseField: parts[0],
                jsonKey: part,
              };
              $resource = null;
            } else {
              $field = $resource.fields[part];
              if ($field && $resource.isJSONField(part)) {
                $field = { ...$field, isJSONField: true };
              }
              try {
                $resource = $resource.getRelationFromField(part);
              } catch (error) {
                $resource = null;
              }
            }
          }
        }
      });
      return result;
    });
    const pickOption = (options, name) => {
      let result = null;
      options.forEach((option) => {
        if (!result && option.value === name) {
          result = option;
        }
      });
      return result;
    };

    const removeStar = (x) => (x ? x.replace("*", "") : x);
    const values = computed(() =>
      options.value.map((filterOptions, index) =>
        pickOption(filterOptions, removeStar(filterParts.value[index]))
      )
    );
    const onKeyUpdate = (index, update) => {
      const $update = update.label && update.value ? update.value : update;
      let parts = [...filterParts.value];
      parts[index] = $update;
      let len = parts.length;
      let $value = filterValue.value;
      $value = null;
      if (index < len - 1) {
        // remove anything that used to follow
        parts = parts.slice(0, index + 1);
        len = parts.length;
      }
      if (len && parts[len - 1].length) {
        if (parts[len - 1][0] !== "$") {
          // Check if this is a JSON field key selection
          if (index === 1 && parts[0] && props.resource.isJSONField(parts[0])) {
            // Create JSON path for the selected key
            const jsonPath = `${parts[0]}.${parts[1]}`;
            parts = [jsonPath];
            len = 1;
          } else {
            // if there is no operator, add a default
            parts.push("$notnull");
            $value = null;
          }
        } else if (parts[len - 1] === "$count") {
          parts.push("$gt");
          $value = 0;
        } else if (parts[len - 1] === "$path_eq") {
          $value = { path: "", value: "" };
        }
      }

      const newValue = { [parts.join(".")]: $value };
      context.emit("update", newValue);
    };
    const onValueUpdate = (update) => {
      const $update = update;
      const newValue = { [filterKey.value]: $update };
      context.emit("update", newValue);
    };
    const hasInput = computed(() => {
      const op = operator.value;
      if (op) {
        // none-type operators have no field
        return op.type !== "none";
      }
      return false;
    });
    const reflexive = computed(() => {
      const $parts = filterParts.value;
      const last = $parts[$parts.length - 1];
      return last && last.substr(last.length - 1) === "*";
    });
    const operator = computed(() => {
      const $parts = filterParts.value;
      let last = $parts[$parts.length - 1];
      let field = null;
      if ($parts.filter((p) => p === "$count").length) {
        field = { type: "number", label: "Count" };
      }
      if (reflexive.value) {
        last = last.substr(0, last.length - 1);
      }

      // Get the field information to determine if it's a JSON field
      if (!field) {
        const fieldInfo = getInputField(props.resource, $parts);
        if (fieldInfo && fieldInfo.field) {
          field = fieldInfo.field;
        }
      }

      if (field) {
        // Use operator's field if it exists, otherwise use the resource field
        const operatorField = operatorMap[last]?.field;
        return {
          ...operatorMap[last],
          field: operatorField || field,
        };
      }
      return operatorMap[last];
    });
    const filterField = computed(() =>
      filterResourceField.value ? filterResourceField.value.field : null
    );
    const filterResource = computed(() =>
      filterResourceField.value ? filterResourceField.value.resource : null
    );
    const filterResourceField = computed(() =>
      getInputField(props.resource, filterParts.value)
    );
    const getInputField = (resource, parts) => {
      if (parts.filter((p) => p === "$count").length) {
        return null;
      }
      const $parts = parts.filter((p) => p !== "Previous" && p !== "$count");
      const fieldPath = $parts.slice(0, $parts.length - 1).join(".");

      // Check if this is a JSON field
      const baseFieldName = fieldPath.split(".")[0];
      if (resource.isJSONField(baseFieldName)) {
        // Handle JSON field
        return resource.getJSONField(fieldPath, { withResource: true });
      }

      // Get the field normally
      const result = resource.getField(fieldPath, {
        withResource: true,
      });

      return result;
    };

    const getOperatorSymbol = (op) => operatorMap[op].symbol;
    const getOperatorIcon = (op) => operatorMap[op].icon;
    const onToggleReflexive = () => {
      const WILDCARD = "*";
      const key = filterKey.value;
      const keyParts = key.split(".");
      const newParts = keyParts.slice(0, keyParts.length - 1);
      const lastPart = keyParts[keyParts.length - 1];
      const lastChar = lastPart.substr(lastPart.length - 1);
      if (lastChar === WILDCARD) {
        // remove reflexive
        newParts.push(lastPart.replace(lastChar, ""));
      } else {
        // add reflexive *
        newParts.push(`${lastPart}${WILDCARD}`);
      }
      // set value to null whenever reflexive changes
      const newValue = { [newParts.join(".")]: null };
      context.emit("update", newValue);
    };
    const filteredOptions = ref({});
    const onFilterOptions = (index, val, update) => {
      update(() => {
        const needle = (val || "").toLowerCase();
        if (!needle) {
          filteredOptions.value = { ...filteredOptions.value, [index]: null };
        } else {
          filteredOptions.value = {
            ...filteredOptions.value,
            [index]: options.value[index].filter(
              (opt) => opt.label.toLowerCase().indexOf(needle) >= 0
            ),
          };
        }
      });
    };
    const getFilteredOptions = (index) => {
      return filteredOptions.value[index] || options.value[index];
    };
    return {
      filterKey,
      filterValue,
      filterParts,
      filters,
      filterField,
      filterResource,
      options,
      operator,
      onKeyUpdate,
      onValueUpdate,
      values,
      changed,
      hasInput,
      reflexive,
      onToggleReflexive,
      getOperatorSymbol,
      getOperatorIcon,
      onFilterOptions,
      getFilteredOptions,
    };
  },
};
</script>
