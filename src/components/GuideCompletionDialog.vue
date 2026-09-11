<style lang="scss">
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
    :persistent="saving"
    v-model="isOpen"
    :class="{ dense: dense }"
    transition-show="fade"
    transition-hide="fade"
    :full-height="false"
    :fullscreen="false"
    :maximized="false"
  >
    <q-card class="q-dialog-plugin">
      <q-card-section>
        <span class="text-h6">
          <q-icon name="mdi-star" class="q-mr-sm" />
          <span
            :class="{
              'ztext-primary': hasChanges,
            }"
            >Rate
            <span v-if="!completion || !completion.completed"
              >and complete</span
            >
            this guide</span
          >
        </span>
      </q-card-section>
      <q-card-section v-if="saving" class="row justify-center">
        <q-spinner color="primary" size="lg" />
      </q-card-section>
      <q-card-section v-if="!saving">
        <q-rating
          size="2rem"
          :model-value="live.rating || 0"
          @update:model-value="onRating"
          max="5"
          type="text"
          icon="star_border"
          icon-selected="star"
          :color="ratingColor"
        />
      </q-card-section>
      <q-card-section style="opacity: 0.75">
        <div v-if="saving"></div>
        <div v-else-if="error" class="text-red">
          {{ error }}
        </div>
        <div
          v-else-if="canSave && !live.rating && completion && completion.id"
          class="text-orange"
        >
          <q-icon name="mdi-alert" class="q-mr-sm" />
          This will mark the guide incomplete!
        </div>
        <div v-else-if="live.rating === 1">Very confusing or incorrect!</div>
        <div v-else-if="live.rating === 2">
          Not useful or hard to understand
        </div>
        <div v-else-if="live.rating === 3">Useful, but could be clearer</div>
        <div v-else-if="live.rating === 4">
          Useful and clear, but could be improved
        </div>
        <div v-else-if="live.rating === 5">
          Perfectly explains what I wanted to know!
        </div>
        <div v-else>Please select one of the choices above</div>
      </q-card-section>

      <q-card-section
        v-if="canSave && (live.rating || !completion || !completion.id)"
      >
        Click "Save" to update your rating.<br /><span v-if="live.rating"
          >This will mark the guide as completed</span
        >
      </q-card-section>
      <q-card-actions align="right" v-if="canCancel || canSave">
        <q-btn
          @click="reset"
          label="Cancel"
          icon="mdi-close"
          v-if="canCancel"
        />
        <q-btn
          v-if="canSave"
          @click="onSave"
          color="primary"
          label="Save"
          icon="mdi-check-bold"
        />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script>
import { onMounted, computed, watch, ref } from "vue";
import { useStore } from "vuex";
import { getRatingColor, getErrorMessage, isEqual } from "../utilities";

export default {
  props: ["dense", "dark", "completion", "guide", "value"],
  components: {},
  emits: ["input", "save", "fail"],
  setup(props, context) {
    // global state
    const store = useStore();
    const database = store.$db();
    const Resource = database.model("_resources");
    const Completion = computed(() => Resource.find("guide_completions"));

    // local state
    const saving = ref(false);
    const changes = ref({});
    const error = ref(null);

    // methods
    const reset = () => {
      changes.value = {};
      error.value = null;
    };
    const onRating = (value) => {
      const $changes = changes.value;
      const $live = live.value;
      error.value = null;
      if ($changes.rating && !value && !$live.id) {
        delete $changes.rating;
      } else if (value || $live.id) {
        if (props.completion?.rating === value || (!value && !props.completion?.rating)) {
          delete $changes.rating;
        } else {
          $changes.rating = value;
        }
      }
    };
    const onSave = async () => {
      error.value = null;
      const $live = live.value;
      let $changes = changes.value;
      if ($changes.rating === 0) {
        $changes.rating = null;
      }
      const id = $live.id;
      const GuideCompletion = Completion.value;
      const guideId = props.guide?.id;
      if (!guideId) {
        return;
      }
      let response;
      saving.value = true;
      try {
        if (!GuideCompletion) {
          throw new Error("Please logout and login to refresh metadata");
        }
        if (id) {
          response = await GuideCompletion.patchAPI({
            id,
            changes: $changes,
          });
        } else {
          response = await GuideCompletion.postAPI({
            data: {
              guide: guideId,
              ...$changes,
            },
          });
        }
        const item = response.data.guide_completion;
        // add anything that came back from the server
        $changes = { ...$changes, ...item };
        context.emit("save", { id, changes: $changes });
      } catch (exception) {
        const err = getErrorMessage(exception);
        error.value = err;
        context.emit("fail", err);
      }
      saving.value = false;
    };

    // computeds
    const live = computed(() => {
      return props.completion
        ? { ...props.completion, ...changes.value }
        : { ...changes.value };
    });
    const ratingIcon = computed(() => {
      const rating = live.value.rating;
      if (!rating) {
        return "mdi-star";
      }
      if (rating === 1) {
        return "mdi-thumb-down";
      }
      if (rating === 2) {
        return "mdi-thumb-down";
      }
      if (rating === 3) {
        return "mdi-emoticon-confused";
      }
      if (rating === 4) {
        return "mdi-thumb-up";
      }

      return "mdi-thumb-up";
    });
    const ratingColor = computed(() => getRatingColor(live.value?.rating));
    const canSave = computed(
      () =>
        (!!live.value.rating || live.value.id) &&
        !saving.value &&
        hasChanges.value
    );
    const isOpen = computed({
      get() {
        return props.value;
      },
      set(next) {
        changes.value = {};
        context.emit("input", next);
      },
    });
    const hasChanges = computed(() => !!Object.values(changes.value).length);
    const canCancel = computed(() => hasChanges.value && !saving.value);
    // watchers
    onMounted(reset);
    watch(() => props.completion?.rating, reset);
    return {
      isOpen,
      live,
      changes,
      canCancel,
      hasChanges,
      saving,
      error,
      canSave,
      onSave,
      reset,
      ratingColor,
      ratingIcon,
      onRating,
    };
  },
};
</script>
