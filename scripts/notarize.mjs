import { notarize } from "@electron/notarize";
import { spawnSync } from "node:child_process";

const DEFAULT_KEYCHAIN_PROFILE = "luie-notary";

export default async function notarizing(context) {
  if (context.electronPlatformName !== "darwin") {
    return;
  }

  const appName = context.packager.appInfo.productFilename;
  const appPath = `${context.appOutDir}/${appName}.app`;
  const keychainProfile = process.env.LUIE_NOTARY_KEYCHAIN_PROFILE ?? DEFAULT_KEYCHAIN_PROFILE;
  const keychain = process.env.LUIE_NOTARY_KEYCHAIN;

  // CI는 서명용 키체인과 함께 LUIE_NOTARY_KEYCHAIN을 반드시 세팅하므로
  // 공증 실패가 곧 릴리스 차단이 된다. 로컬 빌드는 프로파일이 없을 수 있으므로
  // notarytool이 프로파일을 실제로 찾지 못하면 공증을 건너뛰고 패키징만 완료한다.
  if (!keychain) {
    const probe = spawnSync(
      "xcrun",
      ["notarytool", "history", "--keychain-profile", keychainProfile],
      { stdio: "ignore" },
    );
    if (probe.status !== 0) {
      console.warn(
        `[notarize] keychain profile '${keychainProfile}' not found; skipping notarization (local build)`,
      );
      return;
    }
  }

  await notarize({
    appPath,
    ...(keychain ? { keychain } : {}),
    keychainProfile,
    tool: "notarytool"
  });
}
