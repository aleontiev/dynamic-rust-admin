<style lang="scss">
.q-carousel__control {
  opacity: 0.6;
  bottom: 5px;
}
</style>
<template>
  <q-carousel
    v-model="slide"
    swipeable
    infinite
    animated
    :control-color="dark ? 'white' : 'black'"
    navigation
    padding
    keep-alive
    :height="height"
  >
    <q-carousel-slide
      :name="view"
      v-for="view in views"
      :key="view"
      v-model="slide"
    >
      <DashboardViewCard :view="view" :dark="dark" :dense="dense" />
    </q-carousel-slide>
  </q-carousel>
</template>

<script>
import { computed, ref } from "vue";
import DashboardViewCard from "./DashboardViewCard";

export default {
  props: {
    dark: Boolean,
    dense: Boolean,
    dashboard: null,
    height: {
      "type": String,
      "default": '100%' // calc(100vh - 100px)'
    }
  },
  components: {
    DashboardViewCard,
  },
  setup(props) {
    const views = computed(() => props.dashboard.data?.views || []);
    const slide = ref(views.value?.[0]);
    return {
      views,
      slide,
    };
  },
};
</script>
