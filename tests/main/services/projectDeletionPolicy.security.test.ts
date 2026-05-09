// TEST_LEVEL: REAL_FS_INTEGRATION
// PROVES: project package deletion requires an approved package path and only deletes files
// DOES_NOT_PROVE: renderer confirmation UI behavior

import os from "node:os";
import path from "node:path";
import * as fsp from "node:fs/promises";
import { afterEach, describe, expect, it } from "vitest";
import { ErrorCode } from "../../../src/shared/constants/errorCode.js";
import { approvePathForSession } from "../../../src/main/handler/system/fsPathApproval.js";
import { deleteProjectPackageFileIfRequested } from "../../../src/main/services/core/project/projectDeletionPolicy.js";

describe("project package deletion policy security", () => {
  let tempRoot = "";

  afterEach(async () => {
    if (tempRoot) {
      await fsp.rm(tempRoot, { recursive: true, force: true });
      tempRoot = "";
    }
  });

  const makeTempRoot = async (prefix: string): Promise<string> => {
    tempRoot = await fsp.mkdtemp(path.join(os.tmpdir(), prefix));
    return tempRoot;
  };

  it("rejects unapproved absolute .luie paths and leaves the file intact", async () => {
    const root = await makeTempRoot("luie-delete-unapproved-");
    const packagePath = path.join(root, "outside-session.luie");
    await fsp.writeFile(packagePath, "not a real package", "utf-8");

    await expect(
      deleteProjectPackageFileIfRequested({
        deleteFile: true,
        projectPath: packagePath,
      }),
    ).rejects.toMatchObject({
      code: ErrorCode.FS_PERMISSION_DENIED,
    });

    await expect(fsp.access(packagePath)).resolves.toBeUndefined();
  });

  it("rejects approved .luie directories instead of deleting recursively", async () => {
    const root = await makeTempRoot("luie-delete-directory-");
    const packagePath = path.join(root, "directory-package.luie");
    const nestedPath = path.join(packagePath, "nested.txt");
    await fsp.mkdir(packagePath, { recursive: true });
    await fsp.writeFile(nestedPath, "must remain", "utf-8");
    await approvePathForSession(packagePath, ["package"], "file");

    await expect(
      deleteProjectPackageFileIfRequested({
        deleteFile: true,
        projectPath: packagePath,
      }),
    ).rejects.toMatchObject({
      code: ErrorCode.FS_DELETE_FAILED,
    });

    await expect(fsp.access(nestedPath)).resolves.toBeUndefined();
  });

  it("deletes only approved .luie files", async () => {
    const root = await makeTempRoot("luie-delete-approved-");
    const packagePath = path.join(root, "approved-package.luie");
    await fsp.writeFile(packagePath, "not a real package", "utf-8");
    await approvePathForSession(packagePath, ["package"], "file");

    await deleteProjectPackageFileIfRequested({
      deleteFile: true,
      projectPath: packagePath,
    });

    await expect(fsp.access(packagePath)).rejects.toMatchObject({
      code: "ENOENT",
    });
  });
});
