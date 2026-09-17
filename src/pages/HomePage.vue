<style lang="scss">
.view-card {
  width: 100%;
  height: 100%;
  min-height: 25vh;
}
.logo {
  border: 0;
  text-decoration: none;
  outline: none;
  max-height: 50px;
}
.core-home {
  max-width: 1180px;
  margin: 0 auto;
  padding: 36px 28px;
}
.core-home-resource {
  height: 100%;
  border: 1px solid rgba(128, 128, 128, 0.25);
  border-radius: 8px;
}
@media (max-width: 600px) {
  .core-home {
    padding: 24px 16px;
  }
}
</style>
<template>
  <q-page :class="{ 'full-screen': isProfileMode }">
    <div v-if="isProfileMode">
      <div v-if="roleDashboard">
        <DashboardCarousel
          :dashboard="roleDashboard"
          :dark="dark"
          :dense="dense"
        />
      </div>
      <div v-else-if="coreOnly" class="core-home">
        <div class="text-h5 q-mb-sm">Welcome to {{ appName }}</div>
        <p class="op-75 q-mb-lg">
          Browse your app's records using the sidebar or choose a resource
          below.
        </p>
        <q-banner
          rounded
          class="q-mb-xl"
          :class="dark ? 'bg-dark' : 'bg-grey-2'"
        >
          <template #avatar
            ><q-icon name="mdi-view-dashboard-outline"
          /></template>
          <div class="text-subtitle1">Your dashboard</div>
          <div v-if="!availableDashboards.length" class="op-75">
            No dashboard has been configured yet. Your available records are
            ready to view.
          </div>
          <div v-else class="q-gutter-sm q-mt-xs">
            <q-btn
              v-for="item in availableDashboards"
              :key="item.id"
              flat
              no-caps
              :label="item.name"
              :to="{ name: 'home', query: { dashboard: item.id } }"
            />
          </div>
        </q-banner>
        <h2 class="text-subtitle1 q-mb-md">Core resources</h2>
        <div class="row q-col-gutter-md">
          <div
            v-for="item in coreResources"
            :key="item.name"
            class="col-12 col-sm-6 col-lg-4"
          >
            <q-item
              clickable
              class="core-home-resource"
              :to="{ name: 'resource', params: { resource: item.name } }"
            >
              <q-item-section avatar
                ><q-icon :name="`mdi-${item.icon || 'database'}`"
              /></q-item-section>
              <q-item-section>
                <q-item-label>{{ item.title }}</q-item-label>
                <q-item-label caption>{{
                  coreResourceDescriptions[item.name]
                }}</q-item-label>
              </q-item-section>
              <q-item-section side
                ><q-icon name="chevron_right"
              /></q-item-section>
            </q-item>
          </div>
        </div>
      </div>
      <div v-else class="full-height full-width">
        <div class="row q-pt-xl">
          <q-img
            v-if="dark"
            class="logo q-mt-lg"
            fit="contain"
            :src="welcomeLogo"
          />
          <q-img v-else class="logo q-mt-lg" fit="contain" :src="welcomeLogo" />
        </div>
        <span
          class="rob-bold row text-center text-h5 justify-center q-pt-md"
          v-if="application.user"
          ><span>Welcome, </span
          ><span class="text-primary text-lava obj-bold"
            >&nbsp;{{ application.user?.name }}</span
          >
          <span>!</span>
        </span>
        <span
          class="row rob-bold text-center text-h6 items-center justify-center op-75"
          v-if="application.user && roleLabels.length"
        >
          <q-icon name="mdi-shield-account q-mr-sm" size="sm" />
          {{ roleLabels.join(", ") }}
        </span>
        <div class="q-pt-xl q-pb-xl op-0">.</div>
      </div>
      <div
        style="
          display: none;
          white-space: nowrap;
          height: 65px;
          top: 50px;
          overflow-x: auto;
          overflow-y: hidden;
          z-index: 101;
        "
        :class="{
          'text-h6 rob-bold row items-center q-pl-lg q-pt-sm q-pb-sm': true,
          'sticky q-pt-md q-pl-md scrollbar-sm': true,
          'bg-dark': dark,
          'bg-white': !dark,
        }"
      >
        <q-icon name="mdi-bell" size="sm" class="q-mr-sm" />
        <span class="q-mr-sm">Messages</span>
        <div v-if="false">
          <q-chip outline>Any</q-chip>
          <q-chip outline>Unread</q-chip>
          <q-chip outline>Newest</q-chip>
        </div>
      </div>
      <!--<MessageList
        :application="application"
        :Message="Message"
        v-if="isProfileMode"
        :dark="dark"
        :dense="dense"
        />-->
    </div>
    <div
      :class="{
        'full-screen': fullscreen,
        'page-content-container q-pb-xl': true,
        'dashboard-loaded': allDashboardCardsLoaded,
      }"
      v-else
    >
      <div
        v-if="!application.editing && !liveDashboardViews.length"
        class="absolute center row items-center justify-center"
      >
        <q-img
          class="col-12"
          style="
            border: 0;
            text-decoration: none;
            outline: none;
            height: 30vh;
            width: 60vw;
          "
          fit="contain"
          src="~/assets/no-data.svg"
        />
        <div class="text-center text-h6 q-pt-md col-12">
          <template v-if="canEditDashboard"
            ><q-icon class="q-pr-sm" name="edit" />to Add Views</template
          >
          <template v-else>This dashboard has no views yet.</template>
        </div>
      </div>
      <div
        v-if="showDashboardControls"
        :class="{
          'sticky q-pt-md q-pl-md scrollbar-sm': true,
          'bg-dark': dark,
          'bg-white': !dark,
        }"
        style="
          white-space: nowrap;
          height: 65px;
          top: 50px;
          overflow-x: auto;
          overflow-y: hidden;
          z-index: 101;
        "
      >
        <draggable
          :disabled="!application.editing || saving || selectedControl"
          handle=".q-chip__icon"
          v-model="liveDashboardControls"
          class="nowrap draggable-container inline-block"
        >
          <DashboardControl
            :editing="application.editing"
            v-for="(control, i) in liveDashboardControls"
            :changed="hasControlChanged(i)"
            :dark="dark"
            :dense="dense"
            :control="control"
            :key="control.id"
            :class="{ 'display-none': addingControl }"
            @change="controlValueChanged(control.id, $event)"
            @select="selectControl(i)"
            @focus="controlFocus(i)"
            @blur="controlBlur(i)"
            :selected="selectedControlIndex === i"
          />
        </draggable>
        <q-btn
          outline
          rounded
          icon="add"
          label="Control"
          class="button-dashed q-mr-sm"
          @click="addingControl = true"
          v-if="!addingControl && application.editing && !selectedControl"
        />
        <q-select
          behavior="menu"
          use-input
          ref="addingControlDropdown"
          v-model="addingControlValue"
          v-show="addingControl"
          @blur="addingControl = false"
          :options="addingControlOptions"
          class="absolute top left right bottom q-pl-md q-pr-md"
          style="z-index: 10"
        >
          <template v-slot:option="scope">
            <q-item :label="scope.opt.title">
              <q-item-section>{{ scope.opt.title }}</q-item-section>
            </q-item>
            <template v-for="child in scope.opt.children" :key="child.label">
              <q-item
                clickable
                v-ripple
                v-close-popup
                @click="addingControlValue = child"
              >
                <q-item-section side v-if="child.icon">
                  <q-icon :name="child.icon" />
                </q-item-section>
                <q-item-section>
                  <q-item-label class="q-ml-md">
                    <span v-html="child.label" />
                  </q-item-label>
                </q-item-section>
              </q-item>
            </template>
          </template>
        </q-select>
      </div>
      <draggable
        :disabled="!application.editing || saving"
        handle=".handle"
        v-model="liveDashboardViews"
        class="draggable-container q-pa-sm row items-start"
      >
        <div
          :class="{ 'col-xs-12 q-pa-sm': true, 'col-md-6': !fullscreen }"
          v-for="(view, i) in liveDashboardViews"
          :key="view"
        >
          <DashboardViewCard
            :view="view"
            :changed="hasViewChanged(i)"
            :linkChanged="hasLinkChanged(i)"
            :dark="dark"
            :dense="dense"
            :editing="application.editing"
            @remove="removeDashboardView(i)"
            @loaded="dashboardCardLoaded(i)"
            @link="dashboardCardLink(i, $event)"
            :selectedControl="selectedControl"
            :controls="dashboardControls"
            :controlData="controlData"
          />
        </div>
        <div
          :class="{ 'col-xs-12 q-pa-sm': true, 'col-md-6': !fullscreen }"
          v-if="application.editing && !saving && !deleting"
        >
          <q-card
            clickable
            :dark="dark"
            flat
            bordered
            class="view-card border-dashed border-2"
            @click="clickAddView"
          >
            <div class="text-h6 absolute center">
              <span v-if="!addingView && !selectedControl"> + Add View </span>
              <q-select
                behavior="menu"
                use-input
                ref="addingViewDropdown"
                v-model="addingViewValue"
                v-show="addingView"
                :options="addingViewOptions"
              >
                <template v-slot:option="scope">
                  <q-item :label="scope.opt.title">
                    <q-item-section>{{ scope.opt.title }}</q-item-section>
                  </q-item>
                  <template
                    v-for="child in scope.opt.children"
                    :key="child.label"
                  >
                    <q-item
                      clickable
                      v-ripple
                      v-close-popup
                      @click="addingViewValue = child"
                    >
                      <q-item-section>
                        <q-item-label class="q-ml-md">
                          <span v-html="child.label" />
                        </q-item-label>
                      </q-item-section>
                    </q-item>
                  </template>
                </template>
              </q-select>
            </div>
            <div
              v-if="addingView"
              @click.stop.prevent="addingView = false"
              class="absolute top right"
            >
              <q-icon
                name="close"
                size="sm"
                class="clickable q-mr-sm q-mt-sm"
              />
            </div>
          </q-card>
        </div>
      </draggable>
    </div>
    <div
      :class="{
        'absolute-bottom sticky': !dense,
        'fixed-bottom': dense,
        'full-width bottom-bar': true,
      }"
      style="z-index: 99"
      v-if="!fullscreen"
    >
      <ActionBar :dark="dark" v-if="!isProfileMode" right>
        <IconButton
          left
          flat
          label="Remove"
          icon="delete"
          :dense="dense"
          v-if="selectedControl"
          @click="removeSelectedControl"
          color="red-5"
        />
        <IconButton
          left
          flat
          label="Delete"
          icon="delete"
          :dense="dense"
          v-if="
            !isProfileMode &&
            Dashboards.canDelete(dashboard) &&
            !saving &&
            !application.editing &&
            !deleting
          "
          @click="showDelete"
          color="red-5"
        />
        <IconButton
          left
          :dense="dense"
          icon="close"
          label="Cancel"
          v-if="application.editing && !saving"
          @click="discard"
        />
        <IconButton
          :textColor="hasDashboardSettingChanges ? 'primary' : null"
          :dense="dense"
          icon="settings"
          label="Settings"
          v-if="application.editing && !saving && !selectedControl"
          @click="dashboardDialogOpen = true"
        />
        <IconButton
          v-if="!application.editing && !coreOnly"
          :dense="dense"
          icon="download"
          label="Export"
          @click="confirmExport"
        />
        <IconButton
          flat
          v-if="
            !application.editing &&
            !deleting &&
            !saving &&
            Dashboards.canWrite('data', dashboard)
          "
          label="Edit"
          icon="edit"
          :dense="dense"
          color="primary"
          @click="edit"
        />
        <IconButton
          :dense="dense"
          icon="done"
          :label="saveLabel"
          v-if="!saving && application.editing && hasDashboardChanges"
          color="primary"
          @click="save"
        />
      </ActionBar>
      <ActionBar :dark="dark" v-else-if="record" right>
        <IconButton
          :dense="dense"
          icon="close"
          label="Cancel"
          v-if="application.editing && !saving"
          @click="discard"
        />
        <IconButton
          label="Reset"
          icon="restart_alt"
          v-if="
            application.editing &&
            focused &&
            typeof changes[focused] !== 'undefined'
          "
          :dense="dense"
          @click="resetField"
        />
        <IconButton
          label="Table"
          icon="table_chart"
          v-if="
            !application.editing &&
            !saving &&
            canDisplayTable &&
            display !== 'table'
          "
          :dense="dense"
          @click="displayTable"
        />
        <IconButton
          label="List"
          icon="list"
          v-if="
            !application.editing &&
            !saving &&
            canDisplayTable &&
            display === 'table'
          "
          :dense="dense"
          @click="displayList"
        />
        <IconButton
          label="Add"
          icon="add"
          v-if="
            !application.editing &&
            focused &&
            !saving &&
            resource.canCreate(focused, record)
          "
          :dense="dense"
          @click="showAdd(focused)"
        />
        <IconButton
          :dense="dense"
          icon="done"
          :label="saveLabel"
          v-if="!saving && application.editing && Object.keys(changes).length"
          color="primary"
          @click="save"
        />
      </ActionBar>
    </div>
    <DashboardEditDialog
      :dense="dense"
      :dark="dark"
      :changes="dashboardChanges"
      :record="dashboard"
      :value="dashboardDialogOpen"
      @input="dashboardDialogOpen = $event"
      @update="onDashboardUpdate"
      @save="save"
    />
    <AddDialog
      :value="showAddDialog"
      @input="showAddDialog = $event"
      :dense="dense"
      :dark="dark"
      :resource="resource"
      :field="addDialogField"
      :record="record"
    />
  </q-page>
