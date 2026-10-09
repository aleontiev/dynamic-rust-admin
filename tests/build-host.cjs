// Builds the admin the way an app hosts it — a Quasar SPA importing this
// library — into .work/host/dist/spa, for the browser tests.
//
//   node tests/build-host.cjs
//
// The host needs the library's dependencies and its peers (vue, quasar,
// vue-router, vuex). Set ADMIN_NODE_MODULES to a node_modules that has them
// to use it as is; otherwise they are installed into the host.
const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");

const ROOT = path.resolve(__dirname, "..");
const HOST = path.join(ROOT, ".work/host");

fs.mkdirSync(HOST, { recursive: true });
for (const name of ["src", "dist", ".quasar"]) {
  fs.rmSync(path.join(HOST, name), { recursive: true, force: true });
}
fs.cpSync(path.join(ROOT, "src"), path.join(HOST, "src"), { recursive: true });
for (const name of [
  "babel.config.js",
  ".postcssrc.js",
  ".eslintrc.js",
  ".eslintignore",
]) {
  fs.copyFileSync(path.join(ROOT, name), path.join(HOST, name));
}

const library = JSON.parse(
  fs.readFileSync(path.join(ROOT, "package.json"), "utf8")
);
const host = {
  name: "dynamic-rust-admin-host",
  version: library.version,
  productName: library.productName,
  private: true,
  dependencies: { ...library.dependencies, ...library.peerDependencies },
  devDependencies: library.devDependencies,
  browserslist: library.browserslist,
};
fs.writeFileSync(
  path.join(HOST, "package.json"),
  JSON.stringify(host, null, 2) + "\n"
);

// Everything resolves from the host's node_modules first, so the library
// and the host share one Vue, one Quasar and one store.
const config = fs
  .readFileSync(path.join(ROOT, "quasar.conf.js"), "utf8")
  .replace(
    "extendWebpack(config) {",
    "extendWebpack(config) { config.resolve.modules = [path.resolve(__dirname, 'node_modules'), ...(config.resolve.modules || ['node_modules'])];"
  )
  .replace(
    "...config.resolve.alias,",
    `...config.resolve.alias, 'dynamic-rust-admin': ${JSON.stringify(ROOT)},`
  )
  .replace("open: true,", "open: false,");
fs.writeFileSync(path.join(HOST, "quasar.conf.js"), config);
fs.writeFileSync(
  path.join(HOST, "src/router/index.js"),
  'import { route } from "quasar/wrappers";\nimport { createAdminRouter } from "dynamic-rust-admin";\nexport default route(() => createAdminRouter());\n'
);
fs.writeFileSync(
  path.join(HOST, "src/store/index.js"),
  'export { adminStore as default } from "dynamic-rust-admin";\n'
);

const modules = path.join(HOST, "node_modules");
if (process.env.ADMIN_NODE_MODULES) {
  fs.rmSync(modules, { recursive: true, force: true });
  fs.symlinkSync(path.resolve(process.env.ADMIN_NODE_MODULES), modules);
} else if (!fs.existsSync(path.join(modules, "quasar"))) {
  fs.copyFileSync(path.join(ROOT, "yarn.lock"), path.join(HOST, "yarn.lock"));
  execFileSync("yarn", ["install", "--non-interactive"], {
    cwd: HOST,
    stdio: "inherit",
  });
}
execFileSync(
  process.execPath,
  [path.join(modules, "@quasar/app/bin/quasar"), "build"],
  { cwd: HOST, stdio: "inherit", env: { ...process.env, ENV: "production" } }
);
console.log(path.join(HOST, "dist/spa"));
