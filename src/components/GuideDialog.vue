<style lang="scss">
.guide-description {
  p,
  ul,
  ol {
    margin: 0;
  }
}
.q-menu.naked {
  box-shadow: none;
}
</style>
<template>
  <q-dialog
    :modelValue="isOpen"
    @update:modelValue="setIsOpen"
    :class="{ dense: dense, 'large right': true }"
    :maximized="true"
    transition-show="slide-down"
    transition-hide="slide-down"
    position="bottom"
  >
    <q-card :class="{ 'q-pt-xl': dense }">
      <q-toolbar
        style="z-index: 11; top: 0px"
        :class="{
          sticky: !dense,
          'q-pb-lg fixed q-pt-sm': dense,
          'bg-white text-black': !dark,
          'bg-dark text-white': dark,
        }"
      >
        <q-icon
          name="mdi-book-open-variant"
          size="sm"
          @click="selectCategory('*')"
          class="q-pr-xs clickable"
        />
        <q-toolbar-title class="white-space-pre">
          <div class="row full-width">
            <div
              class="col col-auto clickable"
              @click.stop.prevent="selectCategory(category)"
            >
              <span v-if="category != '*'">{{ category }}</span>
              <span v-else>All Guides</span>
              <span v-if="guide" class="q-mr-sm">:</span>
            </div>
            <div class="col scroll-x" v-if="guide">
              <span>{{ guide.title }}</span>
              <span v-if="!dense && guide.subtitle" class="q-mr-sm">:</span>
              <span v-if="!dense && guide.subtitle">{{ guide.subtitle }}</span>
            </div>
          </div>
        </q-toolbar-title>
        <q-btn
          v-if="!guide"
          flat
          round
          dense
          icon="search"
          @click="startSearch"
        />
        <q-btn flat round dense icon="close" @click="setIsOpen(false, true)" />
        <div
          v-if="dense && guide && guide.subtitle"
          :class="{
            'scroll-x white-space-pre q-pr-md subtitle text-h7 full-width': true,
          }"
          style="position: absolute; bottom: 2px; left: 10px; opacity: 0.8"
        >
          {{ guide.subtitle }}
        </div>
      </q-toolbar>
      <q-card-section
        v-if="guide"
        :style="{ display: guideURL && display != 'text' ? 'initial' : 'none' }"
      >
        <div class="row justify-center items-center">
          <video-player
            :height="videoHeight"
            :fluid="false"
            :src="guideURL"
            controls
            @error="onPlayError"
          />
        </div>
      </q-card-section>
      <q-card-section v-if="guide && display != 'video'">
        <div v-html="guide.description" class="guide-description q-mt-sm" />
      </q-card-section>
      <q-card-section v-if="guide" vertical> </q-card-section>
      <q-card-section v-if="guides">
        <q-list v-for="g in guides" :key="g.id">
          <GuideReference
            :guide="g"
            :completion="getCompletion(g)"
            @click="selectGuide(g.id)"
            :hideCategory="category != '*'"
          />
        </q-list>
      </q-card-section>
      <div
        v-if="guide"
        :class="{
          'fixed-bottom full-width': true,
        }"
        style="z-index: 11"
      >
        <ActionBar right :dark="dark">
          <IconButton
            left
            v-if="hasDisplayOptions"
            :dense="dense"
            :icon="displayIcon"
            :label="toTitleCase(display)"
          >
            <q-menu :offset="[4, 4]" class="naked" v-model="displayMenuOpen">
              <div class="column">
                <IconButton
                  v-if="display != 'video'"
                  :dense="dense"
                  icon="mdi-multimedia"
                  label="Video"
                  @click="setDisplay('video')"
                />
                <IconButton
                  v-if="display != 'text'"
                  :dense="dense"
                  icon="mdi-text"
                  label="Text"
                  @click="setDisplay('text')"
                />
              </div>
            </q-menu>
          </IconButton>
          <IconButton
            flat
            :dense="dense"
            :color="completionColor"
            icon="mdi-star"
            :label="
              completion && completion.completed ? completion.rating : 'Rate'
            "
            @click="onCompleteShow"
          />
        </ActionBar>
      </div>
    </q-card>
    <GuideCompletionDialog
      :guide="guide"
      :completion="completion"
      @save="onComplete"
      :dense="dense"
      :value="showCompletionDialog"
      @input="showCompletionDialog = $event"
    />
  </q-dialog>
</template>

<script>
import { onMounted, computed, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useQuasar } from "quasar";
import { useStore } from "vuex";
import { isUuid, getRatingColor, toTitleCase } from "../utilities";
import { VideoPlayer } from "@videojs-player/vue";
import "video.js/dist/video-js.css";
import { differenceInSeconds } from "date-fns";
import { ActionBar, GuideReference, IconButton } from ".";
import GuideCompletionDialog from "./GuideCompletionDialog";

