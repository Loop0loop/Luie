import type { Snapshot } from "../../../shared/types";

type SnapshotListMessage = {
  snapshots: Snapshot[];
};

type SnapshotListItem = {
  snapshot: Snapshot;
  formattedDate: string;
};

type SnapshotListResult = {
  items: SnapshotListItem[];
};

const formatDate = (value: Snapshot["createdAt"]): string => {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString();
};

self.addEventListener("message", (event: MessageEvent<SnapshotListMessage>) => {
  const snapshots = event.data?.snapshots ?? [];
  const items: SnapshotListItem[] = snapshots.map((snapshot) => ({
    snapshot,
    formattedDate: formatDate(snapshot.createdAt),
  }));
  const payload: SnapshotListResult = { items };
  self.postMessage(payload);
});
