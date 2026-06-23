const DEFAULT_APP_NAME = "Luie";
const DEFAULT_APP_VERSION = "0.1.0";

const readBuildConstant = (value: unknown, fallback: string): string => {
  if (typeof value === "string" && value.trim().length > 0) {
    return value;
  }
  return fallback;
};

export const APP_NAME = readBuildConstant(
  typeof __APP_NAME__ !== "undefined" ? __APP_NAME__ : undefined,
  DEFAULT_APP_NAME,
);

export const APP_VERSION = readBuildConstant(
  typeof __APP_VERSION__ !== "undefined"
    ? __APP_VERSION__
    : typeof process !== "undefined"
      ? process.env?.npm_package_version
      : undefined,
  DEFAULT_APP_VERSION,
);
