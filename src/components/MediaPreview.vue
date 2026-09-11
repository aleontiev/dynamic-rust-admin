<style lang="scss" scoped>
.MediaPreview {
  min-width: 0;
}

.MediaPreview--compact {
  gap: 4px;
  height: 22px;
  max-width: 220px;
  overflow: hidden;
}

.MediaPreview__compact-item,
.MediaPreview__thumbnail {
  background: rgba(127, 127, 127, 0.12);
  border-radius: 3px;
  flex: 0 0 auto;
  overflow: hidden;
}

.MediaPreview__compact-item {
  height: 22px;
  width: 30px;
}

.MediaPreview__more {
  height: 22px;
  min-width: 34px;
}

.MediaPreview__compact-item video,
.MediaPreview__thumbnail video {
  height: 100%;
  object-fit: cover;
  width: 100%;
}

.MediaPreview__stage {
  background: rgba(127, 127, 127, 0.08);
  height: min(62dvh, 680px);
}

.MediaPreview__slide {
  padding: 0;
}

.MediaPreview__pdf {
  height: 100%;
  overflow: auto;
  width: 100%;
}

.MediaPreview__thumbnails {
  gap: 8px;
  overflow-x: auto;
}

.MediaPreview__thumbnail {
  border: 2px solid transparent;
  cursor: pointer;
  height: 64px;
  width: 80px;
}

.MediaPreview__thumbnail--selected {
  border-color: var(--q-primary);
}
</style>

<template>
  <div
    v-if="files.length"
    :class="[
      'MediaPreview',
      { 'MediaPreview--compact row no-wrap items-center': compact },
    ]"
  >
    <template v-if="compact">
      <div
        v-for="file in compactFiles"
        :key="file.index"
        class="MediaPreview__compact-item row items-center justify-center"
      >
        <q-img
          v-if="file.kind === 'image'"
          :src="file.url"
          fit="cover"
          width="100%"
          height="100%"
        />
        <video
          v-else-if="file.kind === 'video'"
          :src="file.url"
          muted
          preload="metadata"
        />
        <q-icon v-else :name="file.icon" size="sm" color="grey-7" />
      </div>
      <div
        v-if="files.length > compactLimit"
        class="MediaPreview__more row items-center justify-center text-caption"
      >
        +{{ files.length - compactLimit }}
      </div>
    </template>

    <template v-else>
      <q-carousel
        v-model="slide"
        animated
        arrows
        swipeable
        control-color="primary"
        class="MediaPreview__stage"
      >
        <q-carousel-slide
          v-for="file in files"
          :key="file.index"
          :name="file.index"
          class="MediaPreview__slide row items-center justify-center"
        >
          <q-img
            v-if="file.kind === 'image'"
            :src="file.url"
            fit="contain"
            width="100%"
            height="100%"
          />
          <video-player
            v-else-if="file.kind === 'video'"
            :src="file.url"
            controls
            fluid
            style="max-height: 100%; max-width: 100%"
          />
          <div v-else-if="file.kind === 'pdf'" class="MediaPreview__pdf">
            <vue-pdf-embed :source="file.url" />
          </div>
          <a
            v-else
            :href="file.url"
            target="_blank"
            rel="noreferrer"
            class="column items-center text-primary"
          >
            <q-icon :name="file.icon" size="xl" />
            <span class="q-mt-sm">Open file</span>
          </a>
        </q-carousel-slide>
      </q-carousel>

      <div
        v-if="files.length > 1"
        class="MediaPreview__thumbnails row no-wrap q-mt-sm q-pb-xs"
      >
        <div
          v-for="file in files"
          :key="`thumbnail-${file.index}`"
          :class="[
            'MediaPreview__thumbnail row items-center justify-center',
            { 'MediaPreview__thumbnail--selected': slide === file.index },
          ]"
          @click="slide = file.index"
        >
          <q-img
            v-if="file.kind === 'image'"
            :src="file.url"
            fit="cover"
            width="100%"
            height="100%"
          />
          <video
            v-else-if="file.kind === 'video'"
            :src="file.url"
            muted
            preload="metadata"
          />
          <q-icon v-else :name="file.icon" size="md" color="grey-7" />
        </div>
      </div>
    </template>
  </div>
</template>

<script>
import { computed, ref, watch } from "vue";
import { VideoPlayer } from "@videojs-player/vue";
import "video.js/dist/video-js.css";
import VuePdfEmbed from "vue-pdf-embed";

const IMAGE_EXTENSIONS = new Set([
  "bmp",
  "gif",
  "jpeg",
  "jpg",
  "png",
  "svg",
  "webp",
]);
const VIDEO_EXTENSIONS = new Set(["m4v", "mov", "mp4", "ogg", "webm"]);

const flatten = (value) => {
  if (Array.isArray(value)) {
    return value.flatMap(flatten);
  }
  if (value && typeof value === "object") {
    return flatten(value.url || value.file || value.download_url || []);
  }
  return value ? [value] : [];
};

const extension = (url) => {
  const path = String(url).split(/[?#]/, 1)[0];
  const match = path.match(/\.([^.\/]+)$/);
  return match ? match[1].toLowerCase() : "";
};

export default {
  props: {
    value: [String, Array, Object],
    compact: Boolean,
    fieldType: String,
    itemType: String,
    compactLimit: {
      type: Number,
      default: 4,
    },
  },
  components: {
    VideoPlayer,
    VuePdfEmbed,
  },
  setup(props) {
    const slide = ref(0);
    const files = computed(() =>
      flatten(props.value).map((url, index) => {
        const ext = extension(url);
        const kind =
          props.fieldType === "image upload" ||
          props.itemType === "image upload" ||
          IMAGE_EXTENSIONS.has(ext)
            ? "image"
            : VIDEO_EXTENSIONS.has(ext)
            ? "video"
            : ext === "pdf"
            ? "pdf"
            : "file";
        return {
          url,
          index,
          kind,
          icon:
            kind === "pdf"
              ? "picture_as_pdf"
              : kind === "video"
              ? "movie"
              : "description",
        };
      })
    );
    watch(files, (next) => {
      if (!next.some((file) => file.index === slide.value)) {
        slide.value = next.length ? next[0].index : 0;
      }
    });
    return {
      slide,
      files,
      compactFiles: computed(() => files.value.slice(0, props.compactLimit)),
    };
  },
};
</script>
