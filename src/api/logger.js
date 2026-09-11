/*eslint-disable no-console*/

const css = {
  success: "color: green; font-weight:normal;",
  error: "color: red; font-weight:bold;",
  bold: "font-weight:bold;",
};
const log = (name, style) => process.env.DEBUGGING ? console.log("%c" + name, style) : null;
const dir = process.env.DEBUGGING ? (console.dir || console.log) : () => null;
const _group = (name, style) => process.env.DEBUGGING ? console.group(name, style) : null;
const _groupCollapsed = (name, style) => process.env.DEBUGGING ? console.groupCollapsed(name, style) : null;

const group = (name, style) =>
  console.group
    ? _group("%c" + name, style)
    : log("%c" + name, style);
const groupCollapsed = (name, style) =>
  console.groupCollapsed
    ? _groupCollapsed("%c" + name, style)
    : log("%c" + name, style);
const groupEnd = () => {
  console.groupEnd && console.groupEnd();
};
const groupRed = (...args) => group(args.join(" "), css.error);
const logBold = (title) => log(title, css.bold);
const logRed = (message) => log(message, css.error);
const logValue = (title, value) => {
  logBold(title);
  dir(value);
};

export const logError = (base, error) => {
  try {
    const { config, response } = error;
    groupRed(config.method, config.url.replace(base, ""));
    logValue("config", config);
    if (response && response.data) {
      logValue("data", response.data);
    } else {
      logRed(error.message);
    }
    logValue("response", response);
    groupEnd();
  } catch (e) {
    console.log(base, error);
  }
};

export const logSuccess = (base, result) => {
  try {
    const { method, url } = result.config;
    const path = url.replace(base, "");
    logSuccessGroup(`${method} ${path}`, {
      config: result.config,
      result,
    });
  } catch (e) {
    console.log(base, result);
  }
};

export const logSuccessGroup = (name, items) => {
  groupCollapsed(name, css.success);
  for (const [item, value] of Object.entries(items)) {
    logValue(item, value);
  }
  groupEnd();
};

export const logErrorGroup = (name, items) => {
  groupRed(name);
  for (const [item, value] of Object.entries(items)) {
    logValue(item, value);
  }
  groupEnd();
};
