import { ParsedEvent } from '../parser/EventParser';

export enum AgentState {
  IDLE = 'idle',
  READING = 'reading',
  WRITING = 'writing',
  EXECUTING = 'executing',
  THINKING = 'thinking',
  WAITING = 'waiting',
  ERROR = 'error'
}

export class ActivityDetector {
  private lastEventTimes: Map<string, number> = new Map();

  detectState(events: ParsedEvent[]): AgentState {
    if (events.length === 0) {
      return AgentState.IDLE;
    }

    const recentEvents = events.slice(-5); // Look at last 5 events
    const lastEvent = events[events.length - 1];

    // Check for tool usage patterns
    if (this.hasRecentToolCall(recentEvents, ['Read', 'Grep', 'Glob', 'SemanticSearch'])) {
      return AgentState.READING;
    }

    if (this.hasRecentToolCall(recentEvents, ['Write', 'StrReplace', 'EditNotebook'])) {
      return AgentState.WRITING;
    }

    if (this.hasRecentToolCall(recentEvents, ['Shell'])) {
      return AgentState.EXECUTING;
    }

    if (this.hasRecentToolCall(recentEvents, ['AskQuestion'])) {
      return AgentState.WAITING;
    }

    // Check for thinking markers
    if (lastEvent?.type === 'thinking' || lastEvent?.content?.includes('[Thinking]')) {
      return AgentState.THINKING;
    }

    // Check for user waiting patterns
    if (this.isWaitingForUser(lastEvent)) {
      return AgentState.WAITING;
    }

    // Check for error patterns
    if (this.hasErrorPattern(lastEvent)) {
      return AgentState.ERROR;
    }

    // Default based on recent activity
    return AgentState.IDLE;
  }

  private hasRecentToolCall(events: ParsedEvent[], toolNames: string[]): boolean {
    for (const event of events) {
      if (event.toolCalls) {
        for (const toolCall of event.toolCalls) {
          if (toolNames.includes(toolCall.name)) {
            return true;
          }
        }
      }
      
      // Also check content for tool mentions
      const content = event.content?.toLowerCase() || '';
      for (const toolName of toolNames) {
        const toolLower = toolName.toLowerCase();
        if (content.includes(`[tool call] ${toolLower}`) || 
            content.includes(`<invoke name="${toolName}"`) ||
            content.includes(`using ${toolLower}`)) {
          return true;
        }
      }
    }
    return false;
  }

  private isWaitingForUser(event: ParsedEvent | null): boolean {
    if (!event) return false;
    
    const content = event.content?.toLowerCase() || '';
    const waitingPatterns = [
      'what would you like',
      'would you like me to',
      'please confirm',
      'waiting for',
      'let me know',
      'do you want me to',
      'should i proceed',
      'please provide',
      'can you specify',
    ];

    return waitingPatterns.some(pattern => content.includes(pattern));
  }

  private hasErrorPattern(event: ParsedEvent | null): boolean {
    if (!event) return false;
    
    const content = event.content?.toLowerCase() || '';
    const errorPatterns = [
      'error:',
      'failed to',
      'could not',
      'exception',
      'permission denied',
      'not found',
      'invalid',
    ];

    return errorPatterns.some(pattern => content.includes(pattern));
  }

  extractCurrentTask(event: ParsedEvent | null): string {
    if (!event) return 'Idle';

    // Check for tool calls
    if (event.toolCalls && event.toolCalls.length > 0) {
      const lastTool = event.toolCalls[event.toolCalls.length - 1];
      return this.formatToolTask(lastTool.name, lastTool.parameters);
    }

    // Extract from content
    const content = event.content || '';
    
    // Check for common action patterns
    const actionPatterns = [
      { pattern: /let me (read|check|look at|examine) (.+?)(?:\.|$)/i, action: 'Reading' },
      { pattern: /let me (create|write|add) (.+?)(?:\.|$)/i, action: 'Creating' },
      { pattern: /let me (update|edit|modify|fix) (.+?)(?:\.|$)/i, action: 'Editing' },
      { pattern: /let me (run|execute) (.+?)(?:\.|$)/i, action: 'Running' },
      { pattern: /let me (search|find|look for) (.+?)(?:\.|$)/i, action: 'Searching' },
      { pattern: /\[tool call\]\s*(\w+)/i, action: 'Using' },
    ];

    for (const { pattern, action } of actionPatterns) {
      const match = content.match(pattern);
      if (match) {
        return `${action} ${match[2] || match[1]}`.substring(0, 50);
      }
    }

    // Truncate content as fallback
    const firstLine = content.split('\n')[0] || '';
    if (firstLine.length > 50) {
      return firstLine.substring(0, 47) + '...';
    }
    return firstLine || 'Processing...';
  }

  private formatToolTask(toolName: string, params: Record<string, unknown>): string {
    switch (toolName) {
      case 'Read':
        return `Reading ${this.shortenPath(params.path as string)}`;
      case 'Write':
        return `Writing ${this.shortenPath(params.path as string)}`;
      case 'StrReplace':
        return `Editing ${this.shortenPath(params.path as string)}`;
      case 'Shell':
        return `Running: ${(params.command as string)?.substring(0, 30) || 'command'}`;
      case 'Grep':
        return `Searching: ${(params.pattern as string)?.substring(0, 20) || 'pattern'}`;
      case 'Glob':
        return `Finding files: ${(params.glob_pattern as string)?.substring(0, 20) || 'pattern'}`;
      case 'AskQuestion':
        return 'Waiting for input';
      case 'Task':
        return `Launching subagent`;
      default:
        return `Using ${toolName}`;
    }
  }

  private shortenPath(filePath: string | undefined): string {
    if (!filePath) return 'file';
    
    const parts = filePath.split('/');
    const fileName = parts[parts.length - 1];
    
    if (fileName.length > 30) {
      return fileName.substring(0, 27) + '...';
    }
    return fileName;
  }

  updateLastEventTime(sessionId: string): void {
    this.lastEventTimes.set(sessionId, Date.now());
  }

  getTimeSinceLastEvent(sessionId: string): number {
    const lastTime = this.lastEventTimes.get(sessionId);
    if (!lastTime) return Infinity;
    return Date.now() - lastTime;
  }
}
