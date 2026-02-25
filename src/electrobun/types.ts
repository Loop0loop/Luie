export interface ElectrobunDeepLinkPort {
  extractAuthCallbackUrl(argv: string[]): string | null;
  handleDeepLinkUrl(url: string): Promise<boolean>;
}

export interface ElectrobunShellCallbacks {
  registerProtocol(): void;
  registerSingleInstance(): boolean;
  initializeSync(): void;
  registerAppReady(): void;
  registerShutdownHandlers(): void;
}
