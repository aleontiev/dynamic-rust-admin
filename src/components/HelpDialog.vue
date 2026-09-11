<template>
  <q-dialog
    v-model="isOpen"
    :class="{ dense: dense, 'large right': true }"
    :maximized="true"
    position="bottom"
  >
    <q-card :class="{ 'q-pt-xl': dense }">
      <q-toolbar
        style="z-index: 11; top: 0px"
        :class="{
          sticky: !dense,
          fixed: dense,
          'text-black': !dark,
          'bg-dark text-white': dark,
        }"
        v-close-popup
      >
        <q-icon name="help" size="sm" />
        <q-toolbar-title>
          {{ title }}
        </q-toolbar-title>
        <q-btn flat round dense icon="close" />
      </q-toolbar>
      <q-card-section :class="{ 'text-h6': true }">
        <span>
          This is the reference for
          <q-icon
            v-if="currentResource"
            color="primary"
            class="q-mr-xs"
            :name="'mdi-' + currentResource.icon"
          /><PageLink
            v-if="currentResource"
            :resource="currentResource"
            classNames="inline primary"
          /><span v-else>{{ currentPage }}</span></span
        >
        <span v-if="currentRecord">
          :
          <PageLink
            :resource="currentResource"
            :record="currentRecord"
            classNames="inline"
        /></span>
        <span v-if="currentView"> ({{ currentView.name }})</span>
        <span v-if="currentDashboard"> : {{ currentDashboard.name }}</span>
        <br />
      </q-card-section>
      <q-card-section class="q-pt-none">
        <q-expansion-item
          v-if="currentResource"
          :dark="dark"
          expand-separator
          header-class="text-h6"
          icon="mdi-focus-field"
          label="Fields"
          group="sections"
        >
          <q-expansion-item
            group="fieldReferences"
            v-for="field in fields"
            :key="field.name"
            :label="field.label"
            :icon="currentResource.getFieldIcon(field.name)"
          >
            <div>
              <FieldReference
                :dark="dark"
                :dense="dense"
                :resource="currentResource"
                :field="field"
              />
            </div>
          </q-expansion-item>
        </q-expansion-item>
        <q-expansion-item
          v-if="currentResource && actions"
          :dark="dark"
          expand-separator
          header-class="text-h6"
          icon="mdi-gesture-tap"
          label="Actions"
          group="sections"
        >
          <q-expansion-item
            group="actionReferences"
            v-for="action in actions"
            :key="action.name"
            :label="action.label"
            :icon="currentResource.getActionIcon(action.name)"
          >
            <div class="q-pl-xl">
              <ActionReference
                :dark="dark"
                :dense="dense"
                :resource="currentResource"
                :action="action"
              />
            </div>
          </q-expansion-item>
        </q-expansion-item>
        <q-expansion-item
          :dark="dark"
          v-if="guides && Object.keys(guides).length > 0"
          :default-opened="!currentResource"
          expand-separator
          header-class="text-h6"
          icon="mdi-book-open-variant"
          label="Guides"
          group="sections"
        >
          <GuideReference
            v-for="guide in guides"
            :key="guide.id"
            :guide="guide"
            :completion="getCompletion(guide)"
            @click="guideSelect(guide.id)"
          />
        </q-expansion-item>
      </q-card-section>
    </q-card>
  </q-dialog>
</template>

<script>
import { computed, ref, watch, onMounted } from "vue";
import { toTitleCase } from "../utilities";
import { useRoute, useRouter } from "vue-router";
import { useStore } from "vuex";
import FieldReference from "./FieldReference";
import ActionReference from "./ActionReference";
import GuideReference from "./GuideReference";
import PageLink from "./PageLink";

export default {
  props: ["dense", "dark"],
  components: {
    FieldReference,
    ActionReference,
    GuideReference,
    PageLink,
  },
  setup() {
    const route = useRoute();
    const router = useRouter();
    const store = useStore();
    const database = store.$db();
    const Resource = database.model("_resources");
    const currentResource = computed(() =>
      route.path === "/" ? null : Resource.find(route.path.split("/")[1])
    );
    const currentRecord = computed(() =>
      currentResource.value && route.params.id
        ? currentResource.value.getRecord(route.params.id)
        : null
    );
    const currentRecordName = computed(() =>
      currentRecord.value
        ? currentRecord.value[currentResource.value.name_field]
        : null
    );

    const helpParam = computed(() => route.query.help);
    const guideParam = computed(() => route.query.guide);
    const isOpen = ref(false);

    onMounted(() => {
      if (helpParam.value && !guideParam.value) {
        isOpen.value = true;
      }
    });
    watch(guideParam, (next) => {
      if (next && isOpen.value && guideParam.value) {
        isOpen.value = false;
      } else if (!next && !isOpen.value && helpParam.value) {
        isOpen.value = true;
      }
    });
    watch(helpParam, (next) => {
      if (next && !isOpen.value && !guideParam.value) {
        isOpen.value = true;
      }
    });
    watch(isOpen, (next) => {
      if (!next && helpParam.value && !guideParam.value) {
        router.replace({
          path: route.path,
          query: { ...route.query, help: undefined },
        });
      }
    });
    const currentDashboard = computed(() => null); // TODO
    const currentView = computed(() => null); // TODO
    const currentPage = computed(() => {
      if (currentResource.value) {
        return toTitleCase(currentResource.value.name).replace("_", " ");
      }
      if (currentDashboard.value) {
        return "Dashboard";
      }
      return "the Home page";
    });
    const fields = computed(() =>
      currentResource.value?.getFields({ ui: null }, ["name"])
    );
    const Application = database.model("_application");
    const application = computed(() => Application.getInstance());
    const currentUser = computed(() => application.value.user);
    const guides = computed(() => Application.getGuides(currentResource.value));
    const guideSelect = (id) => {
      router.replace({
        path: route.path,
        query: { ...route.query, guide: id || undefined },
      });
    };
    const Completion = computed(() => Resource.find("guide_completions"));
    const getCompletion = (guide) => {
      const completions = Completion.value?.getRecords();
      const guideId = guide ? guide.id : null;
      if (!guideId) {
        return null;
      }
      let completion = null;
      Object.entries(completions).forEach(([_, value]) => {
        if (completion) {
          return;
        }
        if (value?.guide === guideId) {
          completion = value;
        }
      });
      return completion;
    };
    return {
      isOpen,
      currentRecord,
      currentRecordName,
      currentResource,
      fields,
      actions: null,
      guides,
      currentDashboard,
      currentView,
      currentUser,
      title: "Help",
      currentPage,
      guideSelect,
      getCompletion,
    };
  },
};
</script>
