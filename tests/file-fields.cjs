// Browser test of Dynamic Rust file fields, against a stand-in for an app
// that keeps its files in PostgreSQL (bytes PUT to the app itself, with the
// session cookie) or in a bucket on another origin (bytes PUT to a signed
// URL, with no credentials at all).
//
//   node tests/build-host.cjs && node tests/file-fields.cjs
//
// PLAYWRIGHT_MODULE: Playwright, if it is not installed here.
// ADMIN_UI: the built admin (default .work/host/dist/spa).
// Screenshots go to .work/screenshots.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const http = require("node:http");
const { randomUUID } = require("node:crypto");
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");

const UI = path.resolve(
  process.env.ADMIN_UI || path.join(__dirname, "../.work/host/dist/spa")
);
const SHOTS = path.join(__dirname, "../.work/screenshots");
const SESSION = "dream_app=clerk-token";
const LIMIT = { postgres: 10, bucket: 100 };

const field = (name, type, extra = {}) => ({
  name,
  label: name[0].toUpperCase() + name.slice(1),
  description: null,
  type,
  read_only: false,
  required: false,
  nullable: true,
  null: true,
  many: false,
  ui: true,
  hidden: false,
  deferred: false,
  sortable: true,
  filterable: true,
  related: null,
  related_resource: null,
  ...extra,
});
const fields = {
  id: field("id", "uuid", { read_only: true }),
  name: field("name", "string"),
  scan: field("scan", "file", {
    description: "The receipt as photographed or scanned.",
  }),
  archive: field("archive", "file", { read_only: true }),
  created: field("created", "datetime", { read_only: true }),
  updated: field("updated", "datetime", { read_only: true }),
};
const SCHEMA = {
  type: "namespace",
  name: "app",
  label: "Receipts",
  access: "member",
  resources: {
    receipts: {
      type: "resource",
      name: "receipts",
      singular: "receipt",
      singular_name: "receipt",
      label: "Receipts",
      icon: "table",
      url: "/api/admin/receipts/",
      id_field: "id",
      name_field: "name",
      section: "App",
      features: { detail: true },
      actions: [],
      fields,
      list_fields: ["name", "scan", "created"],
      sections: [
        { name: "details", label: "Details", fields: ["name", "scan"] },
      ],
      permissions: {
        create: true,
        read: true,
        update: true,
        delete: true,
        list: true,
        fields: Object.fromEntries(
          Object.values(fields).map((f) => [
            f.name,
            { read: true, write: !f.read_only },
          ])
        ),
      },
    },
  },
};
const USER = {
  id: randomUUID(),
  name: "clerk",
  email: "clerk@example.com",
  roles: [],
  data: {},
  photo: null,
};

const now = () => new Date().toISOString().replace(/\.\d+Z$/, "Z");
const earlier = () =>
  new Date(Date.now() - 3 * 3600 * 1000).toISOString().replace(/\.\d+Z$/, "Z");
const file = (name, content_type, text) => ({
  name,
  content_type,
  size: Buffer.byteLength(text),
  uploaded: earlier(),
  store: "postgres",
  bytes: Buffer.from(text),
});
const state = {
  store: "postgres",
  bucketDelay: 0,
  refuseNextSave: null,
  records: new Map(),
  uploads: new Map(),
  objects: new Map(),
  log: [],
};
const may = randomUUID();
const june = randomUUID();
state.records.set(may, {
  id: may,
  name: "May fuel",
  scan: file("may-fuel.pdf", "application/pdf", "%PDF-1.4 may fuel"),
  archive: file("may-archive.zip", "application/zip", "PK may archive"),
  created: now(),
  updated: now(),
});
state.records.set(june, {
  id: june,
  name: "June parking",
  scan: null,
  archive: null,
  created: now(),
  updated: now(),
});

const FILE_FIELDS = ["scan", "archive"];
const show = (record) => ({
  ...record,
  ...Object.fromEntries(
    FILE_FIELDS.map((name) => [
      name,
      record[name]
        ? {
            name: record[name].name,
            size: record[name].size,
            content_type: record[name].content_type,
            uploaded: record[name].uploaded,
            url: `/api/admin/receipts/${record.id}/files/${name}/`,
          }
        : null,
    ])
  ),
});
const invalid = (field, message) => ({
  status: 400,
  body: { detail: { [field]: [message] } },
});

