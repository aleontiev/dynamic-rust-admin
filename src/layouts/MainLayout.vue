<style lang="scss">
.bigger {
  margin-left: 10px;
  transform: scale(1.25);
  padding-bottom: 1px;
}
.q-item.active .q-item__title {
  border-bottom: 2px solid var(--q-primary);
  max-width: fit-content;
  color: var(--q-primary);
}
.q-item:not(.active) .q-item__title {
  &.dark {
    color: white;
  }
  &:not(.dark) {
    color: black;
  }
}
</style>
<template>
  <q-layout v-if="application.authenticated" view="lHh Lpr lFf">
    <q-header
      elevated
      :class="{
        'bg-black': !application.editing && dark,
        'bg-primary': application.editing,
        'bg-grey-1': !application.editing && !dark,
        'text-white': (!fullscreen && !dark) || application.editing,
        loaded: application.loaded,
        'text-black': (!dark || fullscreen) && !application.editing,
        'bg-transparent': fullscreen,
      }"
      style="overflow: hidden"
      v-if="application.loaded"
    >
      <q-toolbar :class="{ 'q-pr-none q-pl-none': searching && dense }">
        <q-btn
          v-if="
            (!searching || application.editing || !dense) &&
            !application.editing
          "
          flat
          dense
          round
          :icon="pageIcon"
          aria-label="menu button"
          @click="toggleLeftDrawer"
        />
        <q-icon
          v-else-if="application.editing"
          :name="pageIcon"
          aria-label="edit mode is enabled"
        />

        <q-toolbar-title
          v-if="!searching || application.editing || !dense"
          class="flex items-center"
          @click="hasViews ? (viewDropdownOpen = false) : null"
        >
          <span
            :class="{
              'ellipsis text-h6': true,
              clickable: hasViews || isHomePage,
            }"
            @click.stop.prevent="
              isHomePage
                ? (dashboardDropdownOpen = !dashboardDropdownOpen)
                : hasViews
                ? (viewDropdownOpen = !viewDropdownOpen)
                : null
            "
          >
            <span>{{ pageTitle }}</span>
            <q-icon
              :name="
                viewDropdownOpen ? 'keyboard_arrow_up' : 'keyboard_arrow_down'
              "
              class="q-ml-xs"
              v-if="
                !application.editing && (hasViews || isHomePage) && !fullscreen
              "
            />
          </span>
          <DashboardDropdown
            v-if="isHomePage && !application.editing"
            :dense="dense"
            :dark="dark"
            @input="dashboardDropdownOpen = $event"
            @add="addDashboard"
            :value="dashboardDropdownOpen"
            :dashboard="currentDashboard"
            :dashboards="dashboards"
            @select="selectDashboard"
          />
          <ViewDropdown
            v-else-if="hasViews"
            :dense="dense"
            :dark="dark"
            @input="viewDropdownOpen = $event"
            :value="viewDropdownOpen"
            :resource="currentResource"
            :view="currentView"
            :views="views"
            @select="selectView"
          />
        </q-toolbar-title>

        <div
          :class="{
            'row no-wrap': true,
            'mw-50vw': searching && !dense,
            'q-pl-md q-pr-md full-width': dense && searching,
          }"
          v-if="!application.editing"
        >
          <q-menu
            no-focus
            fit
            no-parent-event
            persistent
            ref="searchResultsMenu"
            :offset="[0, 5]"
          >
            <q-list>
              <SearchResult
                @click="searching = false"
                :dense="dense"
                v-for="(result, index) in searchResults"
                :key="index"
                :result="result"
              />
              <q-item class="justify-center items-center text-grey text-center">
                <span v-if="!searchInProgress">
                  <span v-if="searchResults.length">
                    ------ End of results ------
                  </span>
                  <span v-else> ------ No results ------ </span>
                </span>
                <span v-else> Searching ... </span>
              </q-item>
            </q-list>
          </q-menu>
          <q-btn
            flat
            dense
            round
            v-if="!application.editing && !fullscreen"
            icon="search"
            class="q-mr-sm"
            aria-label="search button"
            @click="!searching && toggleSearch()"
          >
          </q-btn>
          <q-btn
            flat
            dense
            round
            v-if="!searching && copilotEnabled"
            icon="mdi-creation"
            class="q-mr-sm"
            aria-label="copilot button"
            @click="showCopilotDialog = true"
          />
          <UserDropdown
            :application="application"
            v-if="!searching"
            :dark="dark"
            :dense="dense"
          />
          <CopilotDialog
            :value="showCopilotDialog"
            @input="showCopilotDialog = $event"
            :dense="dense"
            :dark="dark"
            :user="application.user"
          />
          <q-input
            :dark="dark"
            :color="
              searchInProgress
                ? 'blue'
                : searchResults.length
                ? 'primary'
                : 'orange'
            "
            :debounce="250"
            placeholder="search..."
            aria-label="search input"
            ref="searchInputRef"
            :class="{
              'relative full-width': true,
              'display-none': !searching || application.editing,
            }"
            dense
            v-model="searchInput"
          >
            <div
              v-if="searchInProgress"
              class="absolute"
              style="bottom: 1px; height: 2px; left: 0; right: 0"
            >
              <q-linear-progress indeterminate color="blue" />
            </div>
          </q-input>
          <q-btn
            v-if="searching && !application.editing"
            flat
            dense
            round
            icon="close"
            aria-label="close search"
            @click="toggleSearch"
          />
        </div>
      </q-toolbar>
    </q-header>
    <q-spinner
      style="margin-left: -4em; margin-top: -4em"
      size="8rem"
      v-else
      color="primary"
      class="absolute-center"
    />

    <q-drawer
      behavior="default"
      v-model="leftDrawerOpen"
      :width="180"
      bordered
      :class="{ 'bg-grey-1': !dark, 'bg-black': dark }"
    >
      <div class="absolute-top" style="z-index: 10">
        <q-item
          @click="leftDrawerOpen = false"
          clickable
          v-ripple
          :class="{
            'bg-grey-1 text-black': !dark,
            'text-h6': true,
            'bg-black text-white': dark,
          }"
          style="padding-top: 0; padding-bottom: 0"
        >
          <q-item-section>
            <q-img class="bigger" fit="contain" v-if="dark" :src="drawerLogo" />
            <q-img class="bigger" fit="fill" v-else :src="drawerLogo" />
          </q-item-section>
          <q-item-section style="white-space: pre"> </q-item-section>
        </q-item>
      </div>
      <q-list
        :class="{ 'q-pt-xl': true, 'bg-black': dark, 'bg-grey-1': !dark }"
      >
        <q-expansion-item
          :dark="dark"
          expand-separator
          default-opened
          :label="resourceSection.section"
          v-for="resourceSection of resourceSections"
          :key="resourceSection.section"
          header-class="text-h7"
        >
          <q-list>
            <q-item
              :to="getResourceUrl(resource)"
              clickable
              v-ripple
              v-for="resource of resourceSection.resources"
              :key="resource.name"
              :class="{
                'bg-black text-white': dark,
                'text-h8': true,
                active:
                  currentResource && resource.name === currentResource.name,
              }"
            >
              <q-item-section side v-if="resource.icon">
                <q-icon
                  :name="getResourceIcon(resource)"
                  :color="
                    currentResource && resource.name === currentResource.name
                      ? 'primary'
                      : textColor
                  "
                />
              </q-item-section>
              <q-item-section>
                <span :class="{ 'q-item__title': true, dark: dark }">
                  {{ resource.title }}
                </span>
              </q-item-section>
            </q-item>
          </q-list>
        </q-expansion-item>
      </q-list>
    </q-drawer>

    <q-page-container v-if="application.loaded" class="page-content-container">
      <router-view />
    </q-page-container>
    <HelpDialog :dark="dark" :dense="dense" />
    <GuideDialog :dark="dark" :dense="dense" />
  </q-layout>
  <q-spinner
    style="margin-left: -4em; margin-top: -4em"
    v-else
    size="8em"
    class="absolute-center"
    color="primary"
  />
