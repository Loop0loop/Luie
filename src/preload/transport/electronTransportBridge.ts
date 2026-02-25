import { ipcRenderer } from "electron";
import type {
  TransportBridge,
  TransportListener,
} from "../../shared/transport/transportBridge.js";

export const electronTransportBridge: TransportBridge = {
  invoke: (channel, ...args) => ipcRenderer.invoke(channel, ...args),
  on: (channel, listener) =>
    ipcRenderer.on(channel, listener as Parameters<typeof ipcRenderer.on>[1]),
  off: (channel, listener) =>
    ipcRenderer.removeListener(
      channel,
      listener as Parameters<typeof ipcRenderer.removeListener>[1],
    ),
  send: (channel, payload) => ipcRenderer.send(channel, payload),
};

export type { TransportBridge, TransportListener };
