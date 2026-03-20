import * as vscode from 'vscode';
import { AgentStateManager } from '../state/AgentStateManager';

interface TerminalAgentMapping {
  terminal: vscode.Terminal;
  agentId: string;
  lastOutput: string;
}

export class TerminalTracker {
  private terminalMappings: Map<vscode.Terminal, TerminalAgentMapping> = new Map();
  private stateManager: AgentStateManager;
  private disposables: vscode.Disposable[] = [];

  constructor(stateManager: AgentStateManager) {
    this.stateManager = stateManager;
    this.initialize();
  }

  private initialize(): void {
    // Listen for terminal creation
    this.disposables.push(
      vscode.window.onDidOpenTerminal(terminal => {
        this.handleTerminalOpen(terminal);
      })
    );

    // Listen for terminal closure
    this.disposables.push(
      vscode.window.onDidCloseTerminal(terminal => {
        this.handleTerminalClose(terminal);
      })
    );

    // Listen for active terminal change
    this.disposables.push(
      vscode.window.onDidChangeActiveTerminal(terminal => {
        if (terminal) {
          this.tryAssociateWithAgent(terminal);
        }
      })
    );

    // Register existing terminals
    vscode.window.terminals.forEach(terminal => {
      this.handleTerminalOpen(terminal);
    });
  }

  private handleTerminalOpen(terminal: vscode.Terminal): void {
    console.log(`[TerminalTracker] Terminal opened: ${terminal.name}`);
    
    // Try to detect if this is an agent terminal
    this.tryAssociateWithAgent(terminal);
  }

  private handleTerminalClose(terminal: vscode.Terminal): void {
    const mapping = this.terminalMappings.get(terminal);
    if (mapping) {
      console.log(`[TerminalTracker] Agent terminal closed: ${mapping.agentId}`);
      this.terminalMappings.delete(terminal);
    }
  }

  private tryAssociateWithAgent(terminal: vscode.Terminal): void {
    // Check if terminal name suggests it's an agent terminal
    const terminalName = terminal.name.toLowerCase();
    
    // Cursor agents often have specific naming patterns
    const isAgentTerminal = 
      terminalName.includes('agent') ||
      terminalName.includes('cursor') ||
      terminalName.includes('task') ||
      terminalName.includes('claude');

    if (isAgentTerminal) {
      // Try to find an agent without a terminal association
      const agents = this.stateManager.getAllAgents();
      const unassociatedAgent = agents.find(agent => 
        !Array.from(this.terminalMappings.values()).some(m => m.agentId === agent.id)
      );

      if (unassociatedAgent) {
        this.associateTerminalWithAgent(terminal, unassociatedAgent.id);
      }
    }
  }

  public associateTerminalWithAgent(terminal: vscode.Terminal, agentId: string): void {
    // Remove any existing mapping for this terminal
    this.terminalMappings.delete(terminal);

    // Create new mapping
    this.terminalMappings.set(terminal, {
      terminal,
      agentId,
      lastOutput: ''
    });

    console.log(`[TerminalTracker] Associated terminal "${terminal.name}" with agent ${agentId}`);
  }

  public findTerminalByAgentId(agentId: string): vscode.Terminal | undefined {
    for (const [terminal, mapping] of this.terminalMappings) {
      if (mapping.agentId === agentId) {
        return terminal;
      }
    }

    // Fallback: try to find by terminal name
    return vscode.window.terminals.find(t => {
      const name = t.name.toLowerCase();
      return name.includes(agentId.substring(0, 8)) || 
             name.includes('agent') ||
             name.includes('cursor');
    });
  }

  public getAgentIdByTerminal(terminal: vscode.Terminal): string | undefined {
    return this.terminalMappings.get(terminal)?.agentId;
  }

  public getAllMappings(): Map<vscode.Terminal, string> {
    const result = new Map<vscode.Terminal, string>();
    for (const [terminal, mapping] of this.terminalMappings) {
      result.set(terminal, mapping.agentId);
    }
    return result;
  }

  public dispose(): void {
    this.disposables.forEach(d => d.dispose());
    this.terminalMappings.clear();
  }
}
