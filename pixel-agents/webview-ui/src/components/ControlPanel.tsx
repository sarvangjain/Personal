interface ControlPanelProps {
  viewMode: 'canvas' | 'list';
  onViewModeChange: (mode: 'canvas' | 'list') => void;
  agentCount: number;
}

export function ControlPanel({ viewMode, onViewModeChange, agentCount }: ControlPanelProps) {
  return (
    <div className="control-panel">
      <button 
        className={viewMode === 'canvas' ? 'active' : ''} 
        onClick={() => onViewModeChange('canvas')}
        title="Canvas View"
      >
        🖼️ Canvas
      </button>
      <button 
        className={viewMode === 'list' ? 'active' : ''} 
        onClick={() => onViewModeChange('list')}
        title="List View"
      >
        📋 List
      </button>
      <span style={{ 
        marginLeft: 'auto', 
        fontSize: '12px', 
        color: 'var(--vscode-descriptionForeground)' 
      }}>
        {agentCount} agent{agentCount !== 1 ? 's' : ''}
      </span>
    </div>
  );
}
