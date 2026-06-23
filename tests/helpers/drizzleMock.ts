import { vi } from "vitest";

export type DrizzleMock = {
  select: ReturnType<typeof vi.fn>;
  insert: ReturnType<typeof vi.fn>;
  update: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
  execute: ReturnType<typeof vi.fn>;
  run: ReturnType<typeof vi.fn>;
  transaction: ReturnType<typeof vi.fn>;
};

type ChainResult = Record<string, ReturnType<typeof vi.fn>>;

const createReturningChain = <T>(result: T): ChainResult => {
  const chain: ChainResult = {};
  const returnResult = vi.fn(() => result);
  const returnChain = vi.fn(() => chain);

  chain.from = returnChain;
  chain.where = returnChain;
  chain.limit = returnResult;
  chain.orderBy = returnChain;
  chain.values = returnChain;
  chain.set = returnChain;
  chain.onConflictDoUpdate = returnChain;
  chain.onConflictDoNothing = returnChain;
  chain.returning = returnResult;
  chain.all = returnResult;
  chain.get = returnResult;
  chain.run = returnResult;

  return chain;
};

export const mockSelectOne = <T>(row: T | undefined): ChainResult => createReturningChain(row ? [row] : []);

export const mockSelectMany = <T>(rows: T[]): ChainResult => createReturningChain(rows);

export const mockInsert = <T>(result: T = { changes: 1 } as T): ChainResult => createReturningChain(result);

export const mockUpdateReturning = <T>(rows: T[]): ChainResult => createReturningChain(rows);

export const mockDelete = <T>(result: T = { changes: 1 } as T): ChainResult => createReturningChain(result);

export const createDrizzleMock = (): DrizzleMock => {
  const mock: DrizzleMock = {
    select: vi.fn(() => mockSelectMany([])),
    insert: vi.fn(() => mockInsert()),
    update: vi.fn(() => mockUpdateReturning([])),
    delete: vi.fn(() => mockDelete()),
    execute: vi.fn(),
    run: vi.fn(),
    transaction: vi.fn((callback: (tx: DrizzleMock) => unknown) => callback(mock)),
  };
  return mock;
};
