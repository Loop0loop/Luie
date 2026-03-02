import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { api } from "@shared/api";
import type {
  RuntimeSupabaseConfig,
  RuntimeSupabaseConfigView,
  StartupReadiness,
  SyncStatus,
} from "@shared/types";

const EMPTY_RUNTIME_CONFIG: RuntimeSupabaseConfig = {
  url: "",
  anonKey: "",
};

const DEFAULT_SYNC_STATUS: SyncStatus = {
  connected: false,
  autoSync: true,
  mode: "idle",
  health: "disconnected",
  inFlight: false,
  queued: false,
  conflicts: {
    chapters: 0,
    memos: 0,
    total: 0,
    items: [],
  },
};

type WizardStep = 0 | 1 | 2 | 3;

const getErrorMessage = (message: unknown): string =>
  message instanceof Error ? message.message : String(message);

export default function StartupWizard() {
  const { t } = useTranslation();
  const [step, setStep] = useState<WizardStep>(0);
  const [readiness, setReadiness] = useState<StartupReadiness | null>(null);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(DEFAULT_SYNC_STATUS);
  const [runtimeConfig, setRuntimeConfig] = useState<RuntimeSupabaseConfig>(EMPTY_RUNTIME_CONFIG);
  const [runtimeConfigView, setRuntimeConfigView] =
    useState<RuntimeSupabaseConfigView | null>(null);
  const [issues, setIssues] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const stepTitles = useMemo(
    () => [
      t("startupWizard.steps.diagnostics", { defaultValue: "Diagnostics" }),
      t("startupWizard.steps.runtimeConfig", {
        defaultValue: "Supabase Runtime Config",
      }),
      t("startupWizard.steps.oauth", { defaultValue: "Google OAuth" }),
      t("startupWizard.steps.complete", { defaultValue: "Complete" }),
    ],
    [t],
  );

  const refreshReadiness = useCallback(async () => {
    const response = await api.startup.getReadiness();
    if (response.success && response.data) {
      setReadiness(response.data);
    }
  }, []);

  const refreshRuntimeConfig = useCallback(async () => {
    const response = await api.sync.getRuntimeConfig();
    if (response.success && response.data) {
      setRuntimeConfigView(response.data);
      setRuntimeConfig((prev) => ({
        url: response.data?.url ?? prev.url,
        anonKey: prev.anonKey,
      }));
    }
  }, []);

  const refreshSyncStatus = useCallback(async () => {
    const response = await api.sync.getStatus();
    if (response.success && response.data) {
      setSyncStatus(response.data);
    }
  }, []);

  useEffect(() => {
    void refreshReadiness();
    void refreshRuntimeConfig();
    void refreshSyncStatus();

    const unsubscribe = api.sync.onStatusChanged((status) => {
      setSyncStatus(status);
    });

    return unsubscribe;
  }, [refreshReadiness, refreshRuntimeConfig, refreshSyncStatus]);

  const blockingFailures = useMemo(
    () => readiness?.checks.filter((check) => check.blocking && !check.ok) ?? [],
    [readiness],
  );

  const canComplete = useMemo(() => {
    if (!readiness) return false;
    return blockingFailures.length === 0;
  }, [blockingFailures.length, readiness]);

  const validateRuntimeConfig = useCallback(async () => {
    setBusy(true);
    setMessage(null);
    try {
      const response = await api.sync.validateRuntimeConfig(runtimeConfig);
      if (!response.success || !response.data) {
        setIssues(["VALIDATION_REQUEST_FAILED"]);
        return false;
      }
      setIssues(response.data.issues);
      return response.data.valid;
    } catch (error) {
      setIssues([getErrorMessage(error)]);
      return false;
    } finally {
      setBusy(false);
    }
  }, [runtimeConfig]);

  const saveRuntimeConfig = useCallback(async () => {
    setBusy(true);
    setMessage(null);
    try {
      const response = await api.sync.setRuntimeConfig(runtimeConfig);
      if (!response.success) {
        setMessage(response.error?.message ?? "Failed to save runtime config");
        return false;
      }
      setRuntimeConfigView(response.data ?? null);
      setRuntimeConfig((prev) => ({ ...prev, anonKey: "" }));
      await refreshReadiness();
      setMessage("Runtime Supabase config saved.");
      return true;
    } catch (error) {
      setMessage(getErrorMessage(error));
      return false;
    } finally {
      setBusy(false);
    }
  }, [refreshReadiness, runtimeConfig]);

  const connectGoogle = useCallback(async () => {
    setBusy(true);
    setMessage(null);
    try {
      const response = await api.sync.connectGoogle();
      if (!response.success) {
        setMessage(response.error?.message ?? "Failed to start Google login");
        return;
      }
      setMessage("Browser opened. Complete Google login and return to this app.");
    } catch (error) {
      setMessage(getErrorMessage(error));
    } finally {
      setBusy(false);
    }
  }, []);

  const completeWizard = useCallback(async () => {
    setBusy(true);
    setMessage(null);
    try {
      await refreshReadiness();
      const latest = await api.startup.getReadiness();
      const unresolved =
        latest.success && latest.data
          ? latest.data.checks.filter((check) => check.blocking && !check.ok)
          : [];
      if (unresolved.length > 0) {
        setMessage("All startup checks must pass before entering main window.");
        return;
      }

      const response = await api.startup.completeWizard();
      if (!response.success) {
        setMessage(response.error?.message ?? "Failed to complete wizard");
        return;
      }
      setMessage("Startup completed. Launching main window...");
    } catch (error) {
      setMessage(getErrorMessage(error));
    } finally {
      setBusy(false);
    }
  }, [refreshReadiness]);

  return (
    <div className="min-h-screen bg-app text-fg flex items-center justify-center px-6 py-8">
      <div className="w-full max-w-5xl rounded-2xl border border-border bg-panel shadow-xl overflow-hidden">
        <div className="border-b border-border px-6 py-5">
          <p className="text-xs uppercase tracking-[0.18em] text-muted">Luie Startup Wizard</p>
          <h1 className="mt-2 text-2xl font-semibold">
            {t("startupWizard.title", { defaultValue: "Pre-main startup checks" })}
          </h1>
          <p className="mt-2 text-sm text-muted">
            {t("startupWizard.subtitle", {
              defaultValue:
                "Complete diagnostics, runtime setup, and login before entering the main window.",
            })}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-[220px_1fr]">
          <aside className="border-r border-border p-4">
            <ol className="space-y-2">
              {stepTitles.map((title, index) => (
                <li key={title}>
                  <button
                    type="button"
                    onClick={() => setStep(index as WizardStep)}
                    className={`w-full rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                      step === index
                        ? "bg-accent text-white"
                        : "bg-surface text-muted hover:text-fg"
                    }`}
                  >
                    {index + 1}. {title}
                  </button>
                </li>
              ))}
            </ol>
          </aside>

          <section className="p-6 space-y-5">
            {step === 0 && (
              <div className="space-y-4">
                <h2 className="text-lg font-semibold">Diagnostics</h2>
                <div className="grid gap-2">
                  {(readiness?.checks ?? []).map((check) => (
                    <div
                      key={check.key}
                      className={`rounded-lg border px-3 py-2 text-sm ${
                        check.ok
                          ? "border-emerald-500/30 bg-emerald-500/10"
                          : "border-danger/40 bg-danger/10"
                      }`}
                    >
                      <div className="font-medium">
                        {check.key}: {check.ok ? "OK" : "FAIL"}
                      </div>
                      {check.detail && <div className="mt-1 text-xs text-muted">{check.detail}</div>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {step === 1 && (
              <div className="space-y-4">
                <h2 className="text-lg font-semibold">Supabase Runtime Config</h2>
                <p className="text-sm text-muted">
                  In packaged app, this runtime config is the primary source.
                </p>
                <label className="block space-y-1">
                  <span className="text-xs uppercase tracking-wider text-muted">Supabase URL</span>
                  <input
                    value={runtimeConfig.url}
                    onChange={(event) =>
                      setRuntimeConfig((prev) => ({ ...prev, url: event.target.value }))
                    }
                    className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-accent"
                    placeholder="https://your-project.supabase.co"
                  />
                </label>
                <label className="block space-y-1">
                  <span className="text-xs uppercase tracking-wider text-muted">Supabase Anon Key</span>
                  <input
                    type="password"
                    value={runtimeConfig.anonKey}
                    onChange={(event) =>
                      setRuntimeConfig((prev) => ({ ...prev, anonKey: event.target.value }))
                    }
                    className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-accent"
                    placeholder="eyJhbGci..."
                  />
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => void validateRuntimeConfig()}
                    disabled={busy}
                    className="rounded-lg border border-border px-3 py-2 text-sm hover:bg-surface-hover disabled:opacity-60"
                  >
                    Validate
                  </button>
                  <button
                    type="button"
                    onClick={() => void saveRuntimeConfig()}
                    disabled={busy}
                    className="rounded-lg bg-accent px-3 py-2 text-sm text-white hover:bg-accent/90 disabled:opacity-60"
                  >
                    Save Runtime Config
                  </button>
                </div>
                {runtimeConfigView && (
                  <p className="text-xs text-muted">
                    Current: {runtimeConfigView.url ?? "-"} / anonKey:{" "}
                    {runtimeConfigView.hasAnonKey ? "configured" : "missing"}
                  </p>
                )}
                {issues.length > 0 && (
                  <ul className="rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-xs text-danger-fg space-y-1">
                    {issues.map((issue) => (
                      <li key={issue}>{issue}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4">
                <h2 className="text-lg font-semibold">Google OAuth</h2>
                <p className="text-sm text-muted">
                  Login is required before Edge AI and sync become available.
                </p>
                <div className="rounded-lg border border-border bg-surface px-3 py-2 text-sm">
                  Status: {syncStatus.connected ? "Connected" : "Disconnected"} / health:{" "}
                  {syncStatus.health}
                </div>
                <button
                  type="button"
                  onClick={() => void connectGoogle()}
                  disabled={busy}
                  className="rounded-lg bg-accent px-3 py-2 text-sm text-white hover:bg-accent/90 disabled:opacity-60"
                >
                  Connect Google
                </button>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-4">
                <h2 className="text-lg font-semibold">Complete</h2>
                <p className="text-sm text-muted">
                  Complete wizard only when all blocking checks are green.
                </p>
                <button
                  type="button"
                  onClick={() => void completeWizard()}
                  disabled={busy || !canComplete}
                  className="rounded-lg bg-accent px-4 py-2 text-sm text-white hover:bg-accent/90 disabled:opacity-60"
                >
                  Complete Wizard
                </button>
                {!canComplete && (
                  <p className="text-xs text-danger-fg">
                    Unresolved checks: {blockingFailures.map((entry) => entry.key).join(", ")}
                  </p>
                )}
              </div>
            )}

            {message && (
              <div className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-fg">
                {message}
              </div>
            )}

            <div className="flex items-center justify-between border-t border-border pt-4">
              <button
                type="button"
                onClick={() => setStep((prev) => Math.max(0, prev - 1) as WizardStep)}
                className="rounded-lg border border-border px-3 py-2 text-sm hover:bg-surface-hover disabled:opacity-60"
                disabled={step === 0 || busy}
              >
                Previous
              </button>
              <button
                type="button"
                onClick={() => setStep((prev) => Math.min(3, prev + 1) as WizardStep)}
                className="rounded-lg border border-border px-3 py-2 text-sm hover:bg-surface-hover disabled:opacity-60"
                disabled={step === 3 || busy}
              >
                Next
              </button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
