export type TaskPacket = {
  id: string;
  title: string;
  targetFiles: string[];
  acceptance: string[];
  verifyCommands: string[];
  references?: string[];
  constraints?: string[];
};

export type ErrorReport = {
  summary: string;
  environment: {
    os?: string;
    node?: string;
    pnpm?: string;
    branch?: string;
    commit?: string;
  };
  steps: string[];
  expected: string;
  actual: string;
  logs: string[];
  impact?: string;
  suspectedFiles?: string[];
};

export type IpcChannelContractEntry = {
  key: string;
  channel: string;
  allowlisted: boolean;
  usage: {
    renderer_invoke: Array<{ file: string; line: number }>;
    main_handle: Array<{ file: string; line: number }>;
    main_emit: Array<{ file: string; line: number }>;
    renderer_listen: Array<{ file: string; line: number }>;
    renderer_send: Array<{ file: string; line: number }>;
    main_listen: Array<{ file: string; line: number }>;
  };
  usageCounts: Record<string, number>;
};
