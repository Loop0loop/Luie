/**
 * IPC Handlers - Backward compatibility shim
 *
 * 기존 코드가 `src/main/handler/ipcHandler.ts`에서 `registerIPCHandlers`를
 * import하던 케이스를 위해 유지합니다.
 */

export { registerAllIPCHandlers, registerIPCHandlers } from "./index";
