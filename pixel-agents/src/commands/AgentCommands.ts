import * as vscode from 'vscode';
import { AgentStateManager, AgentState } from '../state/AgentStateManager';
import { TerminalTracker } from '../integration/TerminalTracker';
import { AgentWebviewProvider } from '../webview/AgentWebviewProvider';

export function registerCommands(
  context: vscode.ExtensionContext,
  stateManager: AgentStateManager,
  terminalTracker: TerminalTracker,
  webviewProvider: AgentWebviewProvider
): void {
  
  // Show the agent visualizer panel
  context.subscriptions.push(
    vscode.commands.registerCommand('cursorAgents.showPanel', () => {
      vscode.commands.executeCommand('cursorAgents.mainView.focus');
    })
  );

  // Focus agent terminal
  context.subscriptions.push(
    vscode.commands.registerCommand('cursorAgents.focusTerminal', (agentId?: string) => {
      if (!agentId) {
        // If no agent ID provided, show a quick pick
        const agents = stateManager.getAllAgents();
        if (agents.length === 0) {
          vscode.window.showInformationMessage('No active agents found');
          return;
        }
        
        const items = agents.map(a => ({
          label: a.name,
          description: a.state,
          detail: a.currentTask,
          agentId: a.id
        }));
        
        vscode.window.showQuickPick(items, {
          placeHolder: 'Select an agent to focus'
        }).then(selected => {
          if (selected) {
            webviewProvider.focusAgentTerminal(selected.agentId);
          }
        });
        return;
      }
      
      webviewProvider.focusAgentTerminal(agentId);
    })
  );

  // Stop agent
  context.subscriptions.push(
    vscode.commands.registerCommand('cursorAgents.stopAgent', (agentId?: string) => {
      if (!agentId) {
        const agents = stateManager.getAllAgents().filter(a => a.state !== AgentState.IDLE);
        if (agents.length === 0) {
          vscode.window.showInformationMessage('No running agents found');
          return;
        }
        
        const items = agents.map(a => ({
          label: a.name,
          description: a.state,
          detail: a.currentTask,
          agentId: a.id
        }));
        
        vscode.window.showQuickPick(items, {
          placeHolder: 'Select an agent to stop'
        }).then(selected => {
          if (selected) {
            webviewProvider.stopAgent(selected.agentId);
          }
        });
        return;
      }
      
      webviewProvider.stopAgent(agentId);
    })
  );

  // Open agent logs
  context.subscriptions.push(
    vscode.commands.registerCommand('cursorAgents.openLogs', (agentId?: string) => {
      if (!agentId) {
        const agents = stateManager.getAllAgents();
        if (agents.length === 0) {
          vscode.window.showInformationMessage('No agents found');
          return;
        }
        
        const items = agents.map(a => ({
          label: a.name,
          description: a.state,
          detail: a.transcriptPath,
          agentId: a.id
        }));
        
        vscode.window.showQuickPick(items, {
          placeHolder: 'Select an agent to view logs'
        }).then(selected => {
          if (selected) {
            webviewProvider.openAgentLogs(selected.agentId);
          }
        });
        return;
      }
      
      webviewProvider.openAgentLogs(agentId);
    })
  );

  // Restart agent
  context.subscriptions.push(
    vscode.commands.registerCommand('cursorAgents.restartAgent', (agentId?: string) => {
      if (!agentId) {
        const agents = stateManager.getAllAgents();
        if (agents.length === 0) {
          vscode.window.showInformationMessage('No agents found');
          return;
        }
        
        const items = agents.map(a => ({
          label: a.name,
          description: a.state,
          detail: a.currentTask,
          agentId: a.id
        }));
        
        vscode.window.showQuickPick(items, {
          placeHolder: 'Select an agent to restart'
        }).then(selected => {
          if (selected) {
            webviewProvider.restartAgent(selected.agentId);
          }
        });
        return;
      }
      
      webviewProvider.restartAgent(agentId);
    })
  );

  // Refresh agents list
  context.subscriptions.push(
    vscode.commands.registerCommand('cursorAgents.refresh', () => {
      webviewProvider.sendAgentsList();
    })
  );
}