</template>

<script>
import { useQuasar, setCssVar } from "quasar";
import { onMounted, defineComponent, ref, computed, watch } from "vue";
import { useStore } from "vuex";
import { useRoute, useRouter } from "vue-router";
import { BRAND, COPILOT_URL, FEATURES } from "../config";
import { buildAdd } from "../utilities";
import {
  SearchResult,
  UserDropdown,
  DashboardDropdown,
  ViewDropdown,
  HelpDialog,
  GuideDialog,
  CopilotDialog,
} from "../components";
import api from "../api";

const createField = (model, field) => {
  let result = model.attr(field.default || undefined);
  if (field.nullable) {
    result = result.nullable();
  }
  return result;
};

const createModel = (model, data) => {
  return class extends model {
    static entity = data.name;
    static fields() {
      return Object.fromEntries(
        Object.entries(data.fields).map(([name, field]) => [
          name,
          createField(this, field),
        ])
      );
    }
  };
};

export default defineComponent({
  name: "MainLayout",

  components: {
    UserDropdown,
    DashboardDropdown,
    ViewDropdown,
    SearchResult,
    GuideDialog,
    HelpDialog,
    CopilotDialog,
  },

  setup() {
    const store = useStore();
    const router = useRouter();
    const database = store.$db();
    api.setDatabase(database);
    const Application = database.model("_application");
    const Resource = database.model("_resources");

    const application = computed(() => Application.getInstance());
    const dark = computed(() => $q.dark.isActive);
    const drawerLogo = computed(() =>
      dark.value ? BRAND.logoDark : BRAND.logo
    );
    // immediately mark application as not loaded to prevent pages from loading data
    Application.updateInstance({
      authenticated: false,
      loaded: false,
    });
    const route = useRoute();
    const currentResource = computed(() =>
      route.path === "/"
        ? Resource.find("users")
        : Resource.find(route.path.split("/")[1])
    );
    const currentResourceName = computed(() =>
      currentResource.value ? currentResource.value.name : null
    );
    const searching = ref(false);
    const showCopilotDialog = ref(false);
    const searchInput = ref(null);
    const profileMenuOpen = ref(false);
    const viewDropdownOpen = ref(false);
    const dashboardDropdownOpen = ref(false);
    const searchInputRef = ref(null);
    const searchResults = ref([]);
    const searchResultsMenu = ref(null);
    const searchInProgress = ref(null);

    const checkRedirects = () => {
      onViewRedirect(viewRedirect.value);
      onDashboardRedirect(dashboardRedirect.value);
    };
    const applyColorMode = (user) => {
      let localPreference;
      try { localPreference = user?.id ? localStorage.getItem(`dream-admin-theme:${user.id}`) : null; } catch (_) { /* Embedded browsers can disable storage. */ }
      const preference = localPreference === 'true' ? true : localPreference === 'false' ? false : user?.data?.dark;
      const enabled =
        typeof preference === "boolean"
          ? preference
          : FEATURES.coreOnly || $q.dark.isActive;
      setCssVar(
        "colorscheme",
        enabled ? "dark" : "light",
        document.documentElement
      );
      $q.dark.set(enabled);
    };
    onMounted(async () => {
      const app = application.value;
      applyColorMode(app.user);

      if (app.loaded) {
        checkRedirects();
        return;
      }

      if (app.user) {
        // short-circuit authentication
        Application.updateInstance({
          loaded: true,
          editing: false,
          authenticated: true,
        });
        // sync metadata (views/dashboards/guides)
        // do not re-sync options
        await Application.refreshMetadata({ schema: false });
        checkRedirects();
        return;
      }

      // no user => check authentication and refresh the user data
      const authed = await api.isAuthenticated();
      if (!authed) {
        try {
          await api.login(route.query.jwt);
        } catch (error) {
          return;
          // TODO: create a new login failed view to go to in case of a bad login attempt
        }
      }
      if (route.query.jwt) {
        // remove the JWT from query params
        router.replace({
          name: route.name,
          query: { ...route.query, jwt: undefined },
          params: route.params,
        });
      }
      const [userResponse, s3Credentials] = await Promise.all([
        api.get("users/me", { params: { "include[]": "can_impersonate" } }),
        api.getS3(),
      ]);
      const user = userResponse.data.user;
      const refresh =
        !app.user || app.user.id !== user.id || !Resource.query().count();

      app.user = user;
      Application.updateInstance({
        user,
        authenticated: true,
        editing: false,
        s3Credentials: s3Credentials.data,
      });

      applyColorMode(user);

      if (refresh) {
        // new user logged in or first-time login
        // -> refresh the schema and metadata
        setTimeout(async () => {
          await Application.refreshMetadata({ user: false, s3: false });
          checkRedirects();
          // database.register(createModel(Model, Resource.find("users")));
          Application.updateInstance({
            loaded: true,
          });
        }, 0);
      } else {
        checkRedirects();
        Application.updateInstance({
          loaded: true,
        });
      }
    });

    const resources = computed(() =>
      Resource.query()
        .where((x) => x.canList())
        .get()
    );
    const resourceSections = computed(() =>
      Object.entries(
        resources.value
          .filter((_) => true)
          .sort((a, b) => a.name.localeCompare(b.name))
          .reduce((acc, resource) => {
            let section = resource.section;
            if (!section) {
              if (section === "") {
                return acc;
              }
              section = "System";
            }
            if (!acc[section]) {
              acc[section] = [];
            }
            acc[section].push(resource);
            return acc;
          }, {})
      )
        .map(([section, resources]) => ({
          section,
          resources,
        }))
        .sort((a, b) => {
          const a_ = a.section;
          const b_ = b.section;
          if (a_ === b_) {
            return 0;
          }
          if (a_ < b_) {
            return -1;
          }
          return 1;
        })
    );
    const pageTitle = computed(() => {
      if (route.name === "record") {
        return currentResource.value ? currentResource.value.singularTitle : "";
      } else {
        if (route.query.view && currentResource.value) {
          const $views = Application.getViews(currentResource.value.name);
          if ($views && $views[route.query.view]) {
            return $views[route.query.view].name;
          }
        } else if (route.query.dashboard) {
          const $dashboards = dashboards.value;
          if ($dashboards && $dashboards[route.query.dashboard]) {
            return $dashboards[route.query.dashboard].name;
          }
          return "Home";
        }
        return drawerTitle.value;
      }
    });
    const drawerTitle = computed(() => {
      if (route.path === "/") {
        return "Home";
      } else if (currentResource.value) {
        return currentResource.value.title;
      }
      return null;
    });
    const pageIcon = computed(() => {
      if (application.value.editing) {
        return "edit";
      }
      return "menu";
      /*
      if (currentDashboardKey.value) {
        return "mdi-view-dashboard";
      }
      if (application.value.loaded) {
        return pageTitle.value === "Home"
          ? "home"
          : `mdi-${currentResource.value.icon}`;
      }
      return "";
      */
    });
    const $q = useQuasar();

    const currentDashboardKey = computed(() => route.query.dashboard);
    const currentViewKey = computed(() => route.query.view);
    const viewRedirect = computed(() => route.query.v);
    const dashboardRedirect = computed(() => route.query.d);
    const dashboards = computed(() => {
      const Dashboards = Resource.find("dashboards");
      return Dashboards ? Dashboards.getRecords() : {};
    });
    const views = computed(() =>
      currentResourceName.value && route.name === "resource"
        ? Application.getViews(currentResourceName.value)
        : null
    );
    const currentView = computed(() => {
      const $views = views.value;
      if (!$views) {
        return null;
      }
      const $key = currentViewKey.value;
      if (!$key) {
        return null;
      }
      return $views[$key] || null;
    });
    const currentDashboard = computed(() => {
      const $dashboards = dashboards.value;
      if (!$dashboards) {
        return null;
      }
      const $key = currentDashboardKey.value;
      if (!$key) {
        return null;
      }
      return $dashboards[$key] || null;
    });

    const isHomePage = computed(() => route.path === "/");
    const hasViews = computed(
      () => views.value && Object.keys(views.value).length
    );
    const selectView = (key, replace = false) => {
      const query = key
        ? { ...route.query, view: key, v: undefined }
        : { ...route.query, view: undefined, v: undefined };
      const method = replace ? router.replace : router.push;
      method({ name: route.name, query, params: route.params });
    };
    const addDashboard = async (newName) => {
      const Dashboard = Resource.find("dashboards");
      const then = (dashboard) => selectDashboard(dashboard.id);
      const add = buildAdd({
        dark,
        resource: Dashboard,
        data: { value: { name: newName } },
        quasar: $q,
        then,
      });
      await add();
    };
    const selectDashboard = (key, replace = false) => {
      const query = key
        ? { ...route.query, dashboard: key, d: undefined }
        : { ...route.query, dashboard: undefined, d: undefined };
      const method = replace ? router.replace : router.push;
      method({ name: route.name, query, params: route.params });
    };
    const search = async (value) => {
      const localResults = Application.searchLocal(value);
      searchResults.value = [];
      if (localResults) {
        searchResults.value.splice(0, 0, ...localResults);
      }
      if (value) {
        if (searchInProgress.value) {
          searchInProgress.value.abort();
        }
        const control = (searchInProgress.value = new AbortController());
        const resource = currentResource.value;
        const resourceName = resource.name;
        if (resource) {
          try {
            const response = await resource.getAPI({
              view: "list",
              filter: value,
              signal: control.signal,
            });
            searchInProgress.value = null;
            searchResults.value.push(
              ...response.data[resourceName].map((record) => ({
                record,
                resource,
              }))
            );
          } catch (error) {
            // TODO: handle error
          }
        }
      }
    };
    const logout = async () => {
      await api.logout();
    };
    const home = () =>
      route.path === "/" ? (leftDrawerOpen.value = false) : router.push("/");
    const getResourceIcon = (resource) => `mdi-${resource.icon}`;
    const getResourceUrl = (resource) => `/${resource.name}`;
    const toggleLeftDrawer = () => {
      if (!application.value.editing) {
        leftDrawerOpen.value = !leftDrawerOpen.value;
      }
    };
    const toggleSearch = () => (searching.value = !searching.value);
    const getResourceColor = (resource) =>
      resource.title === pageTitle.value ? "primary" : "white";
    const gotoResource = () => router.push(`/${currentResource.value.name}/`);
    const dense = computed(() => $q.screen.lt.md);
    const leftDrawerOpen = ref(dense.value ? false : true);

    const makeOnRedirect = (type) => (value) => {
      if (!value) {
        return;
      }
      const resourceName = type + "s";
      const resource = Resource.find(resourceName);
      const records = resource.getRecords();
      if (!records) {
        // might not have loaded yet
        return;
      }
      const record = records[value];
      if (!record) {
        // might not have loaded yet
        return;
      }
      const selector = type === "view" ? selectView : selectDashboard;
      // select with replacement
      return selector(record.id, true);
    };
    const onViewRedirect = makeOnRedirect("view");
    const onDashboardRedirect = makeOnRedirect("dashboard");
    watch(viewRedirect, onViewRedirect);
    watch(dashboardRedirect, onDashboardRedirect);
    watch(searchInput, async (value) => {
      if (searching.value) {
        await search(value);
      }
    });
    watch(searching, () => {
      if (searching.value) {
        setTimeout(() => {
          searchInputRef.value.focus();
          setTimeout(() => {
            searchResultsMenu.value.show();
          }, 50);
          search();
        }, 50);
      } else {
        searchInput.value = null;
        searchResultsMenu.value.hide();
      }
    });

    const fullscreen = computed(
      () => typeof route.query.fullscreen !== "undefined"
    );
    const textColor = computed(() => {
      return dark.value ? "white" : "black";
    });
    return {
      appName: BRAND.name,
      copilotEnabled: !!COPILOT_URL,
      application,
      currentResource,
      currentView,
      dark,
      dense,
      drawerLogo,
      drawerTitle,
      getResourceColor,
      getResourceIcon,
      getResourceUrl,
      gotoResource,
      hasViews,
      home,
      leftDrawerOpen,
      logout,
      pageIcon,
      pageTitle,
      profileMenuOpen,
      resourceSections,
      resources,
      route,
      searchInProgress,
      searchInput,
      searchInputRef,
      searchResults,
      searchResultsMenu,
      searching,
      selectView,
      toggleLeftDrawer,
      toggleSearch,
      viewDropdownOpen,
      dashboardDropdownOpen,
      views,
      currentDashboard,
      selectDashboard,
      addDashboard,
      dashboards,
      isHomePage,
      fullscreen,
      textColor,
      showCopilotDialog,
    };
  },
});
</script>
