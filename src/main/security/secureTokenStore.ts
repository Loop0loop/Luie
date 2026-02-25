import { safeStorage } from "electron";

export interface SecureTokenStore {
  isEncryptionAvailable(): boolean;
  encryptString(value: string): Buffer;
  decryptString(payload: Buffer): string;
}

class ElectronSecureTokenStore implements SecureTokenStore {
  isEncryptionAvailable(): boolean {
    return safeStorage.isEncryptionAvailable();
  }

  encryptString(value: string): Buffer {
    return safeStorage.encryptString(value);
  }

  decryptString(payload: Buffer): string {
    return safeStorage.decryptString(payload);
  }
}

export const secureTokenStore: SecureTokenStore = new ElectronSecureTokenStore();
