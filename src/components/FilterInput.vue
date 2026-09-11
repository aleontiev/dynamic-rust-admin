<style lang="scss"></style>
<template>
  <div class="FilterInput full-width">
    <div class="FilterInput__content">
      <div class="row" v-if="operator.length === 2">
        <!-- range: 2 x (string, time, date, datetime, decimal, integer) -->
        <div class="col q-mr-sm">
          <div
            v-if="
              field.type === 'number' ||
              field.type === 'decimal' ||
              field.type === 'integer'
            "
          >
            <q-input
              v-model="inner1"
              type="number"
              placeholder="Enter a number"
              :readonly="!editable"
            />
          </div>
          <div
            v-else-if="
              field.type === 'date' ||
              field.type === 'datetime' ||
              field.type === 'time'
            "
          >
            <q-input v-model="inner1" :mask="inputMask" :readonly="!editable">
              <template v-slot:prepend>
                <q-icon
                  name="event"
                  class="cursor-pointer"
                  v-if="field.type === 'date' || field.type === 'datetime'"
                  size="xs"
                >
                  <q-popup-proxy
                    cover
                    transition-show="scale"
                    transition-hide="scale"
                  >
                    <q-date
                      :dark="dark"
                      v-model="inner1"
                      :mask="dateMask"
                    ></q-date>
                  </q-popup-proxy>
                </q-icon>
              </template>
              <template v-slot:append>
                <q-icon
                  name="access_time"
                  class="cursor-pointer"
                  v-if="field.type === 'time'"
                  size="xs"
                >
                  <q-popup-proxy
                    cover
                    transition-show="scale"
                    transition-hide="scale"
                  >
                    <q-time
                      :dark="dark"
                      v-model="inner1"
                      :mask="timeMask"
                    ></q-time>
                  </q-popup-proxy>
                </q-icon>
              </template>
            </q-input>
          </div>
          <div v-else>
            <q-input
              v-model="inner1"
              placeholder="Enter a value"
              :readonly="!editable"
            />
          </div>
        </div>
        <div class="col q-mr-sm">
          <div
            v-if="
              field.type === 'number' ||
              field.type === 'decimal' ||
              field.type === 'integer'
            "
          >
            <q-input
              v-model="inner2"
              type="number"
              placeholder="Enter a number"
              :readonly="!editable"
            />
          </div>
          <div
            v-else-if="
              field.type === 'date' ||
              field.type === 'datetime' ||
              field.type === 'time'
            "
          >
            <q-input v-model="inner2" :mask="inputMask" :readonly="!editable">
              <template v-slot:prepend>
                <q-icon
                  name="event"
                  class="cursor-pointer"
                  v-if="field.type === 'date' || field.type === 'datetime'"
                  size="xs"
                >
                  <q-popup-proxy
                    cover
                    transition-show="scale"
                    transition-hide="scale"
                  >
                    <q-date
                      :dark="dark"
                      v-model="inner2"
                      :mask="dateMask"
                    ></q-date>
                  </q-popup-proxy>
                </q-icon>
              </template>
              <template v-slot:append>
                <q-icon
                  name="access_time"
                  class="cursor-pointer"
                  v-if="field.type === 'time'"
                  size="xs"
                >
                  <q-popup-proxy
                    cover
                    transition-show="scale"
                    transition-hide="scale"
                  >
                    <q-time
                      :dark="dark"
                      v-model="inner2"
                      :mask="timeMask"
                    ></q-time>
                  </q-popup-proxy>
                </q-icon>
              </template>
            </q-input>
          </div>
          <div v-else>
            <q-input
              v-model="inner2"
              placeholder="Enter a value"
              :readonly="!editable"
            />
          </div>
        </div>
      </div>
      <div v-else-if="field.choices">
        <!-- select (one or multiple depending on operator), limit to choices -->
        <q-select
          behavior="menu"
          use-input
          :options="choices"
          v-model="inner"
          :use-chips="operator.many"
          :multiple="operator.many"
          @filter="filterValue"
          :readonly="!editable"
        />
      </div>
      <div v-else-if="field.type === 'one' || field.type === 'many'">
        <!-- select (one or multiple depending on operator), limit to related objects -->
        <q-select
          behavior="menu"
          use-input
          :options="relatedChoices"
          v-model="inner"
          :use-chips="operator.many || field.type === 'many'"
          :multiple="operator.many || field.type === 'many'"
          @filter="filterRelated"
          :label="!inner || !inner.length ? 'Start typing the name' : null"
          :readonly="!editable"
        >
          <template v-slot:no-option>
            <q-item>
              <q-item-section class="text-grey"> No results </q-item-section>
            </q-item>
          </template>
        </q-select>
      </div>
      <div v-else-if="field.isJSONField && operator.name === '$path_eq'">
        <div class="row q-gutter-sm">
          <div class="col">
            <q-input
              v-model="pathValue"
              placeholder="JSON path (e.g., user.email)"
              :readonly="!editable"
              persistent-hint
              hint="Enter JSON path"
            >
              <template v-slot:prepend>
                <q-icon name="mdi-code-json" />
              </template>
            </q-input>
          </div>
          <div class="col">
            <q-input
              v-model="matchValue"
              placeholder="Value (e.g., test@company.com)"
              :readonly="!editable"
              persistent-hint
              hint="Enter value to match"
            >
              <template v-slot:prepend>
                <q-icon name="mdi-equal" />
              </template>
            </q-input>
          </div>
        </div>
      </div>
      <div v-else-if="field.isJSONField">
        <q-input
          v-model="inner"
          placeholder="Enter a value"
          :readonly="!editable"
          persistent-hint
        >
          <template v-slot:prepend>
            <q-icon name="mdi-code-json" />
          </template>
        </q-input>
      </div>
      <div
        v-else-if="
          field.type === 'number' ||
          field.type === 'decimal' ||
          field.type === 'integer'
        "
      >
        <!-- select multiple numbers OR input one number -->
        <q-select
          behavior="menu"
          use-chips
          v-if="operator.many"
          use-input
          multiple
          new-value-mode="toggle"
          v-model="inner"
          hide-dropdown-icon
          :label="!inner || !inner.length ? 'Enter one or more values' : null"
          :readonly="!editable"
        />
        <q-input
          v-else
          type="number"
          v-model="inner"
          placeholder="Enter a number"
          :readonly="!editable"
        />
      </div>
      <div
        v-else-if="
          field.type === 'datetime' ||
          field.type === 'date' ||
          field.type === 'time'
        "
      >
        <!-- select multiple date/times OR input one date/time -->
        <q-input v-model="inner" :mask="inputMask" :readonly="!editable">
          <template v-slot:prepend>
            <q-icon
              name="event"
              class="cursor-pointer"
              v-if="
                editable && (field.type === 'date' || field.type === 'datetime')
              "
              size="xs"
            >
              <q-popup-proxy
                cover
                transition-show="scale"
                transition-hide="scale"
              >
                <q-date
                  :dark="dark"
                  :multiple="operator.multiple"
                  v-model="inner"
                  :mask="dateMask"
                ></q-date>
              </q-popup-proxy>
            </q-icon>
          </template>
          <template v-slot:append>
            <q-icon
              name="access_time"
              class="cursor-pointer"
              v-if="
                editable && (field.type === 'time' || field.type === 'datetime')
              "
              size="xs"
            >
              <q-popup-proxy
                cover
                transition-show="scale"
                transition-hide="scale"
              >
                <q-time
                  :dark="dark"
                  :multiple="operator.multiple"
                  v-model="inner"
                  :mask="timeMask"
                ></q-time>
              </q-popup-proxy>
            </q-icon>
          </template>
        </q-input>
      </div>
      <div v-else>
        <!-- (default: strings) select multiple string tags OR input one string -->
        <q-select
          behavior="menu"
          v-if="operator.many"
          v-model="inner"
          new-value-mode="toggle"
          multiple
          use-input
          use-chips
          hide-dropdown-icon
          :label="!inner || !inner.length ? 'Choose a value' : null"
          :readonly="!editable"
        />
        <q-input
          v-else
          placeholder="Enter a value"
          v-model="inner"
          :readonly="!editable"
        />
      </div>
    </div>
  </div>
