import { notarize } from "@electron/notarize";

const DEFAULT_KEYCHAIN_PROFILE = "luie-notary";

export default async function notarizing(context) {
  if (context.electronPlatformName !== "darwin") {
    return;
  }

  const appName = context.packager.appInfo.productFilename;
  const appPath = `${context.appOutDir}/${appName}.app`;
  const keychainProfile = process.env.LUIE_NOTARY_KEYCHAIN_PROFILE ?? DEFAULT_KEYCHAIN_PROFILE;
  const keychain = process.env.LUIE_NOTARY_KEYCHAIN;

  await notarize({
    appPath,
    ...(keychain ? { keychain } : {}),
    keychainProfile,
    tool: "notarytool"
  });
}
