# dynamic-rust-admin

Vue 3 and Quasar 2 components for metadata-driven Dynamic REST APIs: resource
lists, record forms, filters, dashboards, field permissions and reusable controls.
The host supplies the API, authentication flow, branding and resource definitions.

```sh
yarn add dynamic-rust-admin@git+https://github.com/aleontiev/dynamic-rust-admin.git#FULL_COMMIT_SHA
```

Import `createAdminRouter` and `adminStore` from `dynamic-rust-admin`. Load
`src/css/app.scss` in your Quasar build. The host provides the Vue, Quasar,
Vue Router and Vuex peer dependencies and transpiles the Vue single-file components.

Configure `window.__DYNAMIC_ADMIN_CONFIG__` before importing the application:
`apiUrl`, optional `apiVersion`, `name`, `logo`, `logoDark` and `copilotUrl`.
Legacy configuration globals remain accepted for existing hosts. Set `coreOnly`
for the shared read-only core resource experience. No tenant is inferred from a hostname.
The optional S3 adapter uses credentials supplied by the host API.

This is a library, not a hosted backend or a standalone application. Git is the
current distribution source; no npm registry release is implied. Use Node 22,
install dependencies with `yarn install --frozen-lockfile`, and run `yarn lint`.

MIT license. Author: alonetiev@gmail.com.