// A write, as Dynamic Rust takes it: null removes a file, an upload the
// person made and finished becomes the file, anything else keeps it.
const write = (record, body) => {
  if (state.refuseNextSave) {
    const refusal = invalid("scan", state.refuseNextSave);
    state.refuseNextSave = null;
    return refusal;
  }
  const next = { ...record };
  if (typeof body.name !== "undefined") {
    next.name = body.name;
  }
  if ("scan" in body) {
    const value = body.scan;
    if (value === null) {
      next.scan = null;
    } else if (value && value.upload) {
      const upload = state.uploads.get(value.upload);
      const missing =
        "This upload is not one you made for this field, or it has expired.";
      if (!upload || upload.field !== "scan" || upload.attached) {
        return invalid("scan", missing);
      }
      const bytes =
        upload.store === "bucket"
          ? state.objects.get(`pending/${upload.id}`)?.bytes
          : upload.bytes;
      if (!bytes || bytes.length !== upload.size) {
        return invalid("scan", "The file has not been uploaded yet.");
      }
      upload.attached = true;
      next.scan = {
        name: upload.name,
        size: upload.size,
        content_type: upload.content_type,
        uploaded: now(),
        store: upload.store,
        bytes,
      };
      if (upload.store === "bucket") {
        // Attaching moves the object out of pending/, as the app does.
        next.scan.key = `files/${upload.id}`;
        state.objects.set(next.scan.key, state.objects.get(`pending/${upload.id}`));
      }
    }
  }
  next.updated = now();
  return { record: next };
};

const send = (response, status, body, headers = {}) => {
  response.writeHead(status, { "content-type": "application/json", ...headers });
  response.end(body === undefined ? "" : JSON.stringify(body));
};
const read = (request) =>
  new Promise((resolve) => {
    const chunks = [];
    request.on("data", (chunk) => chunks.push(chunk));
    request.on("end", () => resolve(Buffer.concat(chunks)));
  });
const disposition = (name) =>
  `attachment; filename*=UTF-8''${encodeURIComponent(name)}`;

