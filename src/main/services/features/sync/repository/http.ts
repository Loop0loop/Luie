import { getSupabaseConfig, getSupabaseConfigOrThrow } from "../supabaseEnv.js";
import type { DbRow } from "./rowUtils.js";

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

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

  const response = await fetchWithRetry(
    `${config.url}/rest/v1/${table}?${query.toString()}`,
    {
      method: "GET",
      headers: {
        apikey: config.anonKey,
        Authorization: `Bearer ${accessToken}`,
      },
    },
  );

  const payload = (await response.json()) as unknown;
  return Array.isArray(payload) ? (payload as DbRow[]) : [];
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
