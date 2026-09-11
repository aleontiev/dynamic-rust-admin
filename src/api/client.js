import axios from "axios";
import { logSuccess, logError } from "./logger";
import { API_BASE, API_URL } from "../config";
import { Cache } from "../utilities";

const ERROR = {
  NETWORK: "Network error",
  UNKNOWN: "Something went wrong",
};

const DATABASE = { database: null };

const setDatabase = (database) => {
  DATABASE.database = database;
};

const getDatabase = () => {
  return DATABASE.database;
};

export function getClient(url, base) {
  return {
    login: buildAuthEndpoint(url, "login"),
    logout: buildAuthEndpoint(url, "logout"),
    isAuthenticated: buildIsAuthenticated(base),
    options: buildEndpoint("options", base),
    get: buildEndpoint("get", base),
    getS3: buildEndpoint("get", url + `/v0/s3`),
    put: buildEndpoint("put", base),
    post: buildEndpoint("post", base),
    patch: buildEndpoint("patch", base),
    delete: buildEndpoint("delete", base),
    save: buildSave(base),
    request: request,
    setDatabase,
    getDatabase,
  };
}

export function makeAuthUrl(base, type, next, encode = true) {
  const endpoint = `${base}/${type}/`;
  const encoder = (x) => (encode ? encodeURIComponent(x) : x);
  if (type === "logout") {
    return next
      ? `${endpoint}?next=${encoder(makeAuthUrl(base, "login", next))}`
      : endpoint;
  } else {
    return next ? `${endpoint}?next=${encoder(next)}` : endpoint;
  }
}

export const buildAuthEndpoint = (base, type) => async (jwt) => {
  const database = getDatabase();
  if (type === "logout" && database) {
    const Application = database.model("_application");
    const Resource = database.model("_resources");
    Application.updateInstance({
      authenticated: false,
      user: null,
    });
    Resource.deleteAll();
    Cache.clearAll();
  }
  if (type === "login" && jwt) {
    await request("post", base, "jwt", { data: { jwt } });
  } else {
    const url = makeAuthUrl(base, type, window.location.href);
    window.location.replace(url);
  }
};

/**
 * @returns
 *   {Function}
 *   @param {string} endpoint
 *   @param {AxiosConfig} [rest] axios config
 */
export const buildEndpoint =
  (method, base) =>
  (endpoint, rest = {}) =>
    request(method, base, endpoint, rest);

/**
 * @param {string} endpoint
 * @param {AxiosConfig} [rest] axios config
 * @returns {Promise}
 */
export function buildSave(base) {
  const put = buildEndpoint("put", base);
  const post = buildEndpoint("post", base);
  return (endpoint, rest = {}) => {
    const data = rest.data;
    const id = data.id;
    if (id) {
      return put(endpoint + "/" + id, rest);
    }
    return post(endpoint, rest);
  };
}

export function buildIsAuthenticated(base) {
  // check users/me endpoint
  const options = buildEndpoint("options", base);
  return async () => {
    try {
      const response = await options("users");
      // must be JSON output (not HTML redirect)
      if (typeof response.data === "string") {
        // html auth failed redirect
        return false;
      } else {
        return true;
      }
    } catch (error) {
      logError(base, error);
      return false;
    }
  };
}
/**
 * @param {(get|post|put|patch)} method
 * @param {string} endpoint
 * @param {object} [rest] axios config
 * @returns {Promise}
 * @see https://github.com/axios/axios
 */
export async function request(method, base, endpoint, rest = {}) {
  const url = getEndpointUrl(base, endpoint, rest.params);
  const config = {
    ...rest,
    params: undefined,
    method,
    url,
    withCredentials: true,
  };
  return axios
    .request(config)
    .then((response) => {
      if (
        method !== "options" &&
        response.request.responseURL !== url &&
        response.request.responseURL.indexOf("/login") >= 0
      ) {
        // autologout when redirected to a login page
        // except for options requests
        return client.logout();
      }
      logSuccess(base, response);
      return processResponse(response);
    })
    .catch((error) => {
      logError(base, error);
      return processError(error);
    });
}

export function getQueryString(query) {
  if (!query) {
    return "";
  }
  const encode = encodeURIComponent;
  return Object.keys(query)
    .map((k) => {
      const q = query[k];
      if (Array.isArray(q)) {
        return q.map((value) => `${encode(k)}[]=${encode(value)}`).join("&");
      }
      if (q && q.constructor === Object) {
        return Object.keys(q)
          .map((key) => {
            const value = q[key];
            if (Array.isArray(value)) {
              return value
                .map(
                  (item) =>
                    `${encode(k)}${encode("{" + key + "}")}[]=${encode(item)}`
                )
                .join("&");
            }
            return `${encode(k)}${encode("{" + key + "}")}=${encode(value)}`;
          })
          .join("&");
      }
      return `${encode(k)}=${encode(q)}`;
    })
    .join("&");
}

/**
 * @param {string} endpoint API resource subpath
 * @param {string} base API base path
 * @returns {string} fullfilled url
 */
export function getEndpointUrl(base, endpoint, params) {
  let url = base;
  if (!base.endsWith("/")) {
    url += "/";
  }
  if (endpoint) {
    if (endpoint.startsWith("/")) {
      endpoint = endpoint.substring(1);
    }
    url += endpoint;
    if (!url.endsWith("/")) {
      url += "/";
    }
  }
  const querystring = getQueryString(params);
  return querystring ? `${url}?${querystring}` : url;
}

/**
 * when response has successful status returns response.data
 * otherwise returns rejected promise
 * @returns {Promise}
 */
async function processResponse(response) {
  if (!(response.status + "").startsWith("2")) {
    return Promise.reject(response);
  }
  return response;
}

/**
 * @param {object} error axios response
 * @returns {Promise.<ErrorObject>}
 */
function processError(error) {
  if (!error) {
    return Promise.reject({ error: ERROR.UNKNOWN });
  }
  if (typeof error === "string") {
    return Promise.reject({ error });
  }
  if (!error.response) {
    return Promise.reject({ error: error.message || ERROR.NETWORK });
  }

  const response = error?.response;
  const { data } = response || {};

  if (!data) {
    return Promise.reject({
      error: (error && error.message) || ERROR.NETWORK,
      response,
    });
  }
  if (typeof data === "string") {
    if (data.startsWith("<")) {
      // html?
      //eslint-disable-next-line
      Promise.reject({ error: error.message, response });
    }
    return Promise.reject({ error: data, response });
  }
  if (Array.isArray(data) && data.length) {
    return Promise.reject({ error: data[0], response });
  }
  if (typeof data === "object" && Object.keys(data).length) {
    let errors = {};
    let error = null;
    for (const [name, e] of Object.entries(data)) {
      if (name === "error") {
        error = e;
      } else {
        errors[name] = Array.isArray(e) ? e[0] : e;
      }
    }
    return Promise.reject({ error, errors, response });
  }
  return Promise.reject({ error: ERROR.UNKNOWN, response });
}

const client = getClient(API_URL, API_BASE);
export default client;