async function api(request, response, url, origin) {
  const { pathname } = url;
  const method = request.method;
  const body = await read(request);
  state.log.push({
    method,
    pathname,
    cookie: request.headers.cookie || "",
    body: body.length < 10000 ? body.toString() : `<${body.length} bytes>`,
    at: Date.now(),
  });
  if (!(request.headers.cookie || "").includes(SESSION)) {
    return send(response, 401, {
      detail: "Authentication credentials were not provided.",
    });
  }
  let match;
  if (pathname === "/api/admin/" && method === "OPTIONS") {
    return send(response, 200, SCHEMA);
  }
  if (pathname === "/api/admin/users/me/") {
    return send(response, 200, { user: USER });
  }
  if (pathname === "/api/v0/s3/") {
    return send(response, 200, {});
  }
  if (pathname === "/api/admin/receipts/" && method === "GET") {
    const records = [...state.records.values()].map(show);
    return send(response, 200, {
      receipts: records,
      meta: {
        page: 1,
        per_page: 25,
        total_pages: 1,
        total_results: records.length,
      },
    });
  }
  if (pathname === "/api/admin/receipts/" && method === "POST") {
    const id = randomUUID();
    const result = write(
      { id, name: null, scan: null, archive: null, created: now() },
      JSON.parse(body.toString() || "{}")
    );
    if (!result.record) {
      return send(response, result.status, result.body);
    }
    state.records.set(id, result.record);
    return send(response, 201, { receipt: show(result.record) });
  }
  if ((match = pathname.match(/^\/api\/admin\/receipts\/([^/]+)\/$/))) {
    const record = state.records.get(match[1]);
    if (!record) {
      return send(response, 404, { detail: "Not found." });
    }
    if (method === "PATCH") {
      const result = write(record, JSON.parse(body.toString() || "{}"));
      if (!result.record) {
        return send(response, result.status, result.body);
      }
      state.records.set(record.id, result.record);
      return send(response, 200, { receipt: show(result.record) });
    }
    return send(response, 200, { receipt: show(record) });
  }
  if (pathname === "/api/admin/files/" && method === "POST") {
    const input = JSON.parse(body.toString());
    if (input.model !== "receipts") {
      return send(response, 400, invalid("model", "Choose a model of this app.").body);
    }
    if (input.field !== "scan") {
      return input.field === "archive"
        ? send(response, 403, {
            detail: "You do not have permission to perform this action.",
          })
        : send(response, 400, invalid("field", "Choose a file field of this model.").body);
    }
    if (!input.name) {
      return send(response, 400, invalid("name", "Give the file a name.").body);
    }
    const limit = LIMIT[state.store];
    if (!(input.size > 0 && input.size <= limit * 1024 * 1024)) {
      return send(response, 400, invalid("size", `A file may hold 1 byte to ${limit} MiB.`).body);
    }
    const id = randomUUID();
    state.uploads.set(id, { id, ...input, field: input.field, store: state.store });
    const bucket = origin.replace("app.example.test", "bucket.example.test");
    const uploadUrl =
      state.store === "bucket"
        ? `${bucket}/bucket/pending/${id}?X-Amz-Expires=900&X-Amz-Signature=fixture`
        : `${origin}/api/admin/files/${id}/`;
    return send(response, 201, {
      upload: {
        id,
        method: "PUT",
        url: uploadUrl,
        headers: { "Content-Type": input.content_type },
        expires_in: 3600,
      },
    });
  }
  if ((match = pathname.match(/^\/api\/admin\/files\/([^/]+)\/$/)) && method === "PUT") {
    const upload = state.uploads.get(match[1]);
    if (!upload || upload.store !== "postgres") {
      return send(response, 404, { detail: "Not found." });
    }
    if (body.length !== upload.size) {
      return send(response, 400, invalid("size", "The file is not the size its upload was given.").body);
    }
    upload.bytes = body;
    upload.headers = request.headers;
    return send(response, 204);
  }
  if ((match = pathname.match(/^\/api\/admin\/receipts\/([^/]+)\/files\/([^/]+)\/$/))) {
    const stored = state.records.get(match[1])?.[match[2]];
    if (!stored) {
      return send(response, 404, { detail: "Not found." });
    }
    if (stored.store === "bucket") {
      const bucket = origin.replace("app.example.test", "bucket.example.test");
      const query = new URLSearchParams({
        "X-Amz-Signature": "fixture",
        "response-content-disposition": disposition(stored.name),
        "response-content-type": stored.content_type,
      });
      response.writeHead(302, {
        location: `${bucket}/bucket/${stored.key}?${query}`,
        "cache-control": "no-store",
      });
      return response.end();
    }
    response.writeHead(200, {
      "content-type": stored.content_type,
      "content-disposition": disposition(stored.name),
      "cache-control": "private, no-store",
    });
    return response.end(stored.bytes);
  }
  return send(response, 404, { detail: "Not found." });
}

