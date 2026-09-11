<style lang="scss">

.ProgressBar {
  display: flex;
  flex-grow: 1;
}

</style>

<template>
  <div :class="['ProgressBar', className]">
    <q-linear-progress rounded :size="size || '25px'" :color="liveColor" :value="value">
      <div v-if="label" class="absolute-full flex flex-center text-h7 text-white">
        <span>{{ valueLabel }}</span>
      </div>
    </q-linear-progress>
  </div>
</template>

<script>
import { computed } from 'vue';
export default {
  props: {
    'dark': Boolean,
    'className': String,
    'label': Boolean,
    'size': String,
    'value': Number,
    'color': Number,
    'cancel': Boolean
  },
  setup (props) {
    const valueLabel = computed(() => {
      return !isNaN(props.value) ? `${Math.round(100 * props.value)}%` : '';
    });
    const liveColor = computed(() => {
      if (props.color) {
        return props.color;
      }
      if (props.cancel) {
        return 'grey-7';
      }
      return 'primary';
    });
    return {
      valueLabel,
      liveColor
    }
  }
}
</script>
