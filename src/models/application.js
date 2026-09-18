import { SingletonModel } from "./base";
import Resource from "./resource";
import { setCssVar } from "quasar";
import { isEmpty, all } from "../utilities";
import { loadSyntheticResources } from "../utilities/synthetic-resources";
import api from "../api";

class Application extends SingletonModel {
  static entity = "_application";
  static fields() {
    return {
      id: this.string(this.SINGLETON),
      authenticated: this.boolean(false),
      loaded: this.boolean(false),
      editing: this.boolean(false),
      user: this.attr(),
      s3Credentials: this.attr(),
      // "member" when the person holds a role, "none" when they hold none and
      // so reach nothing; absent for APIs that do not say.
      access: this.attr(null),
    };
  }
  static stopEditing() {
    return this.updateInstance({
      editing: false,
    });
  }

  static startEditing() {
    // start editing
    return this.updateInstance({
      editing: true,
    });
  }

  static getViews(resource) {
    const Views = Resource.find("views");
    return Views
      ? Views.getRecords((view) => !resource || view.resource === resource)
      : {};
  }

  static getGuides(resource) {
    const Guides = Resource.find("guides");
    const $resource = resource ? resource.name || resource : null;
    return Guides
      ? Guides.getRecords(
          (guide) =>
            guide.is_active &&
            ((!$resource && isEmpty(guide.resources)) ||
              ($resource &&
                !isEmpty(guide.resources) &&
                guide.resources.indexOf($resource) > -1))
        )
      : {};
  }

  async toggleTheme($q) {
    const user = this.user;
    if (!user) {
      return;
    }
    const isDark = $q ? $q.dark.isActive : !!user.data?.dark;
    setCssVar(
      "colorscheme",
      isDark ? "light" : "dark",
      document.documentElement
    );
    if ($q) {
      $q.dark.set(!isDark);
    }
    Application.updateInstance({
      user: {
        ...user,
        data: {
          ...(user.data || {}),
          dark: !isDark,
        },
      },
    });
    const User = Resource.find("users");
    if (User && User.canWrite('data', user)) {
      await User.patchAPI({
        id: user.id,
        include: {
          data: true,
          id: true,
          photo: false,
          token: false,
          // TODO support a '*': false syntax to exclude all except...
        },
        changes: {
          data: {
            ...(user.data || {}),
            dark: !isDark,
          },
        },
        relations: false,
      });
    } else {
      try { localStorage.setItem(`dream-admin-theme:${user.id}`, String(!isDark)); } catch (_) { /* Storage may be unavailable in embedded previews. */ }
    }
  }

  static getDashboards() {
    const Dashboards = Resource.find("dashboards");
    if (!Dashboards) {
      return {};
    }
    const records = Dashboards.getRecords();
    return records;
  }

  static getUser() {
    const instance = this.getInstance();
    if (!instance || !instance.user) {
      throw new Error("No user/application");
    }
    const Users = Resource.find("users");
    if (!Users) {
      return null;
    }
    let user = instance.user;
    user = {
      ...user,
      ...({ ...Users.getRecord(user.id) } || {}),
    };
    return user;
  }

  static localSearch(term) {
    const Views = Resource.find("views");
    const Dashboards = Resource.find("dashboards");
    const views = Views ? Views.getRecords() : {};
    const dashboards = Dashboards ? Dashboards.getRecords() : {};
    const resources = Resource.all();
    const result = [];
    Object.values(dashboards).forEach((dashboard) =>
      result.push({ dashboard })
    );
    Object.values(views).forEach((view) =>
      result.push({ view, object_type: view.resource })
    );
    resources.forEach((resource) => {
      if (resource.name === "views" || resource.name === "dashboards") {
        // don't copy views and dashboards twice
        return;
      }
      result.push({ object_type: resource.name });
      const nameField = resource.name_field;
      const idField = resource.id_field;
      if (term) {
        Object.values(resource.getRecords()).forEach((record) =>
          result.push({
            object_id: record[idField],
            object_name: record[nameField],
            object_type: resource.name,
          })
        );
      }
    });
    return result;
  }

  static getResourceOptions(filter = null) {
    return Resource.all()
      .filter((resource) => resource.canList())
      .filter((resource) => !filter || filter(resource))
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((resource) => ({
        value: resource.name,
        label: (resource.label || resource.name).replace("_", " "),
      }));
  }

  async stopImpersonate() {
    await api.get("impersonate/stop");
    await Application.refreshMetadata();
  }
  async startImpersonate(user) {
    if (!user) {
      throw new Error("User required");
    }
    const id = user.id;
    await api.get(`impersonate/${id}`);
    await Application.refreshMetadata();
  }

