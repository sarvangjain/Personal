import { AgentInfo, AgentState } from '../types';

interface AgentListProps {
  agents: AgentInfo[];
  onFocusAgent: (agentId: string) => void;
  onStopAgent: (agentId: string) => void;
  onOpenLogs: (agentId: string) => void;
  onRestartAgent: (agentId: string) => void;
}

function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  }
  return `${seconds}s`;
}

function getStateEmoji(state: AgentState): string {
  switch (state) {
    case AgentState.IDLE: return '💤';
    case AgentState.READING: return '📖';
    case AgentState.WRITING: return '✍️';
    case AgentState.EXECUTING: return '⚡';
    case AgentState.THINKING: return '🤔';
    case AgentState.WAITING: return '⏳';
    case AgentState.ERROR: return '❌';
    default: return '🤖';
  }
}

export function AgentList({ 
  agents, 
  onFocusAgent, 
  onStopAgent, 
  onOpenLogs, 
  onRestartAgent 
}: AgentListProps) {
  if (agents.length === 0) {
    return (
      <div className="no-agents">
        <div className="icon">🤖</div>
        <h3>No Agents Detected</h3>
        <p>Start a Cursor agent to see it appear here. Agents are detected automatically when they start processing.</p>
      </div>
    );
  }

  return (
    <div className="agent-list">
      {agents.map(agent => {
        const duration = Date.now() - agent.startTime;
        const isActive = agent.state !== AgentState.IDLE;

        return (
          <div key={agent.id} className="agent-card">
            <div className="agent-header">
              <span className="agent-name">
                {getStateEmoji(agent.state)} {agent.name}
                {agent.isSubagent && <span style={{ fontSize: '10px', marginLeft: '4px' }}>(sub)</span>}
              </span>
              <span className={`state-badge state-${agent.state}`}>
                {agent.state}
              </span>
            </div>
            
            <div className="agent-task" title={agent.currentTask}>
              {agent.currentTask}
            </div>
            
            <div className="agent-meta">
              <span>📊 {agent.eventCount} events</span>
              <span>⏱️ {formatDuration(duration)}</span>
            </div>
            
            <div className="agent-actions">
              <button onClick={() => onFocusAgent(agent.id)} title="Focus terminal">
                Focus
              </button>
              {isActive && (
                <button 
                  onClick={() => onStopAgent(agent.id)} 
                  className="danger"
                  title="Stop agent"
                >
                  Stop
                </button>
              )}
              <button onClick={() => onOpenLogs(agent.id)} title="View transcript">
                Logs
              </button>
              <button onClick={() => onRestartAgent(agent.id)} title="Restart agent">
                Restart
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
