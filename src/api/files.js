import { reactive } from "vue";
import api from "./index";
import { resolveApiUrl } from "../config";

// Files of Dynamic Rust file fields. A person attaches one in three steps:
// the app says where its bytes go (`POST files/`), the browser puts them
// there, and the record is saved with the field set to `{"upload": "<id>"}`.
// Reading a record gives the field as `{name, size, content_type, uploaded,
// url}`; `url` serves the file to whoever may read it.

// Uploads by id, so a field holding `{"upload": id}` can show what it holds.
const described = reactive({});
// Uploads whose bytes are still on their way; a save waits for them.
const sending = new Set();

export const describeUpload = (id) => described[id] || null;

// Where a file a record holds is fetched from: the API's own URL for it.
export const fileUrl = (file) =>
  file && typeof file.url === "string" ? resolveApiUrl(file.url) : null;

// The app's own upload URL (no bucket) takes the person's session cookie.
// A bucket's signed URL is another origin, and gets no credentials at all.
export const isAppUrl = (url) =>
  new URL(url, window.location.href).origin ===
  new URL(resolveApiUrl("")).origin;

const parse = (text) => {
  try {
    return JSON.parse(text);
  } catch (error) {
    return text;
  }
};

// The server's own words for a failed request: Dynamic Rust answers
// `{"detail": "..."}`, or `{"detail": {"<field>": ["..."]}}` for bad input.
export const uploadErrorMessage = (error) => {
  const data = error?.response?.data;
  const detail = data && typeof data === "object" ? data.detail : null;
  if (typeof detail === "string" && detail) {
    return detail;
  }
  if (detail && typeof detail === "object") {
    const message = Object.values(detail)
      .flat()
      .find((item) => typeof item === "string" && item);
    if (message) {
      return message;
    }
  }
  if (typeof error?.error === "string" && error.error) {
    return error.error;
  }
  return "The file could not be uploaded.";
};

const put = (upload, file, onProgress) => {
  const xhr = new XMLHttpRequest();
  const url = resolveApiUrl(upload.url);
  const done = new Promise((resolve, reject) => {
    xhr.open(upload.method || "PUT", url);
    xhr.withCredentials = isAppUrl(url);
    Object.entries(upload.headers || {}).forEach(([name, value]) =>
      xhr.setRequestHeader(name, value)
    );
    xhr.upload.addEventListener("progress", (event) => {
      if (event.lengthComputable && onProgress) {
        onProgress(event.loaded, event.total);
      }
    });
    xhr.addEventListener("load", () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
      } else {
        reject({
          response: { status: xhr.status, data: parse(xhr.responseText) },
          error: `The file could not be uploaded (${xhr.status}).`,
        });
      }
    });
    xhr.addEventListener("error", () =>
      reject({
        error:
          "The file could not be uploaded. Check the connection and try again.",
      })
    );
    xhr.addEventListener("abort", () => reject({ aborted: true }));
    xhr.send(file);
  });
  return { xhr, done };
};

/**
 * Upload a file for a field of a model. `onStart(upload)` is called once the
 * app has said where the bytes go, `onProgress(loaded, total)` as they go.
 * Returns `{promise, abort}`; the promise resolves to the upload (whose id the
 * record is saved with) once its bytes are in place.
 */
export function uploadFile({ model, field, file, onStart, onProgress }) {
  let xhr = null;
  let aborted = false;
  const run = async () => {
    const response = await api.post("files", {
      data: {
        model,
        field,
        name: file.name,
        size: file.size,
        content_type: file.type || "application/octet-stream",
      },
    });
    const upload = response.data.upload;
    if (aborted) {
      throw { aborted: true };
    }
    described[upload.id] = {
      name: file.name,
      size: file.size,
      content_type: file.type,
    };
    const sent = put(upload, file, onProgress);
    xhr = sent.xhr;
    if (onStart) {
      onStart(upload);
    }
    await sent.done;
    return upload;
  };
  const promise = run();
  sending.add(promise);
  const settle = () => sending.delete(promise);
  promise.then(settle, settle);
  return {
    promise,
    abort: () => {
      aborted = true;
      if (xhr) {
        xhr.abort();
      }
    },
  };
}

// A save waits for the files it may hold to finish uploading, and stops if
// one of them could not be: the field says why.
export async function uploadsFinished() {
  const results = await Promise.allSettled([...sending]);
  if (results.some((r) => r.status === "rejected" && !r.reason?.aborted)) {
    throw { error: "A file could not be uploaded; its field says why." };
  }
}

const UNITS = ["KB", "MB", "GB", "TB"];
export const formatFileSize = (bytes) => {
  if (typeof bytes !== "number" || isNaN(bytes)) {
    return "";
  }
  if (bytes < 1024) {
    return bytes === 1 ? "1 byte" : `${bytes} bytes`;
  }
  let size = bytes;
  let unit = -1;
  do {
    size /= 1024;
    unit += 1;
  } while (size >= 1024 && unit < UNITS.length - 1);
  return `${size < 10 ? size.toFixed(1) : Math.round(size)} ${UNITS[unit]}`;
};

export const fileIcon = (contentType) => {
  const type = (contentType || "").toLowerCase();
  if (type.startsWith("image/")) {
    return "image";
  }
  if (type === "application/pdf") {
    return "picture_as_pdf";
  }
  if (type.startsWith("video/")) {
    return "movie";
  }
  if (type.startsWith("audio/")) {
    return "audiotrack";
  }
  if (type.startsWith("text/") || type.includes("document")) {
    return "description";
  }
  return "insert_drive_file";
};
