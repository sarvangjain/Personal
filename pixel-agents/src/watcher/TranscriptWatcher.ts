import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { EventParser } from '../parser/EventParser';
import { ActivityDetector } from '../state/ActivityDetector';
import { AgentStateManager } from '../state/AgentStateManager';

interface SessionInfo {
  sessionId: string;
  transcriptPath: string;
  lastReadPosition: number;
  lastEventTime: number;
  lastSize: number;
}

export class TranscriptWatcher {
  private pollInterval: NodeJS.Timeout | null = null;
  private trackedSessions: Map<string, SessionInfo> = new Map();
  private eventParser: EventParser;
  private activityDetector: ActivityDetector;
  private stateManager: AgentStateManager;
  private transcriptsPath: string = '';
  private logger: (msg: string) => void;

  constructor(stateManager: AgentStateManager, logger?: (msg: string) => void) {
    this.stateManager = stateManager;
    this.eventParser = new EventParser();
    this.activityDetector = new ActivityDetector();
    this.logger = logger || console.log;
  }

  private log(message: string) {
    this.logger(`[TranscriptWatcher] ${message}`);
  }

  startWatching(workspacePath: string): void {
    this.transcriptsPath = this.getTranscriptsPath(workspacePath);
    
    this.log(`Starting to watch: ${this.transcriptsPath}`);
    
    if (!fs.existsSync(this.transcriptsPath)) {
      this.log(`Transcripts path does not exist: ${this.transcriptsPath}`);
      return;
    }

    // Stop any existing watcher
    this.stopWatching();

    this.log(`Path exists, starting manual polling...`);

    // Do initial scan with verbose logging
    this.scanForFiles(true);

    // Poll every 2 seconds for changes
    this.pollInterval = setInterval(() => {
      this.scanForFiles(false);
    }, 2000);
    
    this.log(`Polling started`);
  }

  private scanForFiles(verbose: boolean = false): void {
    try {
      const entries = fs.readdirSync(this.transcriptsPath, { withFileTypes: true });
      let foundFiles = 0;
      let recentFiles = 0;
      
      for (const entry of entries) {
        if (entry.isDirectory()) {
          const subDir = path.join(this.transcriptsPath, entry.name);
          try {
            const subEntries = fs.readdirSync(subDir);
            
            for (const subEntry of subEntries) {
              if (subEntry.endsWith('.jsonl')) {
                foundFiles++;
                const fullPath = path.join(subDir, subEntry);
                const wasRecent = this.checkFile(fullPath, verbose);
                if (wasRecent) recentFiles++;
              }
            }
          } catch (subErr) {
            // Subdirectory read error
          }
        }
      }
      
      if (verbose) {
        this.log(`Scan complete: ${foundFiles} total files, ${recentFiles} recent, ${this.trackedSessions.size} tracked`);
      }
    } catch (e) {
      this.log(`Scan error: ${e}`);
    }
  }

  private checkFile(filePath: string, verbose: boolean = false): boolean {
    try {
      const stats = fs.statSync(filePath);
      const sessionId = this.extractSessionId(filePath);
      
      if (!sessionId) {
        if (verbose) this.log(`Could not extract session ID from: ${filePath}`);
        return false;
      }

      const existingSession = this.trackedSessions.get(sessionId);
      
      if (!existingSession) {
        // New file - check if recent (last 10 minutes)
        const ageMs = Date.now() - stats.mtimeMs;
        const isRecent = ageMs < 600000;
        
        if (verbose) {
          this.log(`File: ${sessionId}, age: ${Math.round(ageMs/1000)}s, recent: ${isRecent}`);
        }
        
        if (isRecent) {
          this.log(`New session found: ${sessionId}`);
          this.trackedSessions.set(sessionId, {
            sessionId,
            transcriptPath: filePath,
            lastReadPosition: 0,
            lastEventTime: Date.now(),
            lastSize: stats.size
          });
          this.stateManager.registerAgent(sessionId, filePath);
          this.readNewContent(sessionId);
          return true;
        }
      } else if (stats.size !== existingSession.lastSize) {
        // File changed
        this.log(`Session updated: ${sessionId}`);
        existingSession.lastSize = stats.size;
        existingSession.lastEventTime = Date.now();
        this.readNewContent(sessionId);
        return true;
      }
      return false;
    } catch (e) {
      // File might have been deleted
    }
  }

  stopWatching(): void {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
    this.trackedSessions.clear();
  }

  private getTranscriptsPath(workspacePath: string): string {
    const workspaceHash = this.hashWorkspacePath(workspacePath);
    return path.join(
      os.homedir(),
      '.cursor',
      'projects',
      workspaceHash,
      'agent-transcripts'
    );
  }

  private hashWorkspacePath(workspacePath: string): string {
    // Cursor uses a specific format for workspace project folders
    // Format: Users-username-path-to-workspace
    // Both slashes and dots are replaced with dashes
    const normalized = workspacePath.replace(/[\/\.]/g, '-').replace(/^-/, '');
    return normalized;
  }

  private extractSessionId(filePath: string): string | null {
    // Extract UUID from file path like "uuid/uuid.jsonl"
    const parts = filePath.split(path.sep);
    
    // Look for UUID pattern
    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    
    for (const part of parts) {
      const baseName = path.basename(part, '.jsonl');
      if (uuidPattern.test(baseName)) {
        return baseName;
      }
    }
    
    return null;
  }

  private async readNewContent(sessionId: string): Promise<void> {
    const session = this.trackedSessions.get(sessionId);
    if (!session) {
      return;
    }

    try {
      const content = fs.readFileSync(session.transcriptPath, 'utf-8');
      const lines = content.split('\n').filter(line => line.trim());
      
      // Get new lines since last read
      const newLines = lines.slice(Math.floor(session.lastReadPosition));
      
      if (newLines.length === 0) {
        return;
      }

      // Parse new events
      const events = newLines
        .map(line => this.eventParser.parseJsonlLine(line))
        .filter(event => event !== null);

      // Update last read position
      session.lastReadPosition = lines.length;
      session.lastEventTime = Date.now();

      // Detect activity and update state
      if (events.length > 0) {
        const state = this.activityDetector.detectState(events);
        const lastEvent = events[events.length - 1];
        const task = this.activityDetector.extractCurrentTask(lastEvent);
        
        this.stateManager.updateAgentState(sessionId, state, task);
      }
    } catch (error) {
      console.error(`[TranscriptWatcher] Error reading transcript for ${sessionId}:`, error);
    }
  }

  getTrackedSessions(): string[] {
    return Array.from(this.trackedSessions.keys());
  }
}
