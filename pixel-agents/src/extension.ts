import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { TranscriptWatcher } from './watcher/TranscriptWatcher';
import { AgentStateManager } from './state/AgentStateManager';
import { AgentWebviewProvider } from './webview/AgentWebviewProvider';
import { registerCommands } from './commands/AgentCommands';
import { TerminalTracker } from './integration/TerminalTracker';

let transcriptWatcher: TranscriptWatcher | null = null;
let stateManager: AgentStateManager | null = null;
let terminalTracker: TerminalTracker | null = null;
let currentWorkspacePath: string = '';
let outputChannel: vscode.OutputChannel;

function log(message: string) {
  const timestamp = new Date().toISOString();
  outputChannel.appendLine(`[${timestamp}] ${message}`);
  console.log(message);
}

export function activate(context: vscode.ExtensionContext) {
  outputChannel = vscode.window.createOutputChannel('Cursor Agent Visualizer');
  outputChannel.show();
  log('Cursor Agent Visualizer is now active!');

  // Initialize state manager
  stateManager = new AgentStateManager();

  // Initialize terminal tracker
  terminalTracker = new TerminalTracker(stateManager);

  // Initialize transcript watcher
  transcriptWatcher = new TranscriptWatcher(stateManager, log);
  
  // Get workspace folder path
  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (workspaceFolders && workspaceFolders.length > 0) {
    currentWorkspacePath = workspaceFolders[0].uri.fsPath;
    log(`Workspace path: ${currentWorkspacePath}`);
    transcriptWatcher.startWatching(currentWorkspacePath);
  } else {
    log('No workspace folders found!');
  }

  // Register debug command
  context.subscriptions.push(
    vscode.commands.registerCommand('cursorAgents.debug', () => {
      const workspaceHash = currentWorkspacePath.replace(/[\/\.]/g, '-').replace(/^-/, '');
      const transcriptsPath = path.join(os.homedir(), '.cursor', 'projects', workspaceHash, 'agent-transcripts');
      
      const agents = stateManager?.getAllAgents() || [];
      const trackedSessions = transcriptWatcher?.getTrackedSessions() || [];
      
      let pathExists = false;
      let fileCount = 0;
      let recentFiles: string[] = [];
      let errorMsg = '';
      const homeDir = os.homedir();
      
      try {
        pathExists = fs.existsSync(transcriptsPath);
        if (pathExists) {
          const entries = fs.readdirSync(transcriptsPath, { withFileTypes: true });
          fileCount = entries.length;
          
          // Find recent JSONL files
          for (const entry of entries) {
            if (entry.isDirectory()) {
              const subPath = path.join(transcriptsPath, entry.name);
              const subEntries = fs.readdirSync(subPath);
              for (const subEntry of subEntries) {
                if (subEntry.endsWith('.jsonl')) {
                  const fullPath = path.join(subPath, subEntry);
                  const stats = fs.statSync(fullPath);
                  const age = Date.now() - stats.mtimeMs;
                  if (age < 600000) { // Last 10 minutes
                    recentFiles.push(`${subEntry} (${Math.round(age/1000)}s ago)`);
                  }
                }
              }
            }
          }
        }
      } catch (e: any) {
        errorMsg = e.message || String(e);
        console.error('Debug error:', e);
      }
      
      const info = `
=== Cursor Agent Visualizer Debug ===
Workspace: ${currentWorkspacePath}
Hash: ${workspaceHash}
Transcripts Path: ${transcriptsPath}
Path Exists: ${pathExists}
Entries in folder: ${fileCount}
Recent JSONL files: ${recentFiles.length > 0 ? recentFiles.join(', ') : 'None'}
Tracked Sessions: ${trackedSessions.length} - ${trackedSessions.join(', ') || 'None'}
Registered Agents: ${agents.length} - ${agents.map(a => a.name).join(', ') || 'None'}
`;
      
      vscode.window.showInformationMessage('Debug info logged to console');
      console.log(info);
      
      // Also show in a quick pick for easy viewing
      const items = [
        `Workspace: ${currentWorkspacePath}`,
        `Home Dir: ${homeDir}`,
        `Hash: ${workspaceHash}`,
        `Transcripts Path: ${transcriptsPath}`,
        `Path Exists: ${pathExists}`,
        `Error: ${errorMsg || 'None'}`,
        `Recent Files: ${recentFiles.length}`,
        `Tracked Sessions: ${trackedSessions.length}`,
        `Registered Agents: ${agents.length}`
      ];
      vscode.window.showQuickPick(items, { title: 'Debug Info' });
    })
  );

  // Register webview provider
  const webviewProvider = new AgentWebviewProvider(context.extensionUri, stateManager, terminalTracker);
  
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      'cursorAgents.mainView',
      webviewProvider,
      {
        webviewOptions: {
          retainContextWhenHidden: true
        }
      }
    )
  );

  // Register commands
  registerCommands(context, stateManager, terminalTracker, webviewProvider);

  // Listen for workspace folder changes
  context.subscriptions.push(
    vscode.workspace.onDidChangeWorkspaceFolders((e) => {
      if (e.added.length > 0 && transcriptWatcher) {
        transcriptWatcher.startWatching(e.added[0].uri.fsPath);
      }
    })
  );

  // Cleanup on deactivation
  context.subscriptions.push({
    dispose: () => {
      if (transcriptWatcher) {
        transcriptWatcher.stopWatching();
      }
    }
  });
}

export function deactivate() {
  if (transcriptWatcher) {
    transcriptWatcher.stopWatching();
    transcriptWatcher = null;
  }
  stateManager = null;
  terminalTracker = null;
}
