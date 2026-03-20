import { useRef, useEffect, useCallback } from 'react';
import { AgentInfo, AgentState } from '../types';
import { CanvasRenderer } from '../rendering/CanvasRenderer';

interface AgentCanvasProps {
  agents: AgentInfo[];
  onFocusAgent: (agentId: string) => void;
  onStopAgent: (agentId: string) => void;
}

export function AgentCanvas({ agents, onFocusAgent, onStopAgent }: AgentCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<CanvasRenderer | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Initialize renderer
  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return;

    const canvas = canvasRef.current;
    const container = containerRef.current;
    
    // Set canvas size
    const resize = () => {
      const rect = container.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;
      
      if (rendererRef.current) {
        rendererRef.current.resize(rect.width, rect.height);
      }
    };
    
    resize();
    
    // Create renderer
    rendererRef.current = new CanvasRenderer(canvas);

    // Handle resize
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
      if (rendererRef.current) {
        rendererRef.current.destroy();
        rendererRef.current = null;
      }
    };
  }, []);

  // Update agents
  useEffect(() => {
    if (!rendererRef.current) return;
    rendererRef.current.setAgents(agents);
  }, [agents]);

  // Handle click
  const handleClick = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!rendererRef.current || !canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    const clickedAgent = rendererRef.current.getAgentAtPosition(x, y);
    if (clickedAgent) {
      onFocusAgent(clickedAgent.id);
    }
  }, [onFocusAgent]);

  // Handle double click to stop
  const handleDoubleClick = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!rendererRef.current || !canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    const clickedAgent = rendererRef.current.getAgentAtPosition(x, y);
    if (clickedAgent && clickedAgent.state !== AgentState.IDLE) {
      onStopAgent(clickedAgent.id);
    }
  }, [onStopAgent]);

  if (agents.length === 0) {
    return (
      <div className="no-agents">
        <div className="icon">🖼️</div>
        <h3>Empty Office</h3>
        <p>Start a Cursor agent to see pixel characters appear in the office space.</p>
      </div>
    );
  }

  return (
    <div className="canvas-container" ref={containerRef}>
      <canvas 
        ref={canvasRef} 
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
        style={{ cursor: 'pointer' }}
      />
    </div>
  );
}