</template>

<script>
import { computed, onMounted, watch, ref } from "vue";
import api from "../api";
import { findRelated } from "../utilities";

export default {
  props: [
    "dark",
    "resource",
    "field",
    "value",
    "dense",
    "operator",
    "editable",
  ],
  emits: ["update"],
  setup(props, context) {
    const inner = ref(null);
    const inner1 = ref(null);
    const inner2 = ref(null);
    const searchTerm = ref(null);
    const relatedChoices = ref([]);
    const pathValue = ref("");
    const matchValue = ref("");

    const reset = (value) => {
      if (props.operator.length === 2) {
        inner.value =
          props.value && Array.isArray(props.value) && props.value.length >= 2
            ? props.value
            : [null, null];
        inner1.value = inner.value[0];
        inner2.value = inner.value[1];
      } else if (
        props.operator.name === "$path_eq" &&
        props.field.isJSONField
      ) {
        if (props.value && typeof props.value === "object") {
          pathValue.value = props.value.path || "";
          matchValue.value = props.value.value || "";
        } else {
          pathValue.value = "";
          matchValue.value = "";
        }
        inner.value = props.value;
      } else {
        inner.value = props.value;
      }
    };
    const choices = computed(() => {
      let choices = props.field.choices;
      if (typeof choices === "object" && choices && !Array.isArray(choices)) {
        choices = Object.entries(choices).map(([k, v]) => ({
          id: k,
          label: v,
        }));
      }
      let base = choices.map(({ id, label }) => ({ value: id, label }));
      const $search = searchTerm.value;
      if ($search) {
        base = base.filter(
          (choice) =>
            choice.label.toLowerCase().indexOf($search.toLowerCase()) >= 0 ||
            choice.label.indexOf($search) >= 0
        );
      }
      return base;
    });
    watch(() => props.value, reset);

    const parseIntOrNull = (x) => (x === null ? null : parseInt(x));
    const parseFloatOrNull = (x) => (x === null ? null : parseFloat(x));
    const parseInts = (x) =>
      Array.isArray(x)
        ? x.map((xx) => parseIntOrNull(xx)).filter((x) => !isNaN(x))
        : parseIntOrNull(x);
    const parseFloats = (x) =>
      Array.isArray(x)
        ? x.map((xx) => parseFloatOrNull(xx)).filter((x) => !isNaN(x))
        : parseFloatOrNull(x);
    const parseChoices = (x) => x;
    const beforeUpdate = (value) => {
      let $value = value;
      if (props.field.type === "integer") {
        $value = $value !== null ? parseInts($value) : null;
      } else if (props.field.type === "decimal") {
        $value = $value !== null ? parseFloats($value) : null;
      } else if (props.field.choices) {
        $value = $value !== null ? parseChoices($value) : null;
      }
      return $value;
    };
    watch([pathValue, matchValue], ([newPath, newValue]) => {
      if (props.operator.name === "$path_eq" && props.field.isJSONField) {
        const newObject = { path: newPath, value: newValue };
        if (newPath !== props.value?.path || newValue !== props.value?.value) {
          context.emit("update", newObject);
        }
      }
    });

    watch(inner, (value) => {
      if (props.operator.length !== 2) {
        if (props.operator.name === "$path_eq" && props.field.isJSONField) {
          return;
        } else if (value !== props.value) {
          context.emit("update", beforeUpdate(value));
        }
      }
    });
    watch(inner1, (value) => {
      const update = beforeUpdate([inner1.value, inner2.value]);
      context.emit("update", update);
    });
    watch(inner2, (value) => {
      const update = beforeUpdate([inner1.value, inner2.value]);
      context.emit("update", update);
    });

    onMounted(reset);
    const range = (x) => {
      let counter = 0;
      return Array(x).map((x) => {
        counter += 1;
        return counter - 1;
      });
    };
    const filterValue = (input, done) => {
      searchTerm.value = input;
      done();
    };
    const filterRelated = async (input, done) => {
      if (!input) {
        done(() => {
          relatedChoices.value = [];
        });
        return;
      }
      const newChoices = await findRelated(
        props.resource,
        props.field.name,
        input
      );
      done(() => {
        relatedChoices.value = newChoices;
      });
    };
    const inputMask = computed(() => {
      const $field = props.field;
      if ($field.type === "datetime") {
        return "####-##-## ##:##:##";
      } else if ($field.type === "time") {
        return "##:##:##";
      } else if ($field.type === "date") {
        return "####-##-##";
      }
      return null;
    });
    const timeMask = computed(() => {
      const $field = props.field;
      if ($field.type === "time") {
        return "HH:mm:ss";
      } else if ($field.type === "datetime") {
        return "YYYY-MM-DD HH:mm:ss";
      }
      return null;
    });
    const dateMask = computed(() => {
      const $field = props.field;
      if ($field.type === "date") {
        return "YYYY-MM-DD";
      } else if ($field.type === "datetime") {
        return "YYYY-MM-DD HH:mm:ss";
      }
      return null;
    });
    return {
      inner,
      inner1,
      inner2,
      pathValue,
      matchValue,
      choices,
      relatedChoices,
      filterValue,
      filterRelated,
      range,
      inputMask,
      dateMask,
      timeMask,
    };
  },
};
</script>
