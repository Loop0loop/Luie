import { getSupabaseConfig, getSupabaseConfigOrThrow } from "../supabaseEnv.js";
import type { DbRow } from "./rowUtils.js";

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;
const FETCH_PAGE_SIZE = 1_000;
const MAX_FETCH_PAGES = 10_000;

async function fetchWithRetry(
  url: string,
  options: RequestInit,
): Promise<Response> {
  const runAttempt = async (attempt: number): Promise<Response> => {
    try {
      const response = await fetch(url, options);
      if (!response.ok) {
        let body = "";
        try {
          body = await response.text();
        } catch {
          body = "";
        }
        throw new Error(`HTTP ${response.status}: ${url}: ${body}`);
      }
      return response;
    } catch (error) {
      if (attempt === MAX_RETRIES) throw error;
      await new Promise((resolve) =>
        setTimeout(resolve, RETRY_DELAY_MS * Math.pow(2, attempt - 1)),
      );
      return runAttempt(attempt + 1);
    }
  };
  return runAttempt(1);
}

const isMissingTableError = (error: unknown, table: string): boolean => {
  const message = error instanceof Error ? error.message : String(error);
  return (
    (message.includes("HTTP 404") ||
      message.includes("HTTP 400") ||
      message.includes("PGRST205") ||
      message.includes("PGRST202") ||
      message.includes(`'${table}'`) ||
      message.includes(`"${table}"`) ||
      message.includes(`${table}`)) &&
    (message.toLowerCase().includes("does not exist") ||
      message.toLowerCase().includes("not found") ||
      message.includes("PGRST205") ||
      message.includes("PGRST202"))
  );
};

export async function fetchTableRaw(
  table: string,
  accessToken: string,
  userId: string,
): Promise<DbRow[]> {
  const config = getSupabaseConfig();
  if (!config) {
    throw new Error(
      "SUPABASE_NOT_CONFIGURED: runtime configuration is not completed",
    );
  }

  const query = new URLSearchParams();
  query.set("select", "*");
  query.set("user_id", `eq.${userId}`);
  query.set("order", "id.asc");

  const rows: DbRow[] = [];
  let expectedTotal: number | null = null;
  for (let page = 0; page < MAX_FETCH_PAGES; page += 1) {
    const start = rows.length;
    const response = await fetchWithRetry(
      `${config.url}/rest/v1/${table}?${query.toString()}`,
      {
        method: "GET",
        headers: {
          apikey: config.anonKey,
          Authorization: `Bearer ${accessToken}`,
          Prefer: "count=exact",
          Range: `${start}-${start + FETCH_PAGE_SIZE - 1}`,
          "Range-Unit": "items",
        },
      },
    );
    const payload = (await response.json()) as unknown;
    const pageRows = Array.isArray(payload) ? (payload as DbRow[]) : [];
    const contentRange = response.headers.get("content-range");
    const match = contentRange?.match(/^(?:(\d+)-(\d+)|\*)\/(\d+|\*)$/);
    if (contentRange && !match) {
      throw new Error(`SYNC_PAGINATION_INVALID_CONTENT_RANGE:${table}`);
    }
    if (!contentRange && pageRows.length > 0) {
      throw new Error(`SYNC_PAGINATION_MISSING_CONTENT_RANGE:${table}`);
    }
    if (match) {
      const rangeStart = match[1] === undefined ? null : Number(match[1]);
      const rangeEnd = match[2] === undefined ? null : Number(match[2]);
      const total = match[3] === "*" ? null : Number(match[3]);
      if (
        pageRows.length > 0 &&
        (rangeStart !== start ||
          rangeEnd === null ||
          rangeEnd - rangeStart + 1 !== pageRows.length)
      ) {
        throw new Error(`SYNC_PAGINATION_RANGE_MISMATCH:${table}`);
      }
      if (total !== null) {
        if (expectedTotal !== null && expectedTotal !== total) {
          throw new Error(`SYNC_PAGINATION_TOTAL_CHANGED:${table}`);
        }
        expectedTotal = total;
      }
    }
    rows.push(...pageRows);
    if (expectedTotal !== null) {
      if (rows.length === expectedTotal) return rows;
      if (rows.length > expectedTotal || pageRows.length === 0) {
        throw new Error(`SYNC_PAGINATION_INCOMPLETE:${table}`);
      }
    } else if (pageRows.length === 0) {
      return rows;
    }
  }
  throw new Error(`SYNC_PAGINATION_PAGE_LIMIT:${table}`);
}

export async function fetchOptionalTableRaw(
  table: string,
  accessToken: string,
  userId: string,
): Promise<DbRow[]> {
  try {
    return await fetchTableRaw(table, accessToken, userId);
  } catch (error) {
    if (isMissingTableError(error, table)) {
      return [];
    }
    throw error;
  }
}

export async function upsertTable(
  table: string,
  accessToken: string,
  rows: Array<Record<string, unknown>>,
  onConflict: string,
): Promise<void> {
  if (rows.length === 0) return;

  const config = getSupabaseConfigOrThrow();

  await fetchWithRetry(
    `${config.url}/rest/v1/${table}?on_conflict=${encodeURIComponent(onConflict)}`,
    {
      method: "POST",
      headers: {
        apikey: config.anonKey,
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        Prefer: "resolution=merge-duplicates,return=minimal",
      },
      body: JSON.stringify(rows),
    },
  );
}

export async function upsertOptionalTable(
  table: string,
  accessToken: string,
  rows: Array<Record<string, unknown>>,
  onConflict: string,
): Promise<void> {
  try {
    await upsertTable(table, accessToken, rows, onConflict);
  } catch (error) {
    if (isMissingTableError(error, table)) {
      return;
    }
    throw error;
  }
}
