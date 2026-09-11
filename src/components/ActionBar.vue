<style lang="scss">
.ActionBar {
  width: 100%;
  display: flex;
  position: relative;
  align-items: center;
  justify-content: space-between;
  &.dark {
    background: var(--q-dark);
  }
  &.white {
    background: white;
  }
  &.ActionBar--center {
    justify-content: center;
  }
  &.ActionBar--right {
    justify-content: flex-end;
  }
  &.ActionBar--left {
    justify-content: flex-start;
  }
  .absolute-top {
    position: absolute;
    top: 0;
  }
  padding-left: 10px;
  padding-right: 5px;
  &.ActionBar--padded {
    padding-top: 5px;
    padding-bottom: 5px;
  }
}
</style>

<template>
  <div
    :class="{
      ActionBar: true,
      'ActionBar--center': center,
      dark: dark && !transparent,
      'white': !dark && !transparent,
      'ActionBar--right': right,
      'ActionBar--left': left,
      'ActionBar--padded': padded
    }"
  >
    <slot></slot>
  </div>
</template>

<script>
export default {
  props: {
    padded: Boolean,
    transparent: Boolean,
    dark: Boolean,
    center: Boolean,
    right: Boolean,
    saving: Boolean,
    left: Boolean,
  },
  setup() {
    return {};
  },
};
</script>
