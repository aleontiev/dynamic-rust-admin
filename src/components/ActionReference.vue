<template>
  <MetaField
    v-for="metafield in metafields"
    :field="action"
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
  props: ["dense", "dark", "resource", "action"],
  components: { MetaField },
  setup(props) {
    const allMetafields = [
      {
        label: "Name",
        source: "name",
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
