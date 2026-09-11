<style>
.read {
  opacity: 0.6;
}
</style>
<template>
  <q-infinite-scroll @load="onLoad" :offset="0" v-if="loaded">
    <div v-for="group in groups" :key="group.name">
      <q-item>
        <q-item-section>
          <q-separator />
        </q-item-section>
        <q-item-section class="text-center col-md-1" style="opacity: 0.9">
          {{ group.name }} ({{ group.items.length }})
        </q-item-section>
        <q-item-section>
          <q-separator />
        </q-item-section>
      </q-item>
      <q-item
        v-for="item in group.items"
        clickable
        :key="item.id"
        @click="click(item)"
        :class="{'read': item.status === 'Read'}"
        >
        <q-item-section side>
          <q-avatar :color="item.color">
            <q-icon :name="item.icon" color="white" />
          </q-avatar>
        </q-item-section>
        <q-item-section
            style="font-size: 1rem; text-overflow: ellipsis"
            :class="{'q-pt-sm block unbold white-space-pre overflow-hidden': true}"
            >
            <span v-text="item.title" />
        </q-item-section>
          <q-item-section side v-if="false">
            <q-btn flat round icon="mdi-dots-vertical" />
          </q-item-section>
      </q-item>
    </div>
    <template v-slot:loading>
      <div class="row justify-center q-my-md" v-if="pagination.more">
        <q-spinner-dots color="primary" size="40px" />
      </div>
    </template>
  </q-infinite-scroll>
  <div v-else>
    <q-item v-for="(item, index) in skeleton" :key="index">
      <q-item-section side>
        <q-skeleton type="circle" />
      </q-item-section>
      <q-item-section>
        <q-skeleton type="rect" />
      </q-item-section>
    </q-item>
  </div>
  <MessageTakeover
      :Message="Message"
      :dark="dark"
      :dense="dense"
      :open="!!selected"
      :item="selected"
      @close="onClose"
      @archived="onArchived"
      @read="onRead"
      @unread="onUnread"
      />
</template>

<script>
import { computed, onMounted, watch, ref } from "vue";
import { useRoute } from 'vue-router';
import { useQuasar } from "quasar";
import {
  handleError,
  stripHTML,
  slackToHTML,
  firstLine,
  getRelativeTimeLabel,
  isoNow
} from "../utilities";
import {
  startOfToday,
  startOfYesterday,
  startOfWeek,
  startOfMonth,
  format,
  parseISO,
} from "date-fns";
import MessageTakeover from "./MessageTakeover.vue";

