<template>
  <MetaField
    v-for="metafield in metafields"
    :field="field"
    :metafield="metafield"
    :dark="dark"
    :dense="dense"
    :key="metafield.label"
  />
</template>

<script>
import { computed, ref } from "vue";
import { getMetafieldValue, isEmpty } from "../utilities";
import MetaField from "./MetaField";

export default {
  props: ["dense", "dark", "resource", "field", "record"],
  components: { MetaField },
  setup(props) {
    const allMetafields = [
      {
        label: "Name",
        source: "name",
      },
      {
        label: 'Is identifier?',
        source: (field) => field.name === props.resource.id_field ? true : null,
        optional: true
      },
      {
        label: 'Is name?',
        source: (field) => field.name === props.resource.name_field ? true : null,
        optional: true
      },
      {
        label: "Type",
        source: "type",
      },
      {
        label: "Related to",
        source: "related",
        optional: true,
      },
      {
        label: "Description",
        source: "description",
        optional: true,
      },
      {
        label: "Can be empty?",
        source: "null",
      },
      {
        label: "Default",
        source: "default",
        optional: true,
      },
      {
        label: "Access",
        source: (field) => {
          let result = [];
          if (props.resource.canRead(field.name)) {
            result.push('Read');
          } if (props.resource.canWrite(field.name)) {
            result.push('Update');
          } if (props.resource.canCreate(field.name)) {
            result.push('Create');
          }
          return result.join(' + ');
        },
        optional: true
      },
      {
        label: "Options",
        source: "choices",
        optional: true,
      },

    ];
    const metafields = computed(() =>
      allMetafields.filter(
        (metafield) =>
          !metafield.optional || !isEmpty(getMetafieldValue(props.field, metafield))
      )
    );
        return {
      metafields,
    };
  },
};
</script>
