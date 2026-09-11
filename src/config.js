const config = window.__DYNAMIC_ADMIN_CONFIG__ || window.__DREAM_ADMIN_CONFIG__ || window.__DREAM_CONFIG__ || {};
export const API_URL =
  config.apiUrl || process.env.DREAM_API_URL || "http://localhost:8090";
export const API_VERSION = config.apiVersion || "admin";
export const API_BASE = `${API_URL.replace(/\/$/, "")}/${API_VERSION}/`;
export const API_HOST = new URL(API_URL, window.location.origin).host;
export const API_SCHEME = new URL(
  API_URL,
  window.location.origin
).protocol.slice(0, -1);
export const COPILOT_URL = config.copilotUrl || "";
export const COPILOT_BASE = COPILOT_URL;
export const FEATURES = { coreOnly: config.coreOnly === true };
export const BRAND = {
  name: config.name || "Admin",
  logo:
    config.logo || new URL("./assets/brand-light.svg", import.meta.url).href,
  logoDark:
    config.logoDark ||
    config.logo ||
    new URL("./assets/brand.svg", import.meta.url).href,
};
export default {
  API_URL,
  API_BASE,
  API_HOST,
  API_SCHEME,
  API_VERSION,
  COPILOT_URL,
  BRAND,
};
