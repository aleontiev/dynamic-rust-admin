<style lang="scss">
.col-side {
  width: 120px;
}
</style>
<template>
  <q-item>
    <q-item-section side class="col-side">
      {{ metafield.label }}
    </q-item-section>
    <q-item-section v-if="type === 'array'">
      <div>
        <q-chip
          outline
          :dense="dense"
          :dark="dark"
          :key="index"
          v-for="(item, index) in value"
          >{{ item.label || item }}</q-chip
        >
      </div>
    </q-item-section>
    <q-item-section v-else-if="type === 'object'">
      <q-list>
        <q-item :key="key" v-for="(item, key) in value">
          <q-item-section side class="col-1">
            {{ key }}
          </q-item-section>
          <q-item-section>
            {{ item }}
          </q-item-section>
        </q-item>
      </q-list>
    </q-item-section>
    <q-item-section v-else>
      {{ value }}
    </q-item-section>
  </q-item>
</template>

<script>
import { computed, ref } from "vue";
import { getMetafieldValue } from "../utilities";

export default {
  props: ["dark", "dense", "resource", "field", "metafield"],
  components: {},
  setup(props) {
    const value = computed(() =>
      getMetafieldValue(props.field, props.metafield)
    );
    const type = computed(() => {
      const val = value.value;
      if (Array.isArray(val)) {
        return "array";
      }
      if (val === null) {
        return null;
      }
      return typeof val;
    });
    return {
      value,
      type,
    };
  },
};
</script>
