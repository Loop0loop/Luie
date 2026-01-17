/**
 * IPC Response types
 */

export interface IPCResponse<T = unknown> {
  success: boolean
  data?: T
  error?: {
    code: string
    message: string
  }
}

export function createSuccessResponse<T>(data: T): IPCResponse<T> {
  return {
    success: true,
    data,
  }
}

export function createErrorResponse(code: string, message: string): IPCResponse {
  return {
    success: false,
    error: {
      code,
      message,
    },
  }
}
