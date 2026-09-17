<style lang="scss">
.Field--changed.Field--file .FieldInput .FieldInput__content {
  border: 2px solid $primary;
}
.FieldInput.readonly {
  .ql-toolbar {
    display: none;
  }
}
.FieldInput {
  .ql-container {
    font-family: Roboto, "Open Sans", sans-serif;
    border: none;
  }
  .ql-toolbar {
    border: none;
    height: 40px;
    .ql-formats {
      display: block;
    }
  }
  .FieldInput__content {
    position: relative;
  }
  .q-field.q-file {
    display: none;
  }
  &.file .FieldInput__content {
    overflow-x: hidden;
  }
}

.body--light .FieldInput.file.readonly .FieldInput__content.empty {
  border: 1px solid #0000001f;
}
.body--dark .FieldInput.file.readonly .FieldInput__content.empty {
  border: 1px solid #ffffff47;
}
.body--light .FieldInput.file.editing .FieldInput__content.empty {
  border: 1px solid rgba(0, 0, 0, 0.24);
}
.body--dark .FieldInput.file.editing .FieldInput__content.empty {
  border: 1px solid rgba(255, 255, 255, 0.6);
}

.body--light .FieldInput.file.editing:hover .FieldInput__content.empty {
  border: 1px solid rgba(0, 0, 0, 1);
}
.body--dark .FieldInput.file.editing:hover .FieldInput__content.empty {
  border: 1px solid rgba(255, 255, 255, 1);
}
.FieldInput.file.editing .FieldInput__content {
  transition: border 0.7s ease;
}

