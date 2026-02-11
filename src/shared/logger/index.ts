/**
 * Logger utility for Luie
 * Provides structured logging with different levels
 */

export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
}

export interface LoggerOptions {
  minLevel?: LogLevel
  logToFile?: boolean
  logFilePath?: string
}

export interface LogEntry {
  level: LogLevel
  message: string
  timestamp: string
  context?: string
  data?: unknown
}

export const LOG_CONTEXT = Symbol.for('luie.logger.context')

type LogContext = Record<string, unknown>

function normalizeLogData(data: unknown): unknown {
  if (!data || typeof data !== 'object') return data
  const ctx = (data as Record<symbol, unknown>)[LOG_CONTEXT]
  if (!ctx || typeof ctx !== 'object') return data
  if (Array.isArray(data)) {
    return { items: data, _ctx: ctx }
  }
  return { ...(data as Record<string, unknown>), _ctx: ctx as LogContext }
}

export function withLogContext<T = unknown>(data: T, context: LogContext) {
  if (data && typeof data === 'object') {
    return { ...(data as Record<string, unknown>), [LOG_CONTEXT]: context } as T
  }
  return { value: data, [LOG_CONTEXT]: context }
}

class Logger {
  private context: string

  constructor(context: string) {
    this.context = context
  }

  private log(level: LogLevel, message: string, data?: unknown): void {
    if (!shouldLog(level)) return

    const normalizedData = normalizeLogData(data)
    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date().toISOString(),
      context: this.context,
      data: normalizedData,
    }

    const formattedMessage = `[${entry.timestamp}] [${entry.level}] [${entry.context}] ${entry.message}`

    switch (level) {
      case LogLevel.DEBUG:
        console.debug(formattedMessage, normalizedData || '')
        break
      case LogLevel.INFO:
        console.info(formattedMessage, normalizedData || '')
        break
      case LogLevel.WARN:
        console.warn(formattedMessage, normalizedData || '')
        break
      case LogLevel.ERROR:
        console.error(formattedMessage, normalizedData || '')
        break
    }

    if (globalLoggerOptions.logToFile && globalLoggerOptions.logFilePath) {
      void writeLogToFile(entry)
    }
  }

  debug(message: string, data?: unknown): void {
    this.log(LogLevel.DEBUG, message, data)
  }

  info(message: string, data?: unknown): void {
    this.log(LogLevel.INFO, message, data)
  }

  warn(message: string, data?: unknown): void {
    this.log(LogLevel.WARN, message, data)
  }

  error(message: string, data?: unknown): void {
    this.log(LogLevel.ERROR, message, data)
  }
}

const isNodeRuntime =
  typeof process !== 'undefined' &&
  typeof process.versions !== 'undefined' &&
  Boolean(process.versions.node)

const levelOrder: Record<LogLevel, number> = {
  [LogLevel.DEBUG]: 10,
  [LogLevel.INFO]: 20,
  [LogLevel.WARN]: 30,
  [LogLevel.ERROR]: 40,
}

let globalLoggerOptions: Required<LoggerOptions> = {
  minLevel: LogLevel.DEBUG,
  logToFile: false,
  logFilePath: '',
}

let ensureLogFileReadyPromise: Promise<void> | null = null

function shouldLog(level: LogLevel): boolean {
  return levelOrder[level] >= levelOrder[globalLoggerOptions.minLevel]
}

async function ensureLogFileReady(): Promise<void> {
  if (!isNodeRuntime || !globalLoggerOptions.logFilePath) return
  if (!ensureLogFileReadyPromise) {
    ensureLogFileReadyPromise = (async () => {
      const path = await import('node:path')
      const fs = await import('node:fs/promises')
      await fs.mkdir(path.dirname(globalLoggerOptions.logFilePath), {
        recursive: true,
      })
    })()
  }
  await ensureLogFileReadyPromise
}

function safeStringify(data: unknown): string {
  try {
    return JSON.stringify(data)
  } catch {
    return '"[unserializable]"'
  }
}

async function writeLogToFile(entry: LogEntry): Promise<void> {
  if (!isNodeRuntime || !globalLoggerOptions.logFilePath) return
  try {
    await ensureLogFileReady()
    const fs = await import('node:fs/promises')
    const line = safeStringify(entry)
    await fs.appendFile(globalLoggerOptions.logFilePath, `${line}\n`, 'utf8')
  } catch {
    // ignore file logging errors to avoid crashing the app
  }
}

export function configureLogger(options: LoggerOptions): void {
  globalLoggerOptions = {
    ...globalLoggerOptions,
    ...options,
  }
}

export function createLogger(context: string): Logger {
  return new Logger(context)
}
