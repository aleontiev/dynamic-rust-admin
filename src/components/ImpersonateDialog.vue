<style lang='scss'>
.userRecord.selected {
  &.dark {
    background-color: $grey-9;
  }
  &:not(.dark) {
    background-color: $grey-3;
  }

}
</style>
<template>
  <q-dialog
    :persistent="refreshing"
    v-model="isOpen"
    :class="{ 'dense': dense }"
    transition-show="fade"
    transition-hide="fade"
    :full-height="false"
    :fullscreen="false"
    :maximized="false"
  >
    <q-card class="q-dialog-plugin">
      <q-card-section>
        <span class="text-h6">
          <q-icon name="mdi-incognito" class="q-mr-sm"/>
          <span v-if="refreshing">
            Starting impersonation of "{{ selection.name }}"...
          </span>
          <span v-else>Impersonate another user</span>
        </span>
      </q-card-section>
      <q-card-section v-if="refreshing" class="row justify-center">
        <q-spinner color="primary" size="lg"/>
      </q-card-section>
      <q-card-section v-if="!refreshing">
        <q-input
          :debounce="250"
          type="text"
          placeholder="Enter their name or email"
          v-model="input"
          clearable
          :loading="searching"
        />
      </q-card-section>

      <q-card-section v-if="users && !refreshing">
        <q-item
          @click="onClick(user)"
          clickable
          v-for="user in users"
          :key="user.id"
          :class="{
            dark: dark,
            userRecord: true,
            selected: selection && user.id === selection.id,
          }"
        >
          <q-item-section avatar>
            <q-avatar
              class="bg-lava"
              style="cursor: pointer"
            >
              <q-img
                style="object-fit: contain; width: 100%; height: 100%"
                v-if="user?.photo"
                :src="user?.photo"
                fit="contain"
              />
              <span v-else>{{ getInitials(user) }}</span>
            </q-avatar>
          </q-item-section>
          <q-item-section>
            {{ user.name }}
          </q-item-section>
        </q-item>
      </q-card-section>

      <q-card-actions align="right" v-if="selection && !refreshing">
        <q-btn @click="onStart" color="primary" label="Start" icon="mdi-check-bold" />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script>
import { computed, watch, ref } from "vue";
import { useStore } from "vuex";
import { setCssVar, useQuasar } from "quasar";
import { handleError } from "../utilities";

export default {
  props: ["dense", "dark", "application", "value"],
  components: {},
  emits: ["start", "input"],
  setup(props, context) {
    // global state
    const store = useStore();
    const database = store.$db();
    const Resource = database.model("_resources");
    const User = Resource.find("users");
    const $q = useQuasar();

    // local state
    const abort = ref(null);
    const users = ref([]);
    const input = ref("");
    const selection = ref(null);
    const searching = ref(false);
    const refreshing = ref(false);

    // methods
    const onStart = async () => {
      const $user = selection.value;
      refreshing.value = true;
      await props.application.startImpersonate($user);
      if (props.application?.user?.data?.dark) {
        setCssVar("colorscheme", "dark", document.documentElement);
        $q.dark.set(true);
      } else {
        setCssVar("colorscheme", "light", document.documentElement);
        $q.dark.set(false);
      }
      isOpen.value = false;
      refreshing.value = false;
      $q.notify({
        color: 'primary',
        message: 'Impersonation started',
        icon: 'done'
      });
    };
    const onClick = (user) =>{
      if (selection.value && selection.value.id === user.id) {
        selection.value = null;
      } else {
        selection.value = user;
      }
    };
    const getInitials = (user) => user?.name.substr(0, 1);
    const request = async () => {
      if (!User) {
        return; // stop
      }
      if (abort.value) {
        abort.value.abort();
        abort.value = null;
      }
      if (!input.value || !input.value.length) {
        users.value = [];
        return;
      }
      searching.value = true;
      abort.value = new AbortController();
      let response;
      try {
        response = await User.getAPI({
          view: "list",
          sort: ["email"],
          include: {'*': false, photo: true, name: true, id: true, roles: true},
          perPage: 11,
          other: {
            for_impersonate: 1,
            q: input.value,
          },
          signal: abort.value.signal,
        });
      } catch (e) {
        abort.value = null;
        return handleError($q, e);
      }

      abort.value = null;
      users.value = response.data.users;
      searching.value = false;
      if (selection.value) {
        selection.value = null;
      }
    };

    // computeds
    watch(input, request);
    const isOpen = computed({
      get() {
        return props.value;
      },
      set(next) {
        searching.value = false;
        input.value = '';
        users.value = [];
        context.emit("input", next);
      },
    });
    return {
      isOpen,
      users,
      selection,
      searching,
      refreshing,
      input,
      getInitials,
      onClick,
      onStart
    };
  },
};
</script>
