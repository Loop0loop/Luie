export type TransportListener = (event: unknown, payload: unknown) => void;

export interface TransportBridge {
  invoke<T = unknown>(channel: string, ...args: unknown[]): Promise<T>;
  on(channel: string, listener: TransportListener): void;
  off(channel: string, listener: TransportListener): void;
  send(channel: string, payload?: unknown): void;
}
