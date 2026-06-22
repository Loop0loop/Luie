import {
  REQUEST_TIMEOUT_ASK_MS,
  REQUEST_TIMEOUT_EMBED_MS,
  REQUEST_TIMEOUT_GENERATE_MS,
  REQUEST_TIMEOUT_SIDECAR_START_MS,
  REQUEST_TIMEOUT_STATUS_MS,
  REQUEST_TIMEOUT_STOP_MS,
  type UtilityInboundMessage,
} from "../protocol.js";
import type { UtilityRagQaRequest } from "../../../../../../shared/types/index.js";

export type UtilityRequestMethod =
  | "ragQa.ask"
  | "ragQa.stop"
  | "embedding.embed"
  | "llm.generateText"
  | "sidecar.start"
  | "sidecar.status"
  | "sidecar.stop";

export function getUtilityRequestTimeoutMs(
  method: UtilityRequestMethod,
): number {
  if (method === "ragQa.stop" || method === "sidecar.stop") {
    return REQUEST_TIMEOUT_STOP_MS;
  }
  if (method === "sidecar.status") return REQUEST_TIMEOUT_STATUS_MS;
  if (method === "sidecar.start") return REQUEST_TIMEOUT_SIDECAR_START_MS;
  if (method === "embedding.embed") return REQUEST_TIMEOUT_EMBED_MS;
  if (method === "llm.generateText") return REQUEST_TIMEOUT_GENERATE_MS;
  return REQUEST_TIMEOUT_ASK_MS;
}

export function buildUtilityRequestMessage(input: {
  requestId: string;
  method: UtilityRequestMethod;
  payload?: unknown;
}): UtilityInboundMessage {
  if (input.method === "ragQa.ask") {
    return {
      type: "request",
      requestId: input.requestId,
      method: input.method,
      payload: input.payload as UtilityRagQaRequest,
    };
  }
  if (input.method === "sidecar.status" || input.method === "sidecar.stop") {
    return {
      type: "request",
      requestId: input.requestId,
      method: input.method,
    };
  }
  return {
    type: "request",
    requestId: input.requestId,
    method: input.method,
    payload: input.payload,
  } as UtilityInboundMessage;
}
