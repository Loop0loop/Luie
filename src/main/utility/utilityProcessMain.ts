import { parentPort } from "node:worker_threads";
import { createLogger } from "../../shared/logger/index.js";

const logger = createLogger("UtilityProcessMain");

type UtilityInboundMessage =
  | { type: "ping"; requestId?: string }
  | { type: "shutdown"; requestId?: string };

type UtilityOutboundMessage =
  | { type: "pong"; requestId?: string; pid: number }
  | { type: "shutdown-ack"; requestId?: string };

const post = (message: UtilityOutboundMessage): void => {
  parentPort?.postMessage(message);
};

const onMessage = (raw: unknown): void => {
  const message = raw as UtilityInboundMessage;
  if (message?.type === "ping") {
    post({ type: "pong", requestId: message.requestId, pid: process.pid });
    return;
  }
  if (message?.type === "shutdown") {
    post({ type: "shutdown-ack", requestId: message.requestId });
    setTimeout(() => process.exit(0), 0);
  }
};

parentPort?.on("message", onMessage);
logger.info("Utility process online", { pid: process.pid });
