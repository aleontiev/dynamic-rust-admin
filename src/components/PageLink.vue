<style lang="scss">
  .Field .Link {
    display: table;
    white-space: nowrap;
  }
  .Link {
    text-overflow: ellipsis;
    overflow: hidden;
    display: inline-block;
    text-decoration: none;
    &.inline {
      display: inline;
    }

    &.primary {
      &:visited {
        color: darken($primary, 10%);
      }
      color: var(--q-primary);
    }
    &.blue {
      &:visited {
        color: darken($blue-8, 10%);
      }
      color: $blue-8;
    }
    &.red {
      &:visited {
        color: darken($red-6, 10%);
      }
      color: $red-6;
    }
    &.yellow {
      &:visited {
        color: darken($yellow-8, 10%);
      }
      color: $yellow-8;
    }
    &.orange {
      &:visited {
        color: darken($orange-5, 10%);
      }
      color: $orange-5;
    }
    &.deep-orange {
      &:visited {
        color: darken($deep-orange-5, 10%);
      }
      color: $deep-orange-5;
    }
    &.blue-grey {
      &:visited {
        color: darken($blue-grey-8, 10%);
      }
      color: $blue-grey-8;
    }
    &.grey {
      &:visited {
        color: darken($grey-8, 10%);
      }
      color: $grey-8;
    }
    &.purple {
      &:visited {
        color: darken($purple-5, 10%);
      }
      color: $purple-5;
    }
    &.pink {
      &:visited {
        color: darken($pink-5, 10%);
      }
      color: $pink-5;
    }
    &.brown{
      &:visited {
        color: darken($brown-6, 10%);
      }
      color: $brown-6;
    }
    &.lime {
      &:visited {
        color: darken($lime-7, 10%);
      }
      color: $lime-7;
    }
    &.cyan {
      &:visited {
        color: darken($cyan-5, 10%);
      }
      color: $cyan-5;
    }
  }
</style>
<template>
  <a :class="classes" :href="to" @click.stop rel="noopener noreferrer">{{ label }}</a>
</template>

<script>
import { computed } from 'vue';

export default {
  props: {
    'resource': Object,
    'field': String,
    'record': Object,
    'relation': null,
    'classNames': null,
    'disable': Boolean,
    'unstyled': Boolean
  },
  setup(props) {
    const isSelfLink = computed(
      () => !props.field || props.field === props.resource.name_field
    );
    const isDisabled = computed(() => {
      if (props.disable) {
        return true;
      }
      return isSelfLink.value && props.resource && !props.resource.canDetail();
    });
    const to = computed(() => {
      return props.disable ? '#' : props.resource.getLink(props.record, props.field, props.relation);
    });
    const label = computed(() => {
      return props.resource.getName(props.record, props.field, props.relation);
    });
    const classes = computed(() => {
      const classNames = ['Link'];
      if (props.classNames) {
        let cls = props.classNames;
        if (typeof props.classNames === 'string') {
          cls = cls.split(' ');
        }
        classNames.push(cls);
      }
      if (props.unstyled) {
        return classNames;
      }
      let style;
      if (!props.field || props.field === props.resource.name_field) {
        // self
        style = props.resource.getStyle(props.record);
      } else {
        // a related object
        let target = props.relation || props.resource.getValue(props.record, props.field);
        const relatedResource = props.resource.getRelationFromField(props.field);
        if (typeof target !== 'object') {
          target = relatedResource.getRecord(target);
        }
        style = relatedResource.getStyle(target);
      }
      if (style) {
        classNames.push(style);
      }
      return classNames;
    });
    return {
      isDisabled,
      to,
      label,
      classes
    }
  }
}
</script>
