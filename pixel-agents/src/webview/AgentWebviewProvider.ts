import * as vscode from 'vscode';
import { AgentStateManager, AgentInfo, AgentState } from '../state/AgentStateManager';
import { TerminalTracker } from '../integration/TerminalTracker';

type ExtensionMessage =
  | { type: 'agent:new'; data: AgentInfo }
  | { type: 'agent:update'; data: AgentInfo }
  | { type: 'agent:remove'; data: { id: string } }
  | { type: 'agents:list'; data: AgentInfo[] };

type WebviewMessage =
  | { type: 'command:focus'; data: { agentId: string } }
  | { type: 'command:stop'; data: { agentId: string } }
  | { type: 'command:logs'; data: { agentId: string } }
  | { type: 'command:restart'; data: { agentId: string } }
  | { type: 'request:agents' };

export class AgentWebviewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'cursorAgents.mainView';
  
  private webviewView?: vscode.WebviewView;
  
  constructor(
    private readonly extensionUri: vscode.Uri,
    private readonly stateManager: AgentStateManager,
    private readonly terminalTracker: TerminalTracker
  ) {
    // Listen for state manager events
    this.stateManager.on('agent:new', (agent: AgentInfo) => {
      this.sendMessage({ type: 'agent:new', data: agent });
    });
    
    this.stateManager.on('agent:update', (agent: AgentInfo) => {
      this.sendMessage({ type: 'agent:update', data: agent });
    });
    
    this.stateManager.on('agent:remove', (data: { id: string }) => {
      this.sendMessage({ type: 'agent:remove', data });
    });
  }

  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    _context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ): void {
    this.webviewView = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [
        vscode.Uri.joinPath(this.extensionUri, 'webview-ui', 'dist'),
        vscode.Uri.joinPath(this.extensionUri, 'webview-ui', 'public')
      ]
    };

    webviewView.webview.html = this.getHtmlForWebview(webviewView.webview);

    // Handle messages from the webview
    webviewView.webview.onDidReceiveMessage((message: WebviewMessage) => {
      this.handleWebviewMessage(message);
    });

    // Send initial agent list when webview becomes visible
    webviewView.onDidChangeVisibility(() => {
      if (webviewView.visible) {
        this.sendAgentsList();
      }
    });
  }

  private handleWebviewMessage(message: WebviewMessage): void {
    switch (message.type) {
      case 'request:agents':
        this.sendAgentsList();
        break;
        
      case 'command:focus':
        this.focusAgentTerminal(message.data.agentId);
        break;
        
      case 'command:stop':
        this.stopAgent(message.data.agentId);
        break;
        
      case 'command:logs':
        this.openAgentLogs(message.data.agentId);
        break;
        
      case 'command:restart':
        this.restartAgent(message.data.agentId);
        break;
    }
  }

  private sendMessage(message: ExtensionMessage): void {
    console.log(`[WebviewProvider] Sending message: ${message.type}`);
    if (this.webviewView) {
      this.webviewView.webview.postMessage(message);
    } else {
      console.log('[WebviewProvider] No webview to send message to');
    }
  }

  public sendAgentsList(): void {
    const agents = this.stateManager.getAllAgents();
    console.log(`[WebviewProvider] Sending agents list, count: ${agents.length}`);
    this.sendMessage({ type: 'agents:list', data: agents });
  }

  public focusAgentTerminal(agentId: string): void {
    const terminal = this.terminalTracker.findTerminalByAgentId(agentId);
    if (terminal) {
      terminal.show();
    } else {
      vscode.window.showWarningMessage(`Could not find terminal for agent ${agentId}`);
    }
  }

  public stopAgent(agentId: string): void {
    const terminal = this.terminalTracker.findTerminalByAgentId(agentId);
    if (terminal) {
      // Send Ctrl+C to stop the agent
      terminal.sendText('\x03');
      vscode.window.showInformationMessage(`Sent stop signal to agent`);
    } else {
      // If no terminal, just update the state
      this.stateManager.updateAgentState(agentId, AgentState.IDLE, 'Stopped');
    }
  }

  public openAgentLogs(agentId: string): void {
    const agent = this.stateManager.getAgent(agentId);
    if (agent?.transcriptPath) {
      vscode.workspace.openTextDocument(agent.transcriptPath)
        .then(doc => vscode.window.showTextDocument(doc, { preview: true }));
    } else {
      vscode.window.showWarningMessage(`Could not find logs for agent ${agentId}`);
    }
  }

  public restartAgent(agentId: string): void {
    const terminal = this.terminalTracker.findTerminalByAgentId(agentId);
    if (terminal) {
      // Kill and recreate terminal
      terminal.dispose();
      vscode.window.showInformationMessage(`Agent terminal closed. Start a new agent manually.`);
    }
    this.stateManager.removeAgent(agentId);
  }

  private getHtmlForWebview(webview: vscode.Webview): string {
    const distPath = vscode.Uri.joinPath(this.extensionUri, 'webview-ui', 'dist');
    
    // Try to use built assets, fall back to inline for development
    try {
      const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(distPath, 'assets', 'main.js'));
      const styleUri = webview.asWebviewUri(vscode.Uri.joinPath(distPath, 'assets', 'main.css'));

      return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src ${webview.cspSource}; img-src ${webview.cspSource} data:;">
  <link rel="stylesheet" href="${styleUri}">
  <title>Cursor Agent Visualizer</title>
</head>
<body>
  <div id="root"></div>
  <script type="module" src="${scriptUri}"></script>
</body>
</html>`;
    } catch {
      // Fallback to inline HTML for development
      return this.getDevHtml();
    }
  }

  private getDevHtml(): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Cursor Agent Visualizer</title>
  <style>
    :root {
      --vscode-font-family: var(--vscode-editor-font-family, 'Segoe UI', sans-serif);
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: var(--vscode-font-family);
      color: var(--vscode-foreground);
      background: var(--vscode-editor-background);
      padding: 16px;
    }
    .no-agents {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 200px;
      color: var(--vscode-descriptionForeground);
      text-align: center;
    }
    .no-agents .icon { font-size: 48px; margin-bottom: 16px; opacity: 0.5; }
    .agent-card {
      padding: 12px;
      margin-bottom: 8px;
      background: var(--vscode-sideBar-background);
      border: 1px solid var(--vscode-panel-border);
      border-radius: 6px;
    }
    .agent-header {
      display: flex;
      justify-content: space-between;
      margin-bottom: 8px;
    }
    .agent-name { font-weight: 600; }
    .state-badge {
      padding: 2px 8px;
      border-radius: 12px;
      font-size: 11px;
      text-transform: uppercase;
    }
    .state-idle { background: #666; color: white; }
    .state-reading { background: #0078d4; color: white; }
    .state-writing { background: #16825d; color: white; }
    .state-executing { background: #e8912d; color: white; }
    .state-thinking { background: #8764b8; color: white; }
    .state-waiting { background: #f9d71c; color: black; }
    .agent-task { font-size: 12px; color: var(--vscode-descriptionForeground); margin-bottom: 8px; }
    .agent-actions { display: flex; gap: 8px; }
    .agent-actions button {
      flex: 1;
      padding: 4px 8px;
      border: none;
      border-radius: 4px;
      background: var(--vscode-button-secondaryBackground);
      color: var(--vscode-button-secondaryForeground);
      cursor: pointer;
      font-size: 11px;
    }
    .agent-actions button:hover { background: var(--vscode-button-secondaryHoverBackground); }
  </style>
</head>
<body>
  <div id="root">
    <div class="no-agents">
      <div class="icon">🤖</div>
      <h3>No Agents Detected</h3>
      <p style="font-size: 12px; margin-top: 8px;">Start a Cursor agent to see it appear here</p>
    </div>
  </div>
  <script>
    const vscode = acquireVsCodeApi();
    let agents = [];
    
    function render() {
      const root = document.getElementById('root');
      if (agents.length === 0) {
        root.innerHTML = '<div class="no-agents"><div class="icon">🤖</div><h3>No Agents Detected</h3><p style="font-size: 12px; margin-top: 8px;">Start a Cursor agent to see it appear here</p></div>';
        return;
      }
      
      root.innerHTML = agents.map(agent => \`
        <div class="agent-card">
          <div class="agent-header">
            <span class="agent-name">\${agent.name}</span>
            <span class="state-badge state-\${agent.state}">\${agent.state}</span>
          </div>
          <div class="agent-task">\${agent.currentTask}</div>
          <div class="agent-actions">
            <button onclick="focusAgent('\${agent.id}')">Focus</button>
            <button onclick="stopAgent('\${agent.id}')">Stop</button>
            <button onclick="openLogs('\${agent.id}')">Logs</button>
          </div>
        </div>
      \`).join('');
    }
    
    window.focusAgent = (id) => vscode.postMessage({ type: 'command:focus', data: { agentId: id } });
    window.stopAgent = (id) => vscode.postMessage({ type: 'command:stop', data: { agentId: id } });
    window.openLogs = (id) => vscode.postMessage({ type: 'command:logs', data: { agentId: id } });
    
    window.addEventListener('message', event => {
      const msg = event.data;
      switch (msg.type) {
        case 'agents:list': agents = msg.data; break;
        case 'agent:new': if (!agents.find(a => a.id === msg.data.id)) agents.push(msg.data); break;
        case 'agent:update': agents = agents.map(a => a.id === msg.data.id ? msg.data : a); break;
        case 'agent:remove': agents = agents.filter(a => a.id !== msg.data.id); break;
      }
      render();
    });
    
    vscode.postMessage({ type: 'request:agents' });
  </script>
</body>
</html>`;
  }
}
