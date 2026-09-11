<style lang="scss">
  .FilterReflexiveToggle {
  }
</style>
<template>
    <q-btn class="FilterReflexiveToggle" :dark="dark" size="0.75rem" :dense="dense" :icon="value ? 'mdi-function-variant' : 'edit_note'" @click="toggle" flat round />
</template>

<script>
export default {
  props: {
    'value': Boolean,
    'dark': Boolean,
    'dense': Boolean
  },
  emits: ['update'],
  setup (props, context) {
    const toggle = () => {
      context.emit('update', !props.value);
    };
    return {
      toggle
    }
  }
}
</script>
