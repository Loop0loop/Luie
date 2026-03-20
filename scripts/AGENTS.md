# SCRIPT POLICY KNOWLEDGE BASE

## OVERVIEW

`scripts/` hosts operational guardrails: dependency/security checks, IPC contract checks, renderer-store checks, build warning regression, release helpers, and native/prisma sync utilities.

## WHERE TO LOOK

| Task                             | Location                                                                                               | Notes                                       |
| -------------------------------- | ------------------------------------------------------------------------------------------------------ | ------------------------------------------- |
| Dependency/version policy        | `check-deps.mjs`, `check-version-pins.mjs`                                                             | Enforces exact pins and package constraints |
| Escape hatch and security policy | `check-no-escape-hatches.mjs`, `check-security-profile.mjs`                                            | Blocks unsafe TypeScript/security patterns  |
| IPC/preload contract validation  | `check-ipc-contract-map.mjs`, `check-ipc-handler-schemas.mjs`, `check-preload-contract-regression.mjs` | Prevents boundary drift                     |
| Renderer/state policy            | `check-renderer-store-usage.mjs`, `check-persist-contracts.mjs`                                        | Store and persistence invariants            |
| Build/release helpers            | `release-mac.mjs`, `ci/sync-release-version-from-tag.mjs`, `verify-packaged-prisma.mjs`                | Packaging/release pipeline glue             |
| Native/asset generation          | `build-native-haptics.mjs`, `generate-app-icons.mjs`, `sync-prisma-client.mjs`                         | Prebuild/postinstall requirements           |

## CONVENTIONS

- `package.json` quality scripts rely on these checks as policy gates; treat failures as contract breaks.
- Prefer narrow, deterministic script inputs; avoid broad filesystem side effects.
- Keep script names aligned with `check:*` command semantics.

## ANTI-PATTERNS

- Don’t bypass script gates in critical changes (`qa:core`, `lint-all` paths).
- Don’t add ad-hoc one-off scripts without integrating into command flow or tests.
- Don’t modify release scripts without validating matching workflow behavior.

## NOTES

- Windows release is tag-triggered via workflow; macOS DMG upload is manual workflow-assisted.
- Many scripts are explicitly tested under `tests/scripts/**`.
