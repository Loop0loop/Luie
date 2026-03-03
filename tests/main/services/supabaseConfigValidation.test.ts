import { describe, expect, it } from "vitest";
import {
  normalizeRuntimeSupabaseConfigInput,
  normalizeSupabaseUrl,
  validateRuntimeSupabaseConfigInput,
} from "../../../src/main/services/features/supabaseConfigValidation.js";

describe("supabaseConfigValidation", () => {
  it("normalizes Supabase URL to project origin only", () => {
    expect(
      normalizeSupabaseUrl(
        "https://qzgyjlbpnxxpspoyibpt.supabase.co/auth/v1/callback?x=1#frag",
      ),
    ).toBe("https://qzgyjlbpnxxpspoyibpt.supabase.co");
  });

  it("normalizes runtime config URL path to origin", () => {
    const normalized = normalizeRuntimeSupabaseConfigInput({
      url: "https://qzgyjlbpnxxpspoyibpt.supabase.co/auth/v1/authorize",
      anonKey: "sb_publishable_1234567890123456",
    });
    expect(normalized).toEqual({
      url: "https://qzgyjlbpnxxpspoyibpt.supabase.co",
      anonKey: "sb_publishable_1234567890123456",
    });
  });

  it("keeps config valid when URL contained auth path", () => {
    const validation = validateRuntimeSupabaseConfigInput({
      url: "https://qzgyjlbpnxxpspoyibpt.supabase.co/auth/v1/callback",
      anonKey: "sb_publishable_1234567890123456",
    });
    expect(validation.valid).toBe(true);
    expect(validation.normalized?.url).toBe("https://qzgyjlbpnxxpspoyibpt.supabase.co");
  });
});