// The bucket: another origin that lets any origin PUT and GET, as a
// bucket's CORS rule does — which a browser refuses to credentialed requests.
async function bucket(request, response, url) {
  const cors = {
    "access-control-allow-origin": "*",
    "access-control-allow-methods": "GET, PUT",
    "access-control-allow-headers": "content-type",
  };
  const body = await read(request);
  const entry = {
    method: request.method,
    pathname: url.pathname,
    headers: request.headers,
    at: Date.now(),
  };
  state.log.push({ ...entry, bucket: true });
  if (request.method === "OPTIONS") {
    response.writeHead(204, cors);
    return response.end();
  }
  const key = url.pathname.replace(/^\/bucket\//, "");
  if (request.method === "PUT") {
    await new Promise((resolve) => setTimeout(resolve, state.bucketDelay));
    state.objects.set(key, { bytes: body, headers: request.headers });
    entry.done = Date.now();
    state.lastPut = entry;
    response.writeHead(200, cors);
    return response.end();
  }
  const object = state.objects.get(key);
  if (!object) {
    response.writeHead(404, cors);
    return response.end();
  }
  response.writeHead(200, {
    ...cors,
    "content-type": url.searchParams.get("response-content-type"),
    "content-disposition": url.searchParams.get("response-content-disposition"),
  });
  return response.end(object.bytes);
}

function serve(request, response) {
  const host = (request.headers.host || "").split(":")[0];
  const port = request.socket.localPort;
  const url = new URL(request.url, `http://${request.headers.host}`);
  if (host === "bucket.example.test") {
    return bucket(request, response, url);
  }
  if (url.pathname.startsWith("/api/")) {
    return api(request, response, url, `http://app.example.test:${port}`);
  }
  let filename = path.join(UI, url.pathname);
  if (
    !filename.startsWith(UI) ||
    !fs.existsSync(filename) ||
    fs.statSync(filename).isDirectory()
  ) {
    filename = path.join(UI, "index.html");
  }
  const type =
    {
      ".html": "text/html",
      ".js": "application/javascript",
      ".css": "text/css",
      ".svg": "image/svg+xml",
      ".woff": "font/woff",
      ".woff2": "font/woff2",
    }[path.extname(filename)] || "application/octet-stream";
  response.writeHead(200, { "content-type": type });
  fs.createReadStream(filename).pipe(response);
}

(async () => {
  assert.ok(
    fs.existsSync(path.join(UI, "index.html")),
    `No built admin at ${UI}: run node tests/build-host.cjs`
  );
  fs.mkdirSync(SHOTS, { recursive: true });
  const server = http.createServer((request, response) =>
    Promise.resolve(serve(request, response)).catch((error) => {
      console.error(error);
      response.writeHead(500);
      response.end();
    })
  );
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const port = server.address().port;
  const APP = `http://app.example.test:${port}`;
  const browser = await chromium.launch({
    headless: true,
    ...(process.env.CHROMIUM_PATH
      ? { executablePath: process.env.CHROMIUM_PATH }
      : {}),
    args: [
      "--no-proxy-server",
      "--host-resolver-rules=MAP app.example.test 127.0.0.1, MAP bucket.example.test 127.0.0.1",
    ],
  });
  const errors = [];
  const open = async (viewport) => {
    const context = await browser.newContext({
      viewport,
      acceptDownloads: true,
    });
    await context.addCookies([
      {
        name: "dream_app",
        value: "clerk-token",
        domain: "app.example.test",
        path: "/api",
        httpOnly: true,
        sameSite: "Lax",
      },
    ]);
    await context.addInitScript(() => {
      window.__DYNAMIC_ADMIN_CONFIG__ = {
        apiUrl: location.origin + "/api",
        name: "Receipts",
      };
    });
    const page = await context.newPage();
    page.on("pageerror", (error) => errors.push(error.message));
    return { context, page };
  };
  let { context, page } = await open({ width: 1280, height: 900 });
  const scan = () => page.locator('[data-field="scan"]').first();
  const openRecord = async (id) => {
    await page.goto(`${APP}/receipts/${id}/`);
    await scan().waitFor();
    await page.locator(".q-skeleton").first().waitFor({ state: "detached" }).catch(() => {});
  };
  const save = async (method = "PATCH") => {
    const answered = page.waitForResponse(
      (r) => r.request().method() === method && /\/api\/admin\/receipts\//.test(r.url())
    );
    await page.getByRole("button", { name: /^Save/ }).click();
    return answered;
  };
  const download = async (link) => {
    const [event] = await Promise.all([
      page.waitForEvent("download"),
      link.click(),
    ]);
    return {
      name: event.suggestedFilename(),
      text: fs.readFileSync(await event.path(), "utf8"),
    };
  };
  const lastWrite = (method) =>
    [...state.log].reverse().find(
      (entry) => entry.method === method && /^\/api\/admin\/receipts\//.test(entry.pathname)
    );
  let phase = "list";
  try {
    // A list shows a file by its name and size.
    await page.goto(`${APP}/receipts/`);
    const cell = page.locator("tbody tr").filter({ hasText: "May fuel" });
    await cell.getByRole("link", { name: "may-fuel.pdf" }).waitFor();
    assert.match(await cell.innerText(), /may-fuel\.pdf\s+17 bytes/);
    await page.screenshot({ path: path.join(SHOTS, "files-list-desktop.png") });

    phase = "detail";
    // A record shows its file, which downloads with the session cookie.
    await openRecord(may);
    await scan().getByText("may-fuel.pdf").waitFor();
    assert.match(await scan().innerText(), /17 bytes · uploaded/);
    const got = await download(scan().getByRole("link", { name: "may-fuel.pdf", exact: true }));
    assert.deepEqual(got, { name: "may-fuel.pdf", text: "%PDF-1.4 may fuel" });
    const fetched = [...state.log].reverse().find((e) => e.pathname.endsWith("/files/scan/"));
    assert.ok(fetched.cookie.includes(SESSION), "the download carried the session");
    assert.equal(new URL(page.url()).pathname, `/receipts/${may}/`, "the page stays");
    await page.screenshot({ path: path.join(SHOTS, "files-detail-desktop.png") });

    phase = "read-only field";
    // A field the person may not write shows its file, and only downloads.
    await page.getByRole("button", { name: "Edit" }).click();
    const archive = page.locator('[data-field="archive"]').first();
    await archive.getByText("may-archive.zip").waitFor();
    assert.equal(await archive.getByRole("button", { name: /^(Replace|Remove)/ }).count(), 0);
    assert.equal(await archive.locator('input[type="file"]').count(), 0);
    await scan().getByRole("button", { name: "Remove may-fuel.pdf" }).waitFor();
    await page.screenshot({ path: path.join(SHOTS, "files-edit-desktop.png") });

    phase = "begin refused";
    // A file the app will not take says why, on the field, and changes nothing.
    await scan().locator('input[type="file"]').setInputFiles({
      name: "empty.pdf",
      mimeType: "application/pdf",
      buffer: Buffer.alloc(0),
    });
    await scan().getByRole("alert").getByText("A file may hold 1 byte to 10 MiB.").waitFor();
    await scan().getByText("may-fuel.pdf").waitFor();
    assert.equal(await page.getByRole("button", { name: /^Save/ }).count(), 0);
    await page.screenshot({ path: path.join(SHOTS, "files-error-desktop.png") });

    phase = "remove";
    // Remove sets the field to null when saved.
    await scan().getByRole("button", { name: "Remove may-fuel.pdf" }).click();
    await scan().getByRole("button", { name: "Add a file to Scan" }).waitFor();
    assert.equal(await scan().getByRole("alert").count(), 0, "the error went with the file");
    await page.screenshot({ path: path.join(SHOTS, "files-empty-desktop.png") });
    assert.equal((await save()).status(), 200);
    assert.deepEqual(JSON.parse(lastWrite("PATCH").body), { scan: null });
    assert.equal(state.records.get(may).scan, null);
    await page.getByRole("button", { name: "Edit" }).waitFor();
    assert.equal(await scan().locator(".FileValue").count(), 0);

    phase = "bucket upload";
    // To a bucket, the bytes go to its signed URL without credentials, and a
    // save made while they are on their way waits for them.
    state.store = "bucket";
    state.bucketDelay = 1500;
    await openRecord(june);
    await page.getByRole("button", { name: "Edit" }).click();
    const png = Buffer.from("\x89PNG fixture image bytes");
    await scan().locator('input[type="file"]').setInputFiles({
      name: "June parking.png",
      mimeType: "image/png",
      buffer: png,
    });
    await scan().getByText(/uploading/).waitFor();
    assert.equal(await scan().getByRole("progressbar").count(), 1);
    const saved = await save();
    assert.equal(saved.status(), 200);
    const put = state.lastPut;
    assert.equal(put.method, "PUT");
    assert.equal(put.headers["content-type"], "image/png");
    assert.equal(put.headers.cookie, undefined, "no cookie goes to the bucket");
    assert.equal(put.headers.authorization, undefined);
    assert.equal(put.headers.origin, APP);
    const patch = lastWrite("PATCH");
    assert.ok(patch.at >= put.done, "the save waited for the upload");
    const upload = JSON.parse(patch.body).scan.upload;
    assert.ok(state.uploads.get(upload), "the save named the upload");
    assert.deepEqual(JSON.parse(patch.body), { scan: { upload } });
    await page.getByRole("button", { name: "Edit" }).waitFor();
    await scan().getByRole("link", { name: "June parking.png", exact: true }).waitFor();
    const fromBucket = await download(
      scan().getByRole("link", { name: "Download June parking.png" })
    );
    assert.deepEqual(fromBucket, { name: "June parking.png", text: png.toString() });

    phase = "postgres replace";
    // Without a bucket, the bytes go to the app itself, with the session;
    // Replace picks a new file and drop takes one too.
    state.store = "postgres";
    state.bucketDelay = 0;
    await page.getByRole("button", { name: "Edit" }).click();
    const [chooser] = await Promise.all([
      page.waitForEvent("filechooser"),
      scan().getByRole("button", { name: "Replace June parking.png" }).click(),
    ]);
    await chooser.setFiles({
      name: "replaced.txt",
      mimeType: "text/plain",
      buffer: Buffer.from("first choice"),
    });
    await scan().getByText("replaced.txt").waitFor();
    const dropped = await page.evaluateHandle(() => {
      const transfer = new DataTransfer();
      transfer.items.add(
        new File(["June parking receipt"], "June receipt.pdf", {
          type: "application/pdf",
        })
      );
      return transfer;
    });
    await scan().locator(".FileFieldInput").dispatchEvent("drop", { dataTransfer: dropped });
    await scan().getByText(/June receipt\.pdf/).waitFor();
    await scan().getByText(/ready to save/).waitFor();
    const received = [...state.log].reverse().find(
      (e) => e.method === "PUT" && e.pathname.startsWith("/api/admin/files/")
    );
    assert.ok(received.cookie.includes(SESSION), "the app's own upload carried the session");
    // The server's own words when a save is refused.
    state.refuseNextSave = "This upload is not one you made for this field, or it has expired.";
    await save();
    await page.getByText("Scan: This upload is not one you made for this field, or it has expired.").waitFor();
    await page.locator(".q-notification").getByRole("button").first().click();
    assert.equal((await save()).status(), 200);
    const stored = JSON.parse(lastWrite("PATCH").body).scan.upload;
    assert.equal(state.uploads.get(stored).name, "June receipt.pdf");
    assert.equal(state.records.get(june).scan.name, "June receipt.pdf");
    await page.getByRole("button", { name: "Edit" }).waitFor();
    const fromApp = await download(
      scan().getByRole("link", { name: "June receipt.pdf", exact: true })
    );
    assert.deepEqual(fromApp, { name: "June receipt.pdf", text: "June parking receipt" });

    phase = "create";
    // A new record is created with its file.
    await page.goto(`${APP}/receipts/`);
    await page.getByRole("button", { name: "Add" }).click();
    const dialog = page.locator(".q-dialog");
    await dialog.locator('[data-field="name"]').getByRole("textbox").fill("July tolls");
    await dialog
      .locator('[data-field="scan"] input[type="file"]')
      .setInputFiles({
        name: "july.pdf",
        mimeType: "application/pdf",
        buffer: Buffer.from("%PDF july"),
      });
    await dialog.getByText(/ready to save/).waitFor();
    await page.screenshot({ path: path.join(SHOTS, "files-create-desktop.png") });
    const created = page.waitForResponse((r) => r.request().method() === "POST" && /receipts\/$/.test(new URL(r.url()).pathname));
    await dialog.getByRole("button", { name: "Save" }).click();
    assert.equal((await created).status(), 201);
    const post = JSON.parse(lastWrite("POST").body);
    assert.equal(post.name, "July tolls");
    assert.equal(state.uploads.get(post.scan.upload).name, "july.pdf");

    phase = "light";
    await page.getByRole("button", { name: "Switch to light mode" }).click();
    await openRecord(june);
    await page.getByRole("button", { name: "Edit" }).click();
    await scan().getByRole("button", { name: "Remove June receipt.pdf" }).waitFor();
    await page.screenshot({ path: path.join(SHOTS, "files-edit-light.png") });
    await page.getByRole("button", { name: "Cancel" }).click();

    phase = "phone";
    await context.close();
    ({ context, page } = await open({ width: 390, height: 844 }));
    await openRecord(june);
    await scan().getByText("June receipt.pdf").waitFor();
    await page.screenshot({ path: path.join(SHOTS, "files-detail-phone.png") });
    await page.getByRole("button", { name: "Edit" }).click();
    await scan().getByRole("button", { name: "Remove June receipt.pdf" }).waitFor();
    await page.screenshot({ path: path.join(SHOTS, "files-edit-phone.png") });
    await scan().getByRole("button", { name: "Remove June receipt.pdf" }).click();
    await page.screenshot({ path: path.join(SHOTS, "files-empty-phone.png") });

    assert.deepEqual(errors, [], "no page errors");
    console.log("file fields: ok");
  } catch (error) {
    await page.screenshot({ path: path.join(SHOTS, "files-failure.png") }).catch(() => {});
    console.error(`file fields failed at ${phase}`);
    throw error;
  } finally {
    await browser.close();
    server.close();
  }
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
