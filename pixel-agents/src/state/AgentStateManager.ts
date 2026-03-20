import { EventEmitter } from 'events';
import { AgentState } from './ActivityDetector';

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

export type AgentEventType = 'agent:new' | 'agent:update' | 'agent:remove';

export class AgentStateManager extends EventEmitter {
  private agents: Map<string, AgentInfo> = new Map();
  private agentNameCounter: number = 1;
  private inactivityCheckInterval: NodeJS.Timeout | null = null;
  private readonly INACTIVITY_THRESHOLD = 60000; // 60 seconds

  constructor() {
    super();
    this.startInactivityCheck();
  }

  registerAgent(sessionId: string, transcriptPath: string): void {
    // Check if already registered
    if (this.agents.has(sessionId)) {
      return;
    }

    const agent: AgentInfo = {
      id: sessionId,
      name: `Agent ${this.agentNameCounter++}`,
      state: AgentState.IDLE,
      currentTask: 'Initializing...',
      startTime: Date.now(),
      lastActivity: Date.now(),
      eventCount: 0,
      transcriptPath,
      isSubagent: this.detectSubagent(sessionId)
    };

    this.agents.set(sessionId, agent);
    this.emitUpdate('agent:new', agent);
    
    console.log(`[AgentStateManager] Registered agent: ${agent.name} (${sessionId})`);
  }

  updateAgentState(sessionId: string, state: AgentState, task: string): void {
    const agent = this.agents.get(sessionId);
    if (!agent) {
      return;
    }

    const hasChanged = agent.state !== state || agent.currentTask !== task;
    
    agent.state = state;
    agent.currentTask = task;
    agent.lastActivity = Date.now();
    agent.eventCount++;

    if (hasChanged) {
      this.emitUpdate('agent:update', agent);
    }
  }

  removeAgent(sessionId: string): void {
    const agent = this.agents.get(sessionId);
    if (agent) {
      this.agents.delete(sessionId);
      this.emit('agent:remove', { id: sessionId });
      console.log(`[AgentStateManager] Removed agent: ${agent.name} (${sessionId})`);
    }
  }

  getAgent(sessionId: string): AgentInfo | undefined {
    return this.agents.get(sessionId);
  }

  getActiveAgents(): AgentInfo[] {
    return Array.from(this.agents.values())
      .filter(a => Date.now() - a.lastActivity < this.INACTIVITY_THRESHOLD);
  }

  getAllAgents(): AgentInfo[] {
    return Array.from(this.agents.values());
  }

  private emitUpdate(event: AgentEventType, data: AgentInfo): void {
    this.emit(event, data);
  }

  private detectSubagent(sessionId: string): boolean {
    // Heuristic: subagent sessions are often created shortly after parent sessions
    // This is a simplified detection - could be improved with transcript analysis
    return false;
  }

  private startInactivityCheck(): void {
    // Check for inactive agents every 30 seconds
    this.inactivityCheckInterval = setInterval(() => {
      const now = Date.now();
      
      for (const [sessionId, agent] of this.agents) {
        const inactiveTime = now - agent.lastActivity;
        
        // Mark as idle if inactive for more than 30 seconds
        if (inactiveTime > 30000 && agent.state !== AgentState.IDLE && agent.state !== AgentState.WAITING) {
          agent.state = AgentState.IDLE;
          this.emitUpdate('agent:update', agent);
        }
        
        // Remove agents inactive for more than 5 minutes
        if (inactiveTime > 300000) {
          this.removeAgent(sessionId);
        }
      }
    }, 30000);
  }

  dispose(): void {
    if (this.inactivityCheckInterval) {
      clearInterval(this.inactivityCheckInterval);
      this.inactivityCheckInterval = null;
    }
    this.agents.clear();
    this.removeAllListeners();
  }
}

export { AgentState };