export default {
  props: ["dense", "dark"],
  components: {
    GuideReference,
    GuideCompletionDialog,
    VideoPlayer,
    ActionBar,
    IconButton,
  },
  setup() {
    const $q = useQuasar();
    const route = useRoute();
    const router = useRouter();
    const store = useStore();
    const database = store.$db();
    const Resource = database.model("_resources");
    const currentResource = computed(() =>
      route.path === "/" ? null : Resource.find(route.path.split("/")[1])
    );
    const guideParam = computed(() => route.query.guide);
    const isOpen = ref(false);
    let cooldown = {};
    const completionColor = computed(() =>
      getRatingColor(completion.value?.rating)
    );
    const completion = computed(() => {
      const Completion = Resource.find("guide_completions");
      const completions = Completion?.getRecords();
      const guideId = guide.value ? guide.value.id : null;
      if (!guideId || !completions) {
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
    });
    const reloadURL = async (next) => {
      const Guide = Resource.find("guides");
      const id = next || guide.value?.id;
      if (!id || !isUuid(id)) {
        return;
      }
      const now = new Date();
      const COOLDOWN_SECONDS = 60;
      if (
        cooldown &&
        cooldown[id] &&
        differenceInSeconds(cooldown[id], now) < COOLDOWN_SECONDS
      ) {
        return false;
      }
      cooldown[id] = new Date();
      await Guide.getAPI({
        id,
        params: { "include[]": "document.file" },
      });
    };
    const guideURL = computed(() => {
      const $guide = guide.value;
      const Doc = Resource.find("documents");
      const doc = $guide?.document;
      return Doc && doc ? Doc.getRecord(doc)?.file : null;
    });

    watch(isOpen, (next) => {
      if (!next && guideParam.value) {
        router.replace({
          path: route.path,
          query: { ...route.query, guide: undefined },
        });
      }
    });
    onMounted(async () => {
      cooldown = {};
      if (guideParam.value) {
        isOpen.value = true;
        if (guide.value && !guideURL.value) {
          await reloadURL();
        }
      }
    });
    watch(guideParam, async (next) => {
      const $guide = guide.value;
      if ($guide && !$guide.document) {
        display.value = DISPLAY.text;
      } else if ($guide) {
        display.value = DISPLAY.video;
      }

      if (next && !isOpen.value) {
        isOpen.value = true;
      }
      if (next && !guideURL.value && $guide) {
        // load guide URL
        await reloadURL(next);
      }
    });
    const category = computed(() => {
      const $guide = guide.value;
      return $guide ? $guide.category : guideParam.value;
    });
    const selectCategory = (category) => {
      if (guideParam.value !== category) {
        router.replace({
          path: route.path,
          query: { ...route.query, guide: category },
        });
      }
    };
    const guide = computed(() => {
      const Guide = Resource.find("guides");
      const id = guideParam.value;
      if (Guide && isUuid(id)) {
        return Guide.getRecord(id);
      }
      return null;
    });
    const DISPLAY = {
      video: "video",
      text: "text",
      both: "both",
    };
    const display = ref(DISPLAY.video);
    const displayIcon = computed(() => {
      const $display = display.value;
      if ($display === DISPLAY.video) {
        return "mdi-multimedia";
      } else if ($display === DISPLAY.text) {
        return "mdi-text";
      }
      return "mdi-image-text";
    });
    const onPlayError = async (args) => {
      if (args?.target?.player?.error_?.code === 4) {
        await reloadURL();
      }
    };
    const videoHeight = computed(() => {
      const $display = display.value;
      if ($display === DISPLAY.both) {
        return $q.screen.height - 125 - 350;
      }
      if ($display === DISPLAY.video) {
        return $q.screen.height - 125;
      }
      // text
      return 0;
    });
    const displayMenuOpen = ref(false);
    const setDisplay = (value) => {
      display.value = value;
      displayMenuOpen.value = false;
    };
    const showCompletionDialog = ref(false);
    const onCompleteShow = () => {
      showCompletionDialog.value = true;
    };
    const onComplete = () => {
      showCompletionDialog.value = false;
      $q.notify({
        color: "primary",
        message: "Saved successfully",
        icon: "done",
        timeout: 200,
      });
    };
    const setIsOpen = (next, update) => {
      if (update) {
        isOpen.value = next;
      }
    };
    const getCompletion = (g) => {
      const Completion = Resource.find("guide_completions");
      const completions = Completion?.getRecords();
      const guideId = g ? g.id : null;
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
    const guides = computed(() => {
      if (guide.value) {
        return null;
      }
      const Guide = Resource.find("guides");
      const $category = category.value;
      return Object.values(
        Guide.getRecords(
          (guide) =>
            ($category == "*" || guide.category === $category) &&
            guide.is_active
        )
      ).sort((a, b) => {
        if (a.category === b.category) {
          if (a.order === b.order) {
            return a.title.localeCompare(b.title);
          }
          return a.order - b.order;
        } else {
          return a.category.localeCompare(b.category);
        }
      });
    });
    const selectGuide = (id) => {
      router.replace({
        path: route.path,
        query: { ...route.query, guide: id || undefined },
      });
    };
    const hasDisplayOptions = computed(() => {
      let options = 0;
      const $guideURL = guideURL.value;
      const $guide = guide.value;
      if ($guideURL) {
        options += 1;
      }
      if ($guide.description) {
        options += 1;
      }
      return options > 1;
    });
    return {
      isOpen,
      currentResource,
      guide,
      videoHeight,
      guideURL,
      onPlayError,
      display,
      setDisplay,
      displayIcon,
      displayMenuOpen,
      toTitleCase,
      onCompleteShow,
      onComplete,
      showCompletionDialog,
      selectCategory,
      selectGuide,
      completion,
      getCompletion,
      completionColor,
      category,
      setIsOpen,
      guides,
      hasDisplayOptions,
    };
  },
};
</script>