.dim {
  background: rgba(0, 0, 0, 0.2);
}
</style>
<template>
  <div
    :class="{
      'FieldInput full-width': true,
      editing: !readonly,
      readonly: readonly,
      dark: dark,
      file: field.type === 'file upload' || field.type === 'image upload',
    }"
  >
    <div
      :class="{
        FieldInput__content: true,
        empty: !live,
        'row justify-center': focused && isVideo,
      }"
    >
      <div v-if="field.type === 'permissions'" class="FieldInput__permissions">
        <PermissionsEditor
          :value="live"
          :field="field"
          :dark="dark"
          :dense="dense"
          :readonly="readonly"
          @update="onPermissionsUpdate"
        />
      </div>
      <div v-else-if="field.type === 'filters'" class="FieldInput__filters">
        <FilterList
          :hasPrevious="true"
          v-if="referencedResource"
          :value="live"
          :resource="referencedResource"
          @add="onFilterAdd"
          @update="onFilterUpdate"
          @delete="onFilterDelete"
          :readonly="readonly"
          :original="record[field.name]"
          :editable="!readonly"
        />
      </div>
      <div v-else-if="choices.length" class="FieldInput__choices">
        <q-select
          behavior="menu"
          :readonly="readonly"
          :options="choices"
          v-model="live"
          :use-chips="field.type === 'list' || field.type === 'resources'"
          :multiple="field.type === 'list' || field.type === 'resources'"
          @filter="filter"
          :clearable="nullable"
        >
          <template
            v-slot:option="scope"
            v-if="
              reference &&
              !!reference.getFieldIcon(choices[choices.length - 1].value)
            "
          >
            <q-item v-bind="scope.itemProps">
              <q-item-section avatar>
                <q-icon
                  v-if="reference.getFieldIcon(scope.opt.value, 'close')"
                  :name="reference.getFieldIcon(scope.opt.value, 'close')"
                />
                <span
                  class="text-h5 q-mr-xs q-mb-xs w-30px text-center"
                  v-else
                ></span>
              </q-item-section>
              <q-item-section>
                <q-item-label>{{ scope.opt.label }}</q-item-label>
              </q-item-section>
            </q-item>
          </template>
        </q-select>
      </div>
      <div v-else-if="field.type === 'rich'">
        <QuillEditor
          contentType="html"
          v-model:content="live"
          :key="quillOptions"
          :options="quillOptions"
        />
      </div>
      <div v-else-if="field.type === 'one' || field.type === 'many'">
        <q-select
          behavior="menu"
          :readonly="readonly"
          use-input
          :options="relatedChoices"
          v-model="live"
          :use-chips="field.type === 'many'"
          :multiple="field.type === 'many'"
          @filter="filterRelated"
          :label="!live && !inline ? 'Search...' : null"
          :clearable="nullable"
        >
          <template v-slot:no-option>
            <q-item>
              <q-item-section class="text-grey"> No results </q-item-section>
            </q-item>
          </template>
        </q-select>
      </div>
      <div
        v-else-if="
          field.type === 'number' ||
          field.type === 'decimal' ||
          field.type === 'integer'
        "
      >
        <q-input
          :readonly="readonly"
          type="number"
          mask="#"
          v-model="live"
          :placeholder="!inline ? 'Enter a number' : null"
          :input-style="{ fontSize: null }"
        />
      </div>
      <div
        v-else-if="
          field.type === 'datetime' ||
          field.type === 'date' ||
          field.type === 'time'
        "
      >
        <q-input
          :readonly="readonly"
          v-model="live"
          :mask="mask"
          :input-style="{ fontSize: null }"
        >
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
                  v-model="live"
                  mask="YYYY-MM-DD HH:mm:ss"
                ></q-date>
              </q-popup-proxy>
            </q-icon>
          </template>
          <template v-slot:append>
            <q-icon
              name="access_time"
              class="cursor-pointer"
              v-if="field.type === 'time' || field.type === 'datetime'"
              size="xs"
            >
              <q-popup-proxy
                cover
                transition-show="scale"
                transition-hide="scale"
              >
                <q-time
                  :dark="dark"
                  v-model="live"
                  mask="YYYY-MM-DD HH:mm:ss"
                ></q-time>
              </q-popup-proxy>
            </q-icon>
          </template>
        </q-input>
      </div>
      <div
        v-else-if="
          field.type === 'file upload' || field.type === 'image upload'
        "
      >
        <vue-pdf-embed :source="live" v-if="isPdf" />
        <video-player
          :src="live"
          v-else-if="isVideo"
          controls
          :fluid="dense"
          style="max-height: 60dvh; max-width: 100dvw"
        />
        <q-img
          v-if="live"
          :src="live"
          fit="contain"
          height="100%"
          width="100%"
          style="max-height: 60dvh; max-width: 100dvw"
        />
        <div v-else style="height: 320px" />
        <label
          v-if="!readonly"
          style="z-index: 10"
          class="absolute top right full-width full-height"
        >
          <q-file @update:model-value="onFile" :model-value="liveFile" />
          <div
            v-if="live"
            style="z-index: 13"
            class="absolute top right q-mr-xs q-mt-xs"
          >
            <q-btn
              flat
              round
              icon="cancel"
              @click="live = null"
              @click.stop.prevent
            />
          </div>
        </label>
        <div class="absolute center" v-if="!live" style="z-index: 9">
          <q-icon
            name="image"
            size="lg"
            :color="hasChanged ? 'primary' : 'grey-7'"
          />
        </div>
      </div>
      <div v-else-if="field.type === 'boolean'">
        <q-select
          :readonly="readonly"
          :options="choices"
          v-model="live"
          :clearable="nullable"
        />
      </div>
      <div v-else-if="field.type === 'list'">
        <!-- list type but no choices -->
        <q-select
          v-model="live"
          :readonly="readonly"
          :clearable="nullable"
          multiple
          new-value-mode="add"
          use-input
          use-chips
          hide-dropdown-icon
        />
      </div>
      <div v-else>
        <q-input
          :readonly="readonly"
          :placeholder="!inline ? 'Enter a value' : null"
          v-model="live"
          :input-style="{ fontSize: null }"
          autogrow
        />
      </div>
    </div>
  </div>
</template>

