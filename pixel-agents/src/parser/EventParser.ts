export interface ParsedEvent {
  role: 'user' | 'assistant';
  content: string;
  toolCalls?: ToolCall[];
  timestamp?: number;
  type?: 'text' | 'thinking' | 'tool_call' | 'tool_result';
}

export interface ToolCall {
  name: string;
  parameters: Record<string, unknown>;
  result?: unknown;
}

interface MessageContent {
  type: string;
  text?: string;
}

interface RawEvent {
  role: 'user' | 'assistant';
  message: {
    content: MessageContent[];
  };
}

export class EventParser {
  
  parseJsonlLine(line: string): ParsedEvent | null {
    try {
      const event = JSON.parse(line) as RawEvent;
      return {
        role: event.role,
        content: this.extractContent(event.message),
        toolCalls: this.extractToolCalls(event.message),
        type: this.detectEventType(event)
      };
    } catch {
      return null;
    }
  }

  private extractContent(message: RawEvent['message']): string {
    if (!message || !message.content) {
      return '';
    }

    return message.content
      .filter((item: MessageContent) => item.type === 'text' && item.text)
      .map((item: MessageContent) => item.text)
      .join('\n');
  }

  private extractToolCalls(message: RawEvent['message']): ToolCall[] {
    const content = this.extractContent(message);
    const toolCalls: ToolCall[] = [];

    // Detect tool usage patterns in content
    const toolPatterns = [
      { pattern: /\[Tool call\]\s*(\w+)/gi, type: 'call' },
      { pattern: /<invoke name="(\w+)">/gi, type: 'invoke' },
    ];

    for (const { pattern } of toolPatterns) {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        toolCalls.push({
          name: match[1],
          parameters: this.extractToolParameters(content, match.index)
        });
      }
    }

    // Also detect tool mentions in natural language
    const toolMentions = this.detectToolMentions(content);
    for (const tool of toolMentions) {
      if (!toolCalls.find(tc => tc.name === tool)) {
        toolCalls.push({ name: tool, parameters: {} });
      }
    }

    return toolCalls;
  }

  private extractToolParameters(content: string, startIndex: number): Record<string, unknown> {
    const params: Record<string, unknown> = {};
    
    // Try to extract parameters from XML-style invocation
    const paramRegex = /<parameter name="(\w+)">([^<]*)<\/antml:parameter>/g;
    const contextWindow = content.substring(startIndex, startIndex + 2000);
    
    let match;
    while ((match = paramRegex.exec(contextWindow)) !== null) {
      params[match[1]] = match[2];
    }

    return params;
  }

  private detectToolMentions(content: string): string[] {
    const tools: string[] = [];
    const lowerContent = content.toLowerCase();

    // Common tool patterns
    const toolKeywords: { [key: string]: string[] } = {
      'Read': ['let me read', 'reading the file', 'read the file', 'check the file'],
      'Write': ['let me create', 'let me write', 'creating the file', 'writing to'],
      'StrReplace': ['let me update', 'let me edit', 'editing the file', 'replacing'],
      'Shell': ['let me run', 'running command', 'executing', 'let me execute'],
      'Grep': ['searching for', 'let me search', 'looking for'],
      'Glob': ['finding files', 'looking for files'],
      'AskQuestion': ['asking you', 'clarification', 'let me ask'],
      'Task': ['subagent', 'launching agent', 'task tool'],
    };

    for (const [tool, keywords] of Object.entries(toolKeywords)) {
      if (keywords.some(kw => lowerContent.includes(kw))) {
        tools.push(tool);
      }
    }

    return tools;
  }

  private detectEventType(event: RawEvent): ParsedEvent['type'] {
    const content = this.extractContent(event.message);
    
    if (content.includes('[Thinking]')) {
      return 'thinking';
    }
    if (content.includes('[Tool call]') || content.includes('<invoke')) {
      return 'tool_call';
    }
    if (content.includes('[Tool result]')) {
      return 'tool_result';
    }
    
    return 'text';
  }

  parseTxtFormat(content: string): ParsedEvent[] {
    const events: ParsedEvent[] = [];
    const lines = content.split('\n');
    
    let currentRole: 'user' | 'assistant' = 'user';
    let currentContent: string[] = [];
    
    for (const line of lines) {
      if (line.startsWith('user:') || line.startsWith('U:')) {
        if (currentContent.length > 0) {
          events.push({
            role: currentRole,
            content: currentContent.join('\n'),
            type: this.detectTypeFromContent(currentContent.join('\n'))
          });
          currentContent = [];
        }
        currentRole = 'user';
      } else if (line.startsWith('A:') || line.startsWith('assistant:')) {
        if (currentContent.length > 0) {
          events.push({
            role: currentRole,
            content: currentContent.join('\n'),
            type: this.detectTypeFromContent(currentContent.join('\n'))
          });
          currentContent = [];
        }
        currentRole = 'assistant';
      } else {
        currentContent.push(line);
      }
    }

    // Add final segment
    if (currentContent.length > 0) {
      events.push({
        role: currentRole,
        content: currentContent.join('\n'),
        type: this.detectTypeFromContent(currentContent.join('\n'))
      });
    }

    return events;
  }

  private detectTypeFromContent(content: string): ParsedEvent['type'] {
    if (content.includes('[Thinking]')) return 'thinking';
    if (content.includes('[Tool call]')) return 'tool_call';
    if (content.includes('[Tool result]')) return 'tool_result';
    return 'text';
  }

  extractLatestTool(events: ParsedEvent[]): string | null {
    for (let i = events.length - 1; i >= 0; i--) {
      const event = events[i];
      if (event.toolCalls && event.toolCalls.length > 0) {
        return event.toolCalls[event.toolCalls.length - 1].name;
      }
    }
    return null;
  }
}