  static async refreshMetadata(options = {}) {
    // refresh Resources
    const clearResources = options.clear || ["dashboards", "views", "messages"];
    if (clearResources) {
      clearResources.forEach((name) => {
        const $Resource = Resource.find(name);
        if ($Resource) {
          $Resource.getCache().clear();
        }
      });
    }
    const requests = {};
    if (options.user !== false) {
      requests.user = api.get("users/me", {
        params: { "include[]": "can_impersonate" },
      });
    }
    if (options.schema !== false) {
      requests.schema = api.options("", { params: { all: 1 } });
    }
    if (options.s3 !== false) {
      requests.s3 = api.getS3();
    }
    if (options.views !== false && options.metadata !== false) {
      requests.views = api.get("views", { params: { per_page: 10000 } });
    }
    if (options.dashboards !== false && options.metadata !== false) {
      requests.dashboards = api.get("dashboards", {
        params: { per_page: 10000 },
      });
    }
    if (options.guides !== false && options.metadata !== false) {
      requests.guides = api.get("guides", {
        params: { per_page: 10000 },
      });
      requests.guideCompletions = api.get("guide_completions", {
        params: { per_page: 10000 },
      });
    }
    requests.syntheticResources = loadSyntheticResources().catch(() => []);
    const responses = await all(requests);
    const { schema, user, views, dashboards, guides, guideCompletions, s3, syntheticResources, } =
      responses;
    if (schema) {
      Application.updateInstance({
        access: typeof schema.data.access === "string" ? schema.data.access : null,
      });
      const listed = Object.values(schema.data.resources);
      Resource.insert({
        data: listed,
      });
      // A resource the person may no longer list leaves the store, and with
      // it the navigation and search.
      const names = new Set(listed.map((resource) => resource.name));
      const synthetic = new Set((responses.syntheticResources || []).map((resource) => resource.name));
      Resource.query()
        .where((resource) => !synthetic.has(resource.name) && !names.has(resource.name))
        .get()
        .forEach((resource) => Resource.delete(resource.name));
    }
    if (syntheticResources && syntheticResources.length) {
      Resource.insert({
        data: syntheticResources,
      });
      syntheticResources.forEach(({ name }) => {
        const syntheticResource = Resource.find(name);
        if (syntheticResource && !syntheticResource.canCache()) {
          syntheticResource.getCache().clear();
        }
      });
    }
    if (user) {
      Application.updateInstance({
        user: user.data.user,
      });
      Resource.cacheResponse(user);
    }
    if (s3) {
      Application.updateInstance({
        s3Credentials: s3.data,
      });
    }
    if (views) {
      Resource.cacheResponse(views);
    }
    if (dashboards) {
      Resource.cacheResponse(dashboards);
    }
    if (guides) {
      Resource.cacheResponse(guides);
    }
    if (guideCompletions) {
      Resource.cacheResponse(guideCompletions);
    }
    if (options.reload) {
      location.reload();
    }
  }
  static searchLocal(term) {
    const getUrl = (item) => {
      if (item.dashboard) {
        return `?dashboard=${item.dashboard.id}`;
      }
      if (item.view) {
        return `${item.object_type}/?view=${item.view.id}`;
      }
      return `${item.object_type}/${item.object_id || ""}`;
    };
    const getSearchKey = (item) => {
      let base = (item.object_type || "").replace("_", " ").toLowerCase();
      if (item.object_name) {
        base += " " + (item.object_name || "").toLowerCase();
      }
      if (item.dashboard) {
        base += " " + item.dashboard.name.toLowerCase();
      }
      if (item.view) {
        base += " " + item.view.name.toLowerCase();
      }
      return base;
    };
    let user = this.getUser();
    if (!user) {
      return [];
    } else {
      // keep track of records seen
      const seen = {};
      const base = this.localSearch(term)
        .filter((item) => {
          if (item.object_type && !Resource.find(item.object_type)) {
            return false;
          }
          if (!term) {
            return true;
          }
          const termKey = term.toLowerCase();
          const itemKey = getSearchKey(item);
          return itemKey.indexOf(termKey) > -1 || termKey.indexOf(itemKey) > -1;
        })
        .map((item) => {
          const resource = Resource.find(item.object_type);
          if (item.object_id === "me") {
            item.object_id = user.id;
          }
          const key = getUrl(item);
          if (!seen[key]) {
            seen[key] = 1;
          } else {
            seen[key] += 1;
          }
          const itemKey = getSearchKey(item);
          return {
            resource,
            itemKey,
            record:
              resource && item.object_id
                ? {
                    [resource.name_field]: item.object_name,
                    [resource.id_field]: item.object_id,
                  }
                : null,
            recent: item.timestamp,
            object_id: item.object_id || null,
            object_type: item.object_type || null,
            view: item.view || null,
            dashboard: item.dashboard || null,
          };
        });
      return base
        .filter((item) => {
          const key = getUrl(item);
          if (seen[key]) {
            seen[key] -= 1;
            if (seen[key] === 0) {
              return true;
            }
          }
          return false;
        })
        .sort((a, b) => {
          if (term) {
            const aExact = a.itemKey === term.toLowerCase();
            const bExact = b.itemKey === term.toLowerCase();
            if (aExact && !bExact) {
              return -1;
            }
            if (bExact && !aExact) {
              return 1;
            }
          }
          return a.itemKey.localeCompare(b.itemKey);
        });
    }
  }
}

export default Application;