</template>

<script>
import { useQuasar } from "quasar";
import {
  onUnmounted,
  onMounted,
  watch,
  defineComponent,
  computed,
  ref,
  reactive,
} from "vue";
import {
  AddDialog,
  // MessageList,
  DashboardEditDialog,
  ActionBar,
  IconButton,
  DashboardViewCard,
  DashboardControl,
  DashboardCarousel,
} from "../components";
import { useRoute, useRouter } from "vue-router";
import { useStore } from "vuex";
import {
  buildSave,
  buildDelete,
  isEmpty,
  toTitleCase,
  isEqual,
  timeId,
} from "../utilities";
import { useHead } from "@vueuse/head";
import { VueDraggableNext } from "vue-draggable-next";
import api from "../api";
import { BRAND, FEATURES } from "../config";

export default defineComponent({
  components: {
    ActionBar,
    DashboardViewCard,
    DashboardControl,
    DashboardCarousel,
    DashboardEditDialog,
    IconButton,
    // MessageList,
    DashboardEditDialog,
    AddDialog,
    draggable: VueDraggableNext,
  },
  setup() {
    // use
    const $q = useQuasar();
    const route = useRoute();
    const router = useRouter();
    const store = useStore();
    const database = store.$db();
    const Resource = database.model("_resources");
    const Application = database.model("_application");

    // ref
    const loading = ref(0);
    const params = ref({});
    const changes = ref({});
    const enabled = ref(false);
    const saving = ref(false);
    const deleting = ref(false);

    // computed
    const dense = computed(() => $q.screen.lt.md);
    const dark = computed(() => $q.dark.isActive);
    const welcomeLogo = computed(() =>
      dark.value ? BRAND.logoDark : BRAND.logo
    );
    const focused = computed(() => route.query.focused);
    const display = ref("list");
    const application = computed(() => Application.getInstance());
    const resource = computed(() => Resource.find("users"));
    const Dashboards = computed(() => Resource.find("dashboards"));
    const coreOnly = FEATURES.coreOnly;
    const appName = BRAND.name;
    const coreResourceDescriptions = {
      users: "People with access to this app",
      identities: "Sign-in identities linked to users",
      identity_verifications: "Identity verification records",
      roles: "Access roles and permissions",
      dashboards: "Available dashboard configurations",
      views: "Saved ways to view your records",
      providers: "Services connected to this app",
    };
    const coreResources = computed(() =>
      Resource.query()
        .where(
          (item) =>
            item.canList() &&
            Object.keys(coreResourceDescriptions).includes(item.name)
        )
        .get()
    );
    const availableDashboards = computed(() =>
      Object.values(Application.getDashboards())
    );
    const canEditDashboard = computed(
      () => !!Dashboards.value?.canWrite("data", dashboard.value)
    );
    const first = (x) =>
      x && typeof x === "object"
        ? Object.values(x)[0]
        : x && Array.isArray(x)
        ? x[0]
        : null;
    // The names of the roles the signed-in person holds: role ids resolve
    // through the users resource's role choices, legacy names stay as they are.
    const roleLabels = computed(() => {
      const user = application.value?.user;
      const roles = user?.role || user?.roles;
      const held = Array.isArray(roles)
        ? roles
        : typeof roles === "string"
        ? roles.split(",").map((x) => x.trim())
        : [];
      const Users = Resource.find("users");
      const choices = (Users && Users.fields.roles && Users.fields.roles.choices) || [];
      return held
        .filter((role) => role)
        .map((role) => {
          const choice = choices.find((c) => c.id === role || c.id === role?.id);
          return choice ? choice.label : role?.name || role;
        })
        .filter((label) => typeof label === "string" && label);
    });
    const roleDashboard = computed(() => {
      if (!Dashboards.value) {
        return null;
      }
      const user = application.value?.user;
      const roles = user?.role || user?.roles;
      const role = Array.isArray(roles)
        ? roles[0]
        : typeof roles === "string"
        ? roles.split(",")[0]
        : null;
      return role
        ? first(
            Dashboards.value.getRecords(
              (x) =>
                x.roles && x.roles.length === 1 && x.roles.indexOf(role) === 0
            )
          )
        : null;
    });
    const sections = computed(() => resource.value.getSections());
    const record = computed(() => {
      if (!application.value.user || !application.value.user?.id) {
        return null;
      }
      if (!resource.value) {
        return null;
      }
      return resource.value.getRecord(application.value.user?.id);
    });
    useHead({
      title: computed(() => {
        const $resource = resource.value;
        const $record = record.value;
        return $resource && $record
          ? `Home: ${$resource.getRecordName($record)}`
          : "Home";
      }),
    });
    const request = async (load) => {
      if (
        !resource.value ||
        !enabled.value ||
        !application.value ||
        !application.value.user ||
        !application.value.user.id
      ) {
        loading.value = 0;
        return; // stop
      }
      loading.value = load || 1;
      await Promise.all([
        resource.value.getAPI({ id: application.value.user?.id }),
        resource.value.getAPI({
          id: application.value.user?.id,
          deferred: true,
        }),
      ]);
      loading.value = 0;
    };
    const currentFields = computed(() =>
      resource.value
        .getFields()
        .filter((x) => x.name !== resource.value.id_field)
    );
    const formKey = computed(
      () => `users/${record.value ? record.value.id : ""}`
    );
    const saveLabel = computed(() => {
      const base = "Save";
      if (changes.value) {
        const len = Object.keys(changes.value).length;
        if (dense.value) {
          return len > 1 ? len : base;
        }
        return len > 1 ? `${base} ${len}` : base;
      }
      return base;
    });
    // functions
    const focus = (name) => {
      const query = { ...route.query, focused: name ? name : undefined };
      router.push({ name: route.name, query, params: route.params });
    };
    const copy = () => {
      if (!record.value) {
        return;
      }
      $q.notify({
        type: "positive",
        color: dark.value ? "grey-3" : "black",
        message: focused.value ? "Data copied" : "Link copied",
        icon: "link",
        timeout: 750,
        textColor: dark.value ? "black" : "white",
        classes: "full-width q-mr-none q-ml-none",
      });
      if (focused.value) {
        navigator.clipboard.writeText(
          resource.value.getExportValue(record.value, focused.value)
        );
      } else {
        navigator.clipboard.writeText(window.location.href); // resource.value.getLink(record.value));
      }
    };
    const dashboard = computed(() => {
      if (!Dashboards.value) {
        return null;
      }
      const id = dashboardId.value;
      return id ? Dashboards.value.getRecord(id) : null;
    });
    const allDashboardChanges = computed(() => {
      const record = dashboard.value;
      return {
        data: {
          ...(record.data || {}),
          views: liveDashboardViews.value,
          controls: liveDashboardControls.value,
        },
        ...dashboardChanges.value,
      };
    });
    const saveRecord = buildSave({
      changes,
      record,
      resource,
      Application,
      saving,
      quasar: $q,
    });
    const saveDashboard = buildSave({
      changes: allDashboardChanges,
      record: dashboard,
      resource: Dashboards,
      Application,
      saving,
      quasar: $q,
    });
    const save = async () => {
      if (isProfileMode.value) {
        await saveRecord();
      } else {
        await saveDashboard();
        resetDashboard();
      }
    };
    const resetDashboard = () => {
      dashboardChanges.value = {};
      dashboardViews.value = (dashboard.value.data || {}).views || [];
      dashboardControls.value = (dashboard.value.data || {}).controls || [];
      liveDashboardViews.value = [...dashboardViews.value];
      liveDashboardControls.value = JSON.parse(
        JSON.stringify(dashboardControls.value)
      );
      selectControl(null);
    };
    const discard = () => {
      selectControl(null);
      Application.stopEditing();
      dashboardChanges.value = {};
      liveDashboardViews.value = [...dashboardViews.value];
      liveDashboardControls.value = JSON.parse(
        JSON.stringify(dashboardControls.value)
      );
      addingControl.value = false;
      changes.value = {};
    };
    const edit = () => Application.startEditing();
    const update = (value) => {
      changes.value = value;
    };

    // hooks
    watch(formKey, async () => {
      if (!resource.value || !application.value.loaded) {
        // application or resources have not loaded yet
        return;
      }
      const $resource = "users";
      const $id = record.value?.id;
      if (!$id) {
        return;
      }
      if (
        params.value &&
        params.value.id === $id &&
        params.value.resource.name === $resource.name
      ) {
        // nothing changed
        return;
      }
      if (!resource.value.getRecord($id)) {
        params.value = {
          resource: $resource,
          id: $id,
        };
        await request(2);
      } else {
        // request anyway!
        await request();
      }
    });
    onMounted(async () => {
      enabled.value = true;
      if (dashboard.value) {
        resetDashboard();
      }
      if (application.value.loaded) {
        params.value = {
          resource: route.params.resource,
          id: route.params.id,
        };
        await request(2);
      }
    });
    onUnmounted(() => {
      enabled.value = false;
    });
    const resetField = () => {
      delete changes.value[focused.value];
    };
    const showAddDialog = ref(false);
    const canDisplayTable = computed(() => {
      const $resource = resource.value;
      const $focused = focused.value;
      const $record = record.value;
      return (
        $focused &&
        $record &&
        $resource &&
        $resource.fields[$focused].type === "many" &&
        !isEmpty($resource.getValue($record, $focused))
      );
    });
    const displayTable = () => {
      display.value = "table";
    };
    const displayList = () => {
      display.value = "list";
    };

    const isProfileMode = computed(() => !dashboardId.value);
    const addDialogField = ref(null);
    const addingView = ref(false);
    const addingViewDropdown = ref(null);
    const addingViewValue = ref(null);
    const addingViewOptions = computed(() => {
      const views = Application.getViews();
      const byResource = {};
      Object.entries(views).forEach(([id, view]) => {
        const $resource = view.resource;
        if (!byResource[$resource]) {
          byResource[$resource] = [];
        }
        byResource[$resource].push(view);
      });
      return Object.entries(byResource).map(([resource, views]) => {
        return {
          title: toTitleCase(resource),
          children: views.map((view) => ({ id: view.id, label: view.name })),
        };
      });
    });

    const addingControl = ref(false);
    const addingControlDropdown = ref(null);
    const addingControlValue = ref(null);
    const addingControlOptions = computed(() => {
      const base = [
        {
          title: "Simple Types",
          children: [
            {
              id: "simple.date",
              label: "Date",
              icon: "calendar_month",
            },
            {
              id: "simple.datetime",
              label: "Date + Time",
              icon: "mdi-calendar-clock",
            },
            {
              id: "simple.number",
              label: "Number",
              icon: "123",
            },
            {
              id: "simple.text",
              label: "Text",
              icon: "title",
            },
          ],
        },
      ];
      const resourceOptions = [];
      const fieldOptions = [];
      Resource.all()
        .sort((a, b) => a.name.localeCompare(b.name))
        .forEach((resource) => {
          resourceOptions.push({
            id: `resource.${resource.name}`,
            label: resource.title,
            icon: `mdi-${resource.icon}`,
          });
          Object.entries(resource.fields)
            .sort((a, b) => a[0].localeCompare(b[0]))
            .forEach(([name, field]) => {
              if (field.choices) {
                fieldOptions.push({
                  id: `field.${resource.name}.${name}`,
                  label: `${resource.title}: ${field.label}`,
                  icon: `mdi-${resource.icon}`,
                });
              }
            });
        });
      if (resourceOptions.length) {
        base.push({
          title: "Resource Types",
          children: resourceOptions,
        });
      }
      if (fieldOptions.length) {
        base.push({
          title: "Field Types",
          children: fieldOptions,
        });
      }
      return base;
    });

    const dashboardId = computed(() => route.query.dashboard);
    const dashboardViews = ref([]);
    const dashboardControls = ref([]);
    const liveDashboardViews = ref([]);
    const liveDashboardControls = ref([]);
    const addDashboardView = (id) => {
      // add a new view at the end of the list
      liveDashboardViews.value.push(id);
      addingViewValue.value = null;
      addingView.value = false;
      addingViewDropdown.value.hidePopup();
    };
    const addDashboardControl = (control) => {
      // timeId is used here
      liveDashboardControls.value.push({
        type: control.id,
        name: control.label,
        icon: control.icon,
        views: {},
        id: timeId(),
      });
      addingControlValue.value = null;
      addingControl.value = false;
      addingControlDropdown.value.hidePopup();
    };
    const removeDashboardView = (index) => {
      // remove a view at a given position
      liveDashboardViews.value.splice(index, 1);
    };

    watch(dashboard, (next) => {
      const $dashboard = next;
      if (!$dashboard) {
        dashboardViews.value = [];
        dashboardControls.value = [];
      } else {
        dashboardViews.value = ($dashboard.data || {}).views || [];
        dashboardControls.value = ($dashboard.data || {}).controls || [];
      }
      dashboardCardsLoaded.value = {};
      liveDashboardViews.value = [...dashboardViews.value];
      liveDashboardControls.value = JSON.parse(
        JSON.stringify(dashboardControls.value)
      );
    });
    watch(addingViewValue, (next) => {
      if (next) {
        const viewId = next.id;
        addDashboardView(viewId);
      }
    });
    watch(addingControlValue, (next) => {
      if (next) {
        addDashboardControl(next);
      }
    });

    watch(addingView, (next) => {
      if (next) {
        addingViewValue.value = null;
        setTimeout(() => addingViewDropdown.value.showPopup(), 0);
      }
    });

    watch(addingControl, (next) => {
      if (next) {
        addingControlValue.value = null;
        setTimeout(() => addingControlDropdown.value.showPopup(), 0);
      }
    });

    const showAdd = (e) => {
      addDialogField.value = e;
      showAddDialog.value = true;
    };
    const showDelete = () => {
      $q.dialog({
        title: "Please Confirm",
        class: dense.value ? "dense" : "",
        message:
          "Are you sure you want to delete this dashboard? This operation is permanent!",
        ok: "Yes",
        cancel: "No",
      }).onOk(async () => {
        await doDelete();
        Application.stopEditing();
      });
    };
    const doDelete = buildDelete({
      quasar: $q,
      resource: Dashboards,
      dark,
      record: dashboard,
      deleting,
      then: () =>
        router.replace({ name: "home", query: { dashboard: undefined } }),
    });
    const dashboardCardsLoaded = ref({});
    const allDashboardCardsLoaded = computed(() => {
      const loaded = dashboardCardsLoaded.value;
      return Object.keys(loaded).length === liveDashboardViews.value.length;
    });
    const dashboardCardLoaded = (index) => {
      dashboardCardsLoaded.value[index] = true;
    };
    const fullscreen = computed(
      () => typeof route.query.fullscreen !== "undefined"
    );
    const confirmExport = () => {
      $q.dialog({
        title: "Please Confirm",
        class: dense.value ? "dense" : "",
        message: `Are you sure you want to export this dashboard? All data will be sent to your email`,
        ok: "Yes",
        cancel: "No",
      }).onOk(async () => {
        let url = window.location.href;
        const path = url.match(/^(?:http:\/\/)?localhost(?:[:]\d+)?(\/.*)$/);
        if (path) {
          // replace localhost with equivalent dev server URL
          url = `${window.location.origin}${path[1]}`;
        }
        let response;
        try {
          response = await api.post("exports", { data: { request_url: url } });
        } catch (error) {
          $q.notify({
            timeouit: 0,
            type: "negative",
            color: "red",
            message: `Export request failed: ${getErrorMessage(error)}`,
            icon: "done",
            textColor: "white",
            noDismiss: true,
            persistent: true,
            classes: "full-width",
            multiline: false,
            actions: [
              {
                icon: "close",
                color: "white",
              },
            ],
          });
          return;
        }
        const exportRequest = response.data["export"];
        let message = `You will receive an email titled "${exportRequest.name}"`;
        if (!dense.value) {
          message = "Export in progress, once completed, " + message;
        }
        $q.notify({
          type: "positive",
          timeout: 5000,
          color: "primary",
          message,
          icon: "done",
          textColor: "white",
          noDismiss: false,
          persistent: true,
          classes: "full-width",
          multiline: false,
          actions: [
            {
              icon: "close",
              color: "white",
            },
          ],
        });
      });
    };
    const dashboardDialogOpen = ref(false);
    const dashboardChanges = ref({});
    const hasDashboardSettingChanges = computed(
      () => Object.keys(dashboardChanges.value).length
    );
    const hasDashboardChanges = computed(() => {
      return (
        Object.keys(dashboardChanges.value).length > 0 ||
        !isEqual(dashboardViews.value, liveDashboardViews.value) ||
        !isEqual(dashboardControls.value, liveDashboardControls.value)
      );
    });
    const onDashboardUpdate = (changes) => {
      dashboardChanges.value = changes;
    };
    const showDashboardControls = computed(() => {
      if (!dashboard.value || fullscreen.value) {
        return false;
      }
      return (
        application.value.editing ||
        Object.keys((dashboard.value.data || {}).controls || {}).length > 0
      );
    });
    const hasLinkChanged = (index) => {
      const newViews = liveDashboardViews.value;
      const viewId = newViews[index];
      if (selectedControl.value) {
        const $selectedControlIndex = selectedControlIndex.value;
        const $selectedControl = selectedControl.value;
        // check to see if the view has changed per selected control
        const liveValue = (
          liveDashboardControls.value[$selectedControlIndex] || {}
        ).views[viewId];
        const oldValue = ((dashboardControls.value[$selectedControlIndex] || {})
          .views || {})[viewId];
        return (liveValue || oldValue) && !isEqual(liveValue, oldValue);
      }
      return false;
    };
    const hasViewChanged = (index) => {
      const oldViews = dashboardViews.value;
      const newViews = liveDashboardViews.value;
      if (focusedControl.value && focusedControl.value.views[newViews[index]]) {
        return true;
      }
      if (index >= oldViews.length || index >= newViews.length) {
        return true;
      }
      if (!isEqual(oldViews[index], newViews[index])) {
        return true;
      }
      return false;
    };
    const hasControlChanged = (index) => {
      const olds = dashboardControls.value;
      const news = liveDashboardControls.value;
      if (index >= olds.length || index >= news.length) {
        return true;
      }
      return !isEqual(olds[index], news[index]);
    };
    const selectedControlIndex = ref(null);
    const selectControl = (i) => {
      selectedControlIndex.value = selectedControlIndex.value === i ? null : i;
    };
    const controlValueChanged = (id, data) => {
      // TODO: controls
      const cs = (liveDashboardControls.value || []).filter((c) => c.id === id);
      if (!cs.length) {
        return;
      }
      const control = cs[0];
      controlData[id] = data;
    };
    const controlData = reactive(
      Object.fromEntries(dashboardControls.value.map((c) => [c.id, null]))
    );
    const selectedControl = computed(() => {
      const index = selectedControlIndex.value;
      if (index === null) {
        return null;
      }
      return liveDashboardControls.value[index];
    });
    const removeSelectedControl = () => {
      const selected = selectedControlIndex.value;
      selectControl(null);
      liveDashboardControls.value.splice(selected, 1);
    };
    const clickAddView = () => {
      if (!selectedControl.value) {
        addingView.value = true;
      }
    };
    const dashboardCardLink = (index, link) => {
      const control = selectedControl.value;
      const views = liveDashboardViews.value;
      const viewId = views[index];
      if (!control.views) {
        control.views = {};
      }
      control.views[viewId] = link;
    };
    const focusedControls = ref({});
    const controlFocus = (i) => {
      Object.entries(focusedControls.value).forEach(
        () => (focusedControls.value[i] = false)
      );
      focusedControls.value[i] = true;
    };
    const controlBlur = (i) => {
      focusedControls.value[i] = false;
    };
    const focusedControl = computed(() =>
      focusedControlIndex.value !== null
        ? dashboardControls.value[focusedControlIndex.value]
        : null
    );
    const focusedControlIndex = computed(() => {
      let result = null;
      Object.entries(focusedControls.value).forEach(([key, value]) => {
        if (result !== null) {
          return result;
        }
        if (value) {
          result = key;
        }
      });
      return result;
    });
    const Message = computed(() => Resource.find("messages"));
    const time = ref(null);
    const interval = ref(null);
    const setTime = () => {
      time.value = Intl.DateTimeFormat(navigator.language, {
        hour: "numeric",
        minute: "numeric",
        second: "numeric",
      }).format();
    };
    onMounted(() => {
      interval.value = setInterval(setTime, 1000);
      setTime();
    });
    onUnmounted(() => {
      if (interval.value) {
        clearInterval(interval.value);
        interval.value = null;
      }
    });
    return {
      Message,
      showDelete,
      confirmExport,
      fullscreen,
      dense,
      dark,
      welcomeLogo,
      coreOnly,
      appName,
      coreResources,
      coreResourceDescriptions,
      availableDashboards,
      canEditDashboard,
      resource,
      record,
      loading,
      application,
      currentFields,
      focus,
      focused,
      formKey,
      copy,
      discard,
      edit,
      save,
      saveLabel,
      changes,
      saving,
      update,
      resetField,
      display,
      canDisplayTable,
      displayTable,
      displayList,
      showAddDialog,
      showAdd,
      addDialogField,
      isProfileMode,
      addingView,
      addingViewDropdown,
      addingViewValue,
      addingViewOptions,
      addingControl,
      addingControlValue,
      addingControlDropdown,
      addingControlOptions,
      liveDashboardViews,
      removeDashboardView,
      dashboardCardLoaded,
      dashboardCardLink,
      allDashboardCardsLoaded,
      dashboardDialogOpen,
      Dashboards,
      dashboard,
      onDashboardUpdate,
      dashboardChanges,
      deleting,
      saveDashboard,
      showDashboardControls,
      liveDashboardControls,
      hasDashboardChanges,
      hasViewChanged,
      hasLinkChanged,
      hasControlChanged,
      hasDashboardSettingChanges,
      selectControl,
      selectedControlIndex,
      selectedControl,
      removeSelectedControl,
      controlValueChanged,
      clickAddView,
      controlData,
      controlFocus,
      controlBlur,
      dashboardControls,
      roleDashboard,
      roleLabels,
      time,
    };
  },
});
</script>
