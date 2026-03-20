export enum AgentState {
  IDLE = 'idle',
  READING = 'reading',
  WRITING = 'writing',
  EXECUTING = 'executing',
  THINKING = 'thinking',
  WAITING = 'waiting',
  ERROR = 'error'
}

export interface AgentInfo {
  id: string;
  name: string;
  state: AgentState;
  currentTask: string;
  startTime: number;
  lastActivity: number;
  eventCount: number;
  transcriptPath: string;
  isSubagent: boolean;
  parentAgentId?: string;
}

export type ExtensionMessage =
  | { type: 'agent:new'; data: AgentInfo }
  | { type: 'agent:update'; data: AgentInfo }
  | { type: 'agent:remove'; data: { id: string } }
  | { type: 'agents:list'; data: AgentInfo[] };

export type WebviewMessage =
  | { type: 'command:focus'; data: { agentId: string } }
  | { type: 'command:stop'; data: { agentId: string } }
  | { type: 'command:logs'; data: { agentId: string } }
  | { type: 'command:restart'; data: { agentId: string } }
  | { type: 'request:agents' };

declare global {
  interface Window {
    acquireVsCodeApi: () => {
      postMessage: (message: WebviewMessage) => void;
      getState: () => unknown;
      setState: (state: unknown) => void;
    };
  }
}

export const vscode = window.acquireVsCodeApi ? window.acquireVsCodeApi() : {
  postMessage: (msg: WebviewMessage) => console.log('postMessage:', msg),
  getState: () => ({}),
  setState: () => {},
};
