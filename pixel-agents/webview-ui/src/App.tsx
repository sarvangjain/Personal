import { useState, useEffect, useCallback } from 'react';
import { AgentCanvas } from './components/AgentCanvas';
import { AgentList } from './components/AgentList';
import { ControlPanel } from './components/ControlPanel';
import { AgentInfo, ExtensionMessage, vscode } from './types';

type ViewMode = 'canvas' | 'list';

function App() {
  const [agents, setAgents] = useState<AgentInfo[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('canvas');

  const handleMessage = useCallback((event: MessageEvent<ExtensionMessage>) => {
    const message = event.data;

    switch (message.type) {
      case 'agent:new':
        setAgents(prev => {
          const exists = prev.some(a => a.id === message.data.id);
          if (exists) return prev;
          return [...prev, message.data];
        });
        break;

      case 'agent:update':
        setAgents(prev => prev.map(a =>
          a.id === message.data.id ? message.data : a
        ));
        break;

      case 'agent:remove':
        setAgents(prev => prev.filter(a => a.id !== message.data.id));
        break;

      case 'agents:list':
        setAgents(message.data);
        break;
    }
  }, []);

  useEffect(() => {
    window.addEventListener('message', handleMessage);

    // Request initial agent list from extension
    vscode.postMessage({ type: 'request:agents' });

    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, [handleMessage]);

  const handleFocusAgent = useCallback((agentId: string) => {
    vscode.postMessage({ type: 'command:focus', data: { agentId } });
  }, []);

  const handleStopAgent = useCallback((agentId: string) => {
    vscode.postMessage({ type: 'command:stop', data: { agentId } });
  }, []);

  const handleOpenLogs = useCallback((agentId: string) => {
    vscode.postMessage({ type: 'command:logs', data: { agentId } });
  }, []);

  const handleRestartAgent = useCallback((agentId: string) => {
    vscode.postMessage({ type: 'command:restart', data: { agentId } });
  }, []);

  return (
    <div className="app">
      <ControlPanel 
        viewMode={viewMode} 
        onViewModeChange={setViewMode}
        agentCount={agents.length}
      />
      {viewMode === 'canvas' ? (
        <AgentCanvas 
          agents={agents}
          onFocusAgent={handleFocusAgent}
          onStopAgent={handleStopAgent}
        />
      ) : (
        <AgentList 
          agents={agents}
          onFocusAgent={handleFocusAgent}
          onStopAgent={handleStopAgent}
          onOpenLogs={handleOpenLogs}
          onRestartAgent={handleRestartAgent}
        />
      )}
    </div>
  );
}

export default App;
