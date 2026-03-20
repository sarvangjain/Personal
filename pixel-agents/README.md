# Cursor Agent Visualizer

A VS Code/Cursor extension that visualizes active Cursor agents with pixel art characters in a virtual office environment.

## Features

- **Agent Detection**: Automatically detects Cursor agents by monitoring transcript files
- **Real-time Updates**: Characters animate based on agent activity (reading, writing, executing)
- **Canvas View**: Pixel art office with animated characters at desks
- **List View**: Detailed card view with agent status and controls
- **Agent Controls**: Focus terminal, stop agent, view logs, restart

## Installation

### From Source

1. Clone the repository:
```bash
git clone <repository-url>
cd pixel-agents
```

2. Install dependencies:
```bash
npm install
cd webview-ui && npm install && cd ..
```

3. Build the extension:
```bash
npm run compile
```

4. Press **F5** in VS Code/Cursor to launch the Extension Development Host

### From VSIX

```bash
npm run package
code --install-extension cursor-agent-visualizer-0.1.0.vsix
```

## Usage

1. Open the **Cursor Agents** panel (appears in the bottom panel area alongside terminal)
2. Start using Cursor agents - they will automatically appear in the visualizer
3. Click on a character to focus its terminal
4. Double-click to stop an agent
5. Use the control panel to switch between Canvas and List views

## Architecture

```
pixel-agents/
├── src/                      # Extension source (TypeScript)
│   ├── extension.ts          # Main extension entry point
│   ├── watcher/              # Transcript file monitoring
│   ├── parser/               # JSONL event parsing
│   ├── state/                # Agent state management
│   ├── commands/             # VS Code commands
│   ├── integration/          # Terminal tracking
│   └── webview/              # Webview provider
├── webview-ui/               # React webview (Vite)
│   ├── src/
│   │   ├── App.tsx           # Main React app
│   │   ├── components/       # UI components
│   │   ├── rendering/        # Canvas renderer
│   │   └── types/            # TypeScript types
│   └── public/assets/        # Sprite assets
└── out/                      # Compiled output
```

## How It Works

1. **TranscriptWatcher** monitors `~/.cursor/projects/{workspace}/agent-transcripts/` for JSONL files
2. **EventParser** extracts tool calls and messages from transcript events
3. **ActivityDetector** infers agent state (reading, writing, executing, etc.) from patterns
4. **AgentStateManager** maintains the state of all detected agents
5. **WebviewBridge** communicates state changes to the React webview
6. **CanvasRenderer** draws animated pixel characters based on agent states

## Agent States

| State | Animation | Description |
|-------|-----------|-------------|
| Idle | 💤 | No recent activity |
| Reading | 📖 | Using Read, Grep, Glob tools |
| Writing | ✍️ | Using Write, StrReplace tools |
| Executing | ⚡ | Running Shell commands |
| Thinking | 💭 | Processing/reasoning |
| Waiting | ❓ | Waiting for user input |
| Error | ❌ | Error occurred |

## Commands

- `Cursor Agents: Show Panel` - Open the visualizer panel
- `Cursor Agents: Focus Terminal` - Focus an agent's terminal
- `Cursor Agents: Stop Agent` - Stop a running agent
- `Cursor Agents: Open Logs` - Open agent transcript file
- `Cursor Agents: Restart Agent` - Restart an agent

## Known Limitations

1. **Terminal-Agent Sync**: The mapping between terminals and agents is heuristic-based
2. **State Detection**: No explicit state signals in transcripts - uses pattern matching
3. **Timestamps**: JSONL events don't include timestamps, timing is estimated
4. **macOS Only**: Currently tested only on macOS

## Development

### Watch Mode
```bash
npm run watch
```

### Build
```bash
npm run compile
```

### Package
```bash
npm run package
```

## License

MIT