export default {
  props: {
    application: null,
    Message: null,
    dark: Boolean,
    dense: Boolean,
  },
  components: {
    MessageTakeover,
  },
  emits: [],
  setup(props) {
    const $q = useQuasar();
    const route = useRoute();

    const loaded = ref(null);
    const requesting = ref(null);
    const pagination = ref({
      page: 1,
      total: null,
      totalPages: null,
      more: true,
    });
    const loadedUntil = ref(null);
    const data = ref([]);
    const selected = ref(null);

    const sync = async () => {
      loadedUntil.value = null;
      pagination.value = {
        page: 1,
        total: null,
        totalPages: null,
        more: true
      };
      data.value = [];
      selected.value = null;
      loaded.value = null;

      // set data to notifications matching filter
      const { application, Message } = props;
      const applicationUserId = application.user?.id;
      if (!applicationUserId) {
        return;
      }
      const cache = Message ? Message.cache : null;
      if (cache) {
        cache.load();
        data.value = Object.entries(cache.data)
          .filter(([_, item]) => {
            const itemUserId = item.user;
            return (
              itemUserId === applicationUserId && !item.closed_at && item.in_app
            );
          })
          .map(([_, item]) => processMessage(item));

        loaded.value = !!data.value.length;
        data.value.forEach((item, index) => {
          item.index = index;
        });
        await onLoad(null, null, { replace: true });
      }
    };

    onMounted(sync);
    watch(() => props.application.user?.id, sync);

    const getMessageColor = (field, target) => {
      const relation = props.Message.getRelationFromField(field);
      return relation ? relation.getStyle(target) : null;
    };
    const getMessageTarget = (message) => {
      let result = null;
      MESSAGE_TARGETS.forEach((target) => {
        if (!result && !!message[target]) {
          const relation = props.Message.getRelationFromField(target);
          const value = relation.getRecord(message[target]) || message[target];
          result = [target, value];
        }
      });
      return result || [null, null];
    };
    const getMessageIcon = (field) => {
      const relation = props.Message.getRelationFromField(field);
      return relation ? `mdi-${relation.icon}` : null;
    };
    const processMessage = (message) => {
      const result = {
        message: message
      };
      const [fieldName, target] = getMessageTarget(message);
      if (fieldName && target) {
        result.color = getMessageColor(fieldName, target);
        result.icon = getMessageIcon(fieldName, target);
        result.resource = props.Message.getRelationFromField(fieldName);
      } else {
        result.icon = "mdi-bell";
        result.color = 'black'
        result.resource = null;
      }
      result.id = message.id;
      result.body = `${slackToHTML(firstLine(message.body))}`;
      const line = `<p>${firstLine(message.body)}</p>`;
      result.title = `${stripHTML(line)}`;
      result.target = target;
      result.status =
        message.acknowledged_at === null
        ? message.closed_at === null
        ? "Unread"
        : "Archived"
        : "Read";
      result.created = parseISO(message.created);
      result.time = getRelativeTimeLabel(message.created);
      return result;
    };
    const MESSAGE_TARGETS = [
    ];
    const include = {
      ...Object.fromEntries(MESSAGE_TARGETS.map((target) => [target, true])),
      children: false,
      attachments: false,
      parent: false,
    };
    const onLoad = async (_, done, options) => {
      if (requesting.value || !pagination.value.more) {
        return;
      }
      const until = loadedUntil.value;
      const { Message } = props;
      const $requesting = (requesting.value = new AbortController());
      let response;
      const filter = [
        { "user.$isme": null },
        { "closed_at.$isnull": null },
        { "in_app.$istrue": null },
      ];
      if (until) {
        // use "created" instead of pagination
        filter.push({ "created.$ltd": until });
      }
      try {
        response = await Message.getAPI({
          view: "list",
          sort: ["-created"],
          include,
          filter,
          perPage: loaded.value ? 25 : 10,
          deferred: false,
          signal: $requesting.signal,
        });
      } catch (e) {
        console.error(e);
        requesting.value = null;
        let error = e;
        const href = window.location.href;
        if (href.indexOf('guide=') > -1 || href.indexOf('help=') > -1) {
          // show an error popup unless guide/help is being shown
          e = handleError($q, e, 'Messages: ');
        }
        if (done) {
          done();
        }
        return error;
      }

      requesting.value = null;
      const meta = response.data.meta;

      if (meta) {
        if (meta.total_pages) {
          pagination.value.totalPages = meta.total_pages;
          pagination.value.more = meta.total_pages > meta.page;
        }
        if (meta.total_results) {
          pagination.value.total = meta.total_results;
        }
        if (meta.more_pages) {
          pagination.value.more = true;
        }
      }
      let responseData = response.data[Message.name];
      if (responseData.length) {
        loadedUntil.value = responseData[responseData.length - 1].created;
        responseData = responseData.map(processMessage);
        if (!data.value.length || (options && options.replace)) {
          data.value = responseData;
        } else {
          data.value.splice(data.value.length, 0, ...responseData);
          //let prevRowCount = data.value.length;
          //if (prevRowCount === selected.value.length){
          //  selected.value.splice(selected.value.length, 0, ...data);
          //}
        }
        data.value.forEach((item, index) => {
          item.index = index;
        });
        loaded.value = true;
      }
      if (done) {
        done();
      }
    };
    const getStartOf = (when) => {
      const now = new Date();
      if (when === "day") {
        return startOfToday();
      } else if (when === "yesterday") {
        return startOfYesterday();
      } else if (when === "week") {
        return startOfWeek(now);
      } else if (when === "month") {
        return startOfMonth(now);
      }
      return now;
    };
    const getMonthOf = (when) => format(when, "MMM yyyy");

    const separators = [
      ["Today", getStartOf("day")],
      ["Yesterday", getStartOf("yesterday")],
      ["This Week", getStartOf("week")],
      ["This Month", getStartOf("month")],
    ];
    const getGroupName = (item) => {
      let result = null;
      separators.forEach((separator) => {
        if (!result && separator[1] < item.created) {
          result = separator[0];
        }
      });
      if (!result) {
        // get month of
        result = getMonthOf(item.created);
      }
      return result;
    };
    const getGroups = ($data) => {
      return $data.reduce((acc, item) => {
        const group = getGroupName(item);
        if (!acc[group]) {
          acc[group] = { name: group, items: [] };
        }
        acc[group].items.push(item);
        return acc;
      }, {});
    };
    const groups = computed(() => {
      return getGroups(data.value);
    });
    const skeleton = Array(50).fill(0);
    const click = (item) => {
      selected.value = item;
      onRead();
    };
    const onClose = () => (selected.value = null);

    const onArchived = async () => {
      const $selected = selected.value;
      const now = isoNow();
      const index = $selected.index;
      let messageResponse = await props.Message.patchAPI({
        relations: false,
        id: $selected.id,
        changes: {
          closed_at: now,
        }
      });
      messageResponse = messageResponse.data;
      data.value[index].message = messageResponse.message;
      data.value[index].status = 'Unread';
    };
    const onUnread = async () => {
      const $selected = selected.value;
      const index = $selected.index;
      $selected.status = 'Unread';
      let messageResponse = await props.Message.patchAPI({
        relations: false,
        id: $selected.id,
        changes: {
          closed_at: null,
          acknowledged_at: null
        }
      });
      messageResponse = messageResponse.data;
      data.value[index].message = messageResponse.message;
      data.value[index].status = 'Unread';
    };
    const onRead = async () => {
      const $selected = selected.value;
      const now = isoNow();
      const index = $selected.index;
      $selected.status = 'Read';
      let messageResponse = await props.Message.patchAPI({
        id: $selected.id,
        relations: false,
        changes: {
          closed_at: null,
          acknowledged_at: now
        }
      });
      messageResponse = messageResponse.data;
      data.value[index].message = messageResponse.message;
      data.value[index].status = 'Read';
      if ($selected) {
        $selected.message = messageResponse.message;
      }
    };
    return {
      groups,
      pagination,
      click,
      onLoad,
      loaded,
      selected,
      skeleton,
      onClose,
      onUnread,
      onRead,
      onArchived
    };
  },
};
</script>