<script>
import Delta from "quill-delta";
import { QuillEditor } from "@vueup/vue-quill";
import { computed, onMounted, watch, ref } from "vue";
import { useStore } from "vuex";
import { isEmpty, isEqual, findRelated, filterChoiceOptionsByParent } from "../utilities";
import { VideoPlayer } from "@videojs-player/vue";
import "video.js/dist/video-js.css";
import "@vueup/vue-quill/dist/vue-quill.snow.css";

import VuePdfEmbed from "vue-pdf-embed";
import FilterList from "./FilterList";
import PermissionsEditor from "./PermissionsEditor";

export default {
  components: {
    VuePdfEmbed,
    FilterList,
    PermissionsEditor,
    VideoPlayer,
    QuillEditor,
  },
  props: [
    "dark",
    "record",
    "resource",
    "field",
    "value",
    "dense",
    "parent",
    "inline",
    "focused",
    "readonly",
    "changes",
  ],
  emits: ["update"],
  setup(props, context) {
    const store = useStore();
    const database = store.$db();
    const Application = database.model("_application");
    const Resource = database.model("_resources");

    const live = ref(null);
    const searchTerm = ref(null);
    const relatedChoices = ref([]);
    const fontSize = ref(null);
    const hasChanged = computed(() => {
      return (
        props.changes && typeof props.changes[props.field.name] !== "undefined"
      );
    });
    const reset = (value) => {
      live.value = beforeLoad(props.value);
      resetSize();
    };
    onMounted(() => reset);
    watch(() => props.value, reset);
    const resetSize = () => {
      if (props.parent && props.parent.style) {
        fontSize.value = props.parent.style.fontSize;
      }
    };
    watch(() => props.parent, resetSize);
    const mergedRecord = computed(() => ({
      ...props.record,
      ...(props.changes || {}),
    }));
    const choices = computed(() => {
      if (props.field.type === "boolean") {
        return [
          { value: true, label: "yes" },
          { value: false, label: "no" },
        ];
      }
      if (props.field.type === "resource" || props.field.type === "resources") {
        return Application.getResourceOptions();
      }
      if (!props.field.choices) {
        return [];
      }
      let base;
      if (typeof props.field.choices === "function") {
        base = props.field.choices({
          resource: props.resource,
          record: props.record,
        });
      } else {
        base = props.field.choices;
      }
      base = base.map(({ id, label }) => ({ value: id, label }));
      base = filterChoiceOptionsByParent(
        props.field,
        mergedRecord.value,
        base
      );
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

    const parseIntOrNull = (x) => (isEmpty(x) ? null : parseInt(x));
    const parseFloatOrNull = (x) => (isEmpty(x) ? null : parseFloat(x));
    const parseOne = (x) => (isEmpty(x) ? null : x.value);
    const parseInts = (x) =>
      Array.isArray(x)
        ? x.map((xx) => parseIntOrNull(xx)).filter((x) => !isNaN(x))
        : parseIntOrNull(x);
    const parseFloats = (x) =>
      Array.isArray(x)
        ? x.map((xx) => parseFloatOrNull(xx)).filter((x) => !isNaN(x))
        : parseFloatOrNull(x);
    const parseChoices = (x) => {
      if (Array.isArray(x)) {
        return x.map((xx) => parseChoices(xx));
      }
      return typeof x.value !== "undefined"
        ? x.value
        : props.resource.getChoiceValue(x, props.field.name, props.record);
    };
    const parseRelated = (x) =>
      Array.isArray(x) ? x.map((xx) => parseOne(xx)) : parseOne(x);
    const parseBoolean = (x) => x === true || x === "true";
    const beforeLoad = (value) => {
      const field = props.field;
      let $value = typeof value !== "undefined" ? value : null;
      if (field.type === "one") {
        return $value !== null
          ? {
              value: $value,
              label: props.resource.getRelatedName(field.name, $value),
            }
          : null;
      } else if (field.type === "many") {
        return $value !== null
          ? $value.map((v) => ({
              value: v,
              label: props.resource.getRelatedName(field.name, v),
            }))
          : null;
      } else if (field.type === "rich") {
        // convert to Quill Delta format, object with ops key
        return $value;
      } else if (field.choices) {
        // A list of choices (say a user's roles) is edited as one chip per
        // item, each showing its label rather than its stored id.
        const display = (item) =>
          props.resource.getChoiceDisplayValue(item, field.name, props.record);
        if ($value === null) {
          return null;
        }
        return Array.isArray($value) ? $value.map(display) : display($value);
      } else if (field.type === "boolean") {
        const base =
          $value !== null ? parseBoolean($value.value || $value) : null;
        if (base === null) {
          return base;
        }
        return base
          ? { value: true, label: "yes" }
          : { value: false, label: "no" };
      } else if (field.type === "integer") {
        return parseInts($value);
      } else if (field.type === "decimal") {
        return parseFloats($value);
      } else if (field.type === "object") {
        if ($value !== null && typeof $value === "object") {
          return JSON.parse(JSON.stringify($value));
        }
        return $value ?? null;
      } else if (field.type === "resource") {
        if ($value && $value.value) {
          $value = $value.value;
        }
        const $res = Resource.find($value);
        if ($res && $res.label) {
          return $res.label.replace("_", " ");
        }
        return $value;
      } else if (field.type === "resources") {
        return $value
          ? $value.map((x) => {
              const $x = x.value || x;
              const $res = Resource.find($x);
              return $res && $res.label ? $res.label.replace("_", " ") : $x;
            })
          : null;
      } else if (field.type === "filters") {
        if ($value && Array.isArray($value)) {
          return [...$value];
        }
      }
      return $value;
    };
    const beforeUpdate = (value) => {
      let $value = value;
      if (typeof $value === "undefined") {
        $value = null;
      }
      const field = props.field;
      if (props.field.type === "integer" || props.field.type === "number") {
        $value = parseInts($value);
      } else if (props.field.type === "decimal") {
        $value = parseFloats($value);
      } else if (props.field.type === "rich") {
      } else if (props.field.choices) {
        $value = $value !== null ? parseChoices($value) : null;
      } else if (props.field.type === "one") {
        $value = $value !== null ? value.value : null;
      } else if (props.field.type === "many") {
        $value = $value !== null ? value.map((vv) => vv.value) : null;
      } else if (
        props.field.type === "date" ||
        props.field.type === "datetime" ||
        props.field.type === "time"
      ) {
        if ($value !== null) {
          $value = value.trim();
          if ($value === "") {
            $value = null;
          }
          if (props.field.type === "datetime") {
            const parts = $value.split(" ");
            if (parts.length === 2) {
              // convert ####-##-## ##:##:## into ####-##-##T##:##:##Z
              $value = `${parts[0]}T${parts[1]}Z`;
            }
          }
        }
      } else if (props.field.type === "boolean") {
        $value = $value !== null ? parseBoolean($value.value || $value) : null;
      } else if (props.field.type === "filters") {
        if (typeof $value === "string") {
          try {
            $value = JSON.parse($value);
          } catch (exception) {}
        }
      } else if (props.field.type === "object") {
        return $value;
      } else if (props.field.type === "resource") {
        if ($value && $value.value) {
          return $value.value;
        }
        if ($value) {
          // try to match by label
          const match = Resource.query()
            .where((r) => r.label.replace("_", " ") === $value)
            .first();
          if (match) {
            $value = match.name;
          }
        }
      } else if (props.field.type === "resources") {
        if ($value) {
          // try to match by label
          $value = $value.map((v) => v.value || v);
          $value = Resource.query()
            .where(
              (r) =>
                $value.indexOf(r.name) > -1 ||
                $value.indexOf(r.label.replace("_", " ")) > -1
            )
            .get()
            .map((r) => r.name);
        }
      }
      return $value;
    };
    const doUpdate = (value) => {
      const update = beforeUpdate(value);
      if (!isEqual(update, props.value, { looseEmptyComparison: false })) {
        // looseEmptyComparison = false means that empty values are only equal
        // if they have the same type
        // console.log('field.changed', props.field.name, 'was', props.value, 'now', update);
        context.emit("update", update);
      }
    };
    watch(live, doUpdate);
    onMounted(reset);
    const filter = (input, done) => {
      searchTerm.value = input;
      done();
    };
    const filterRelated = async (input, done) => {
      if (!input && !props.field.filter) {
        done(() => {
          relatedChoices.value = [];
        });
        return;
      }
      const newChoices = await findRelated(
        props.resource,
        props.field.name,
        input,
        props.record,
        props.changes
      );
      done(() => {
        relatedChoices.value = newChoices;
      });
    };
    const mask = computed(() => {
      if (props.field.type === "time") {
        return "##:##:##";
      } else if (props.field.type === "datetime") {
        return "####-##-## ##:##:##";
      } else if (props.field.type === "date") {
        return "####-##-##";
      }
      return null;
    });
    const nullable = computed(() => {
      return props.field.null;
    });
    const onFile = (file) => {
      const reader = new FileReader();
      reader.addEventListener("load", () => {
        live.value = reader.result;
      });
      reader.readAsDataURL(file);
      liveFile.value = [];
    };
    const liveFile = ref([]);
    const reference = computed(() => {
      if (props.field.type === "resource") {
        return {
          getFieldIcon: (resourceName) => {
            const resource = Resource.find(resourceName);
            if (resource) {
              return `mdi-${resource.icon}`;
            }
            return null;
          },
        };
      }
      let $ref = props.field.reference;
      if (!$ref) {
        return null;
      }
      if (typeof $ref === "function") {
        $ref = $ref({ record: props.record });
      }
      return $ref;
    });
    const isPdf = computed(() => {
      if (live.value && live.value.toLowerCase) {
        const ext = live.value.toLowerCase().split("?")[0];
        return ext.startsWith("data:application/pdf") || ext.endsWith(".pdf");
      }
      return false;
    });
    const isVideo = computed(() => {
      if (live.value && live.value.toLowerCase) {
        const ext = live.value.toLowerCase().split("?")[0];
        return (
          ext.startsWith("data:video") ||
          ext.endsWith(".mp4") ||
          ext.endsWith("mkv") ||
          ext.endsWith("webm")
        );
      }
      return false;
    });
    const onPermissionsUpdate = (value) => {
      live.value = value;
      doUpdate(value);
    };
    const onFilterAdd = () => {
      if (Array.isArray(live.value)) {
        live.value.push({});
      } else {
        live.value = [{}];
      }
      doUpdate(live.value);
    };
    const onFilterUpdate = ({ index, update }) => {
      live.value[index] = update;
      doUpdate(live.value);
    };
    const onFilterDelete = ({ index }) => {
      live.value.splice(index, 1);
      doUpdate(live.value);
    };
    const referencedResource = computed(() => {
      const resourceField = props.field.resource_field;
      if (resourceField) {
        let resourceName;
        if (resourceField.substr(0, 1) === '"') {
          resourceName = resourceField.substr(1, resourceField.length - 2);
        } else {
          resourceName = { ...props.record, ...props.changes }[resourceField];
          if (resourceName && resourceName.id) {
            resourceName = resourceName.id;
          }
        }
        const result = resourceName ? Resource.find(resourceName) : null;
        return result;
      }
      return null;
    });
    const quillOptions = computed(() => {
      if (props.field.type !== "rich") {
        return null;
      }
      const options = {
        modules: {
          toolbar: props.readonly
            ? []
            : [
                "bold",
                "italic",
                "underline",
                "strike",
                "blockquote",
                "link",
                { list: "ordered" },
                { list: "bullet" },
              ],
        },
        placeholder: props.readonly ? "" : "Type here...",
        readOnly: props.readonly,
      };
      return options;
    });
    return {
      live,
      choices,
      relatedChoices,
      filter,
      mask,
      fontSize,
      nullable,
      filterRelated,
      hasChanged,
      onFile,
      reference,
      liveFile,
      isPdf,
      isVideo,
      onPermissionsUpdate,
      onFilterAdd,
      onFilterUpdate,
      onFilterDelete,
      quillOptions,
      referencedResource,
    };
  },
};
</script>
