<style lang="scss">
.table {
  thead .table__cell-inner {
    display: inline;
  }
  .table__cell-inner {
    display: block;
    overflow: hidden;
    position: relative;
    text-overflow: ellipsis;
    a,
    span {
      display: default;
      max-width: 100%;
    }
  }
  &.display-none {
    display: none !important;
  }
  .q-table__sort-icon {
    font-size: 1.5rem;
  }

  &.no-sort .q-table__sort-icon {
    display: none;
  }
  &.q-table__container .q-table__middle {
    border-radius: 0px;
    padding-bottom: 60px;
  }
  &.q-table__container .q-table__bottom {
    border-radius: 0px;
    border-top: 0px solid $grey-5;
    background-color: $grey-2;
    position: fixed;
    bottom: 0px;
    left: 0px;
    right: 0px;
    z-index: 10;
  }
  &:not(.dense-table) {
    .q-img {
      max-height: 40px !important;
    }
    tbody .table__cell-inner {
      max-height: 40px;
    }
  }
  .table__cell-inner {
    white-space: pre;
  }
  td {
    background-color: #fff;
    max-width: 50vw;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  th {
    border-right: 0px solid black;
    border-bottom: 1px solid $grey-4;
  }
  &.dark.dark {
    th {
      border-bottom: 1px solid rgba(255, 255, 255, 0.4);
    }
    thead {
      border-bottom: 0px solid white;
    }
    &.naked-header {
      tr th {
        background-color: var(--q-dark);
      }
      thead tr {
        background-color: var(--q-dark);
      }
    }
    &:not(.naked-header) {
      tr th {
        background-color: black;
      }
      thead tr {
        background-color: black;
      }
    }
    td {
      /* bg color is important for td; just specify one */
      background-color: var(--q-dark);
    }
    .q-table__bottom {
      background-color: $grey-10;
      color: $grey-2;
      border-top: 0px solid $grey-7;
    }
  }
}
.full-table {
  /* this will be the loading indicator */
  thead tr:last-child th {
    /* height of all previous header rows */
    top: 54px;
    /* highest z-index */
    z-index: 3;
  }
}
.dense-table {
  .q-table__sort-icon {
    font-size: 1.2rem;
  }
  .q-img {
    height: 27px;
  }
  tbody .table__cell-inner {
    max-height: 22px;
  }
  thead tr {
    height: 40px;
  }
  /* this will be the loading indicator */
  thead tr:last-child th {
    top: 39px;
    z-index: 3;
  }
}
.sticky-table {
  &.selection.sticky-column {
    td:first-child,
    th:first-child {
      position: sticky;
    }
    td:first-child,
    td:nth-child(2) {
      border-left: 0px solid black;
      border-right: 0px solid black;
    }
    tr:first-child th:first-child,
    tr:first-child th:nth-child(2) {
      /* highest z-index */
      z-index: 3;
    }
    td:first-child,
    td:nth-child(2) {
      z-index: 1;
    }
    td:nth-child(2),
    th:nth-child(2) {
      position: sticky;
    }
    thead tr:first-child th {
      top: 0;
      z-index: 1;
    }
    th:first-child {
      left: 0;
      border-right: 0px solid white;
    }
    td:first-child {
      left: 0;
      border-right: 0px solid white;
    }
    &:not(.dense-table) {
      td:nth-child(2),
      th:nth-child(2) {
        left: 72px;
      }
    }
    &.dense-table {
      td:nth-child(2),
      th:nth-child(2) {
        left: 44px;
      }
    }
    td:nth-child(2),
    th:nth-child(2) {
      border-right: 1px solid $grey-4;
      border-left: 0px solid black;
    }
    &.dark.dark td:nth-child(2),
    th:nth-child(2) {
      border-right: 1px solid rgba(255, 255, 255, 0.4);
    }
  }
  &.sticky-table.sticky-table tr th {
    top: 0;
    position: sticky;
    /* higher than z-index for td below */
    z-index: 2;
    /* bg color is important; just specify one */
    background-color: #fff;
  }
  th:first-child {
    left: 0;
  }
  td:first-child {
    left: 0;
  }
  &:not(.selection).sticky-column {
    td:first-child,
    th:first-child {
      position: sticky;
      left: 0;
      z-index: 1;
      border-right: 1px solid $grey-4;
    }
    tr:first-child th:first-child {
      z-index: 3;
    }
    &.dark.dark td:first-child,
    &.dark.dark th:first-child {
      border-right: 1px solid rgba(255, 255, 255, 0.4);
    }
  }
}
</style>

<template>
  <q-table
    :class="[
      classNames,
      selection && selection !== 'none' ? 'no-sort selection' : '',
      dark ? 'dark' : '',
      'table sticky-table',
      dense ? 'dense-table' : 'full-table',
      hidden ? 'display-none' : '',
    ]"
    ref="table"
    :visible-columns="visible"
    flat
    :dense="dense"
    virtual-scroll
    separator="cell"
    :selection="selection"
    v-model:selected="selected"
    hide-pagination
    v-model:pagination="pagination"
    v-if="data.length || !loading"
    :loading="loading"
    :hide-bottomn="true"
    :color="dark ? 'grey-3' : 'grey-9'"
    :rows="data"
    :columns="columns"
    @virtual-scroll="onVirtualScroll"
  >
    <template v-slot:body-cell="props">
      <TableCell
        :props="props"
        :resource="resource"
        :dense="dense"
        :record="rows[props.rowIndex]"
      />
    </template>
    <template v-slot:header-cell="props">
      <TableHeaderCell :props="props" :resource="resource" :dense="dense" />
    </template>
  </q-table>
</template>

<script>
import { computed, ref } from "vue";
import TableCell from "./TableCell";
import TableHeaderCell from "./TableHeaderCell";

export default {
  props: [
    "dark",
    "dense",
    "resource",
    "hidden",
    "rows",
    "columns",
    "loading",
    "visibleColumns",
    "classNames",
    "selection",
  ],
  components: {
    TableCell,
    TableHeaderCell,
  },
  emits: ["virtual-scroll"],
  setup(props, context) {
    const onCellClick = () => {};
    const emitVirtualScroll = (details) =>
      context.emit("virtual-scroll", details);
    const visible = computed(
      () =>
        props.visibleColumns ||
        props.resource.getVisibleFieldNames({ view: "list", read: true })
    );
    const data = computed(() => {
      return props.rows ? props.rows : [];
    });
    const selected = ref([]);
    const pagination = ref({
      rowsPerPage: 0,
    });
    return {
      onCellClick,
      onVirtualScroll: emitVirtualScroll,
      visible,
      selected,
      pagination,
      data,
    };
  },
};
</script>
