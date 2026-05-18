import path from "node:path";
import { app, utilityProcess } from "electron";
import type { UtilityProcess } from "electron";
import { createLogger } from "../../../../shared/logger/index.js";

const logger = createLogger("UtilityProcessBridge");
const START_TIMEOUT_MS = 5_000;
const STOP_TIMEOUT_MS = 2_000;

const isProd = process.env.NODE_ENV === "production";

type UtilityOutboundMessage =
  | { type: "pong"; requestId?: string; pid: number }
  | { type: "shutdown-ack"; requestId?: string };

export class UtilityProcessBridge {
  private utilityChild: UtilityProcess | null = null;
  private requestSeq = 0;

  async start(): Promise<boolean> {
    if (this.utilityChild) return true;

    const entryPath = isProd
      ? path.join(process.resourcesPath, "app.asar", "out", "main", "utilityProcessMain.js")
      : path.join(app.getAppPath(), "out", "main", "utilityProcessMain.js");

    try {
      const child = utilityProcess.fork(entryPath);
      child.on("spawn", () => {
        logger.info("Utility process spawned", { pid: child.pid, entryPath });
      });
      child.on("exit", (code) => {
        logger.info("Utility process exited", { pid: child.pid, code });
        this.utilityChild = null;
      });
      child.on("message", (message) => {
        logger.info("Utility process message", { message });
      });
      this.utilityChild = child;
      const healthy = await this.ping();
      if (!healthy) {
        logger.warn("Utility process did not pass health check", { pid: child.pid });
        this.stop();
        return false;
      }
      logger.info("Utility process health check passed", { pid: child.pid });
      return true;
    } catch (error) {
      logger.error("Failed to start utility process", { entryPath, error });
      return false;
    }
  }

  stop(): void {
    if (!this.utilityChild) return;
    try {
      const child = this.utilityChild;
      const requestId = this.nextRequestId();
      const timeout = setTimeout(() => {
        try {
          child.kill();
        } catch (error) {
          logger.warn("Failed to kill utility process after timeout", { error });
        }
      }, STOP_TIMEOUT_MS);
      const onMessage = (raw: unknown) => {
        const message = raw as UtilityOutboundMessage;
        if (message?.type === "shutdown-ack" && message.requestId === requestId) {
          clearTimeout(timeout);
          child.off("message", onMessage);
          try {
            child.kill();
          } catch (error) {
            logger.warn("Failed to kill utility process after shutdown ack", { error });
          }
        }
      };
      child.on("message", onMessage);
      child.postMessage({ type: "shutdown", requestId });
    } catch (error) {
      logger.warn("Failed to stop utility process", { error });
    } finally {
      this.utilityChild = null;
    }
  }

  private async ping(): Promise<boolean> {
    const child = this.utilityChild;
    if (!child) return false;
    const requestId = this.nextRequestId();
    return new Promise<boolean>((resolve) => {
      const timeout = setTimeout(() => {
        child.off("message", onMessage);
        resolve(false);
      }, START_TIMEOUT_MS);
      const onMessage = (raw: unknown) => {
        const message = raw as UtilityOutboundMessage;
        if (message?.type === "pong" && message.requestId === requestId) {
          clearTimeout(timeout);
          child.off("message", onMessage);
          resolve(true);
        }
      };
      child.on("message", onMessage);
      child.postMessage({ type: "ping", requestId });
    });
  }

  private nextRequestId(): string {
    this.requestSeq += 1;
    return `req-${this.requestSeq}`;
  }
}

export const utilityProcessBridge = new UtilityProcessBridge();
