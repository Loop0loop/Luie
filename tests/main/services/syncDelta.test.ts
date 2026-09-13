import { describe, expect, it } from "vitest";
import {
  buildSyncDeltaBundle,
  collectSyncBundleProjectIds,
  filterSyncBundleByProjectIds,
} from "../../../src/main/services/features/sync/syncDelta.js";
import { createEmptySyncBundle } from "../../../src/main/services/features/sync/syncMapper.js";

const UPDATED_AT = "2026-09-13T00:00:00.000Z";

const createBundle = () => {
  const bundle = createEmptySyncBundle();
  bundle.projects.push({
    id: "project-1",
    userId: "user-1",
    title: "Project",
    description: null,
    createdAt: UPDATED_AT,
    updatedAt: UPDATED_AT,
  });
  bundle.chapters.push(
    {
      id: "chapter-1",
      userId: "user-1",
      projectId: "project-1",
      title: "Chapter 1",
      content: "unchanged",
      order: 0,
      wordCount: 1,
      createdAt: UPDATED_AT,
      updatedAt: UPDATED_AT,
    },
    {
      id: "chapter-2",
      userId: "user-1",
      projectId: "project-1",
      title: "Chapter 2",
      content: "kept for package",
      order: 1,
      wordCount: 3,
      createdAt: UPDATED_AT,
      updatedAt: UPDATED_AT,
    },
  );
  return bundle;
};

describe("sync delta selection", () => {
  it("returns an empty delta when baseline and target are identical", () => {
    const baseline = createBundle();
    const delta = buildSyncDeltaBundle(baseline, structuredClone(baseline));

    expect(delta).toEqual(createEmptySyncBundle());
  });

  it("includes a row when updatedAt changed", () => {
    const baseline = createBundle();
    const target = structuredClone(baseline);
    target.chapters[0]!.updatedAt = "2026-09-13T00:01:00.000Z";

    const delta = buildSyncDeltaBundle(baseline, target);

    expect(delta.chapters.map((row) => row.id)).toEqual(["chapter-1"]);
  });

  it("uses the canonical hash when content changed at the same updatedAt", () => {
    const baseline = createBundle();
    const target = structuredClone(baseline);
    target.chapters[0]!.content = "changed without a timestamp change";

    const delta = buildSyncDeltaBundle(baseline, target);

    expect(delta.chapters).toEqual([target.chapters[0]]);
  });

  it("uses project and document type as the world document identity", () => {
    const baseline = createEmptySyncBundle();
    baseline.worldDocuments.push({
      id: "remote-row-id",
      userId: "user-1",
      projectId: "project-1",
      docType: "synopsis",
      payload: { updatedAt: UPDATED_AT, synopsis: "same" },
      updatedAt: UPDATED_AT,
    });
    const target = structuredClone(baseline);
    target.worldDocuments[0]!.id = "project-1:synopsis";

    const delta = buildSyncDeltaBundle(baseline, target);

    expect(delta.worldDocuments).toEqual([]);
  });

  it("keeps the full merged project payload for a changed child row", () => {
    const merged = createBundle();
    const delta = createEmptySyncBundle();
    delta.chapters.push(merged.chapters[0]!);

    const projectIds = collectSyncBundleProjectIds(delta);
    const packageBundle = filterSyncBundleByProjectIds(merged, projectIds);

    expect([...projectIds]).toEqual(["project-1"]);
    expect(packageBundle.projects).toEqual(merged.projects);
    expect(packageBundle.chapters).toEqual(merged.chapters);
  });
});
