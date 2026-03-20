import { AgentInfo, AgentState } from '../types';

// Constants inspired by pixel-agents
const TILE_SIZE = 16;

// Character states for animation
enum CharacterState {
  IDLE = 'idle',
  WALK = 'walk',
  TYPE = 'type',
  READ = 'read'
}

// Direction for sprite facing
enum Direction {
  DOWN = 0,
  LEFT = 1,
  RIGHT = 2,
  UP = 3
}

// Desk positions in the office (col, row)
const DESK_POSITIONS = [
  { col: 3, row: 2, dir: Direction.DOWN },
  { col: 7, row: 2, dir: Direction.DOWN },
  { col: 11, row: 2, dir: Direction.DOWN },
  { col: 3, row: 5, dir: Direction.DOWN },
  { col: 7, row: 5, dir: Direction.DOWN },
  { col: 11, row: 5, dir: Direction.DOWN },
];

// Character color palettes
const PALETTES = [
  { body: '#4a7c59', shirt: '#7cb342', skin: '#ffd5b4', hair: '#5d4e37' },
  { body: '#5c6bc0', shirt: '#7986cb', skin: '#ffe0bd', hair: '#2d2d2d' },
  { body: '#ef5350', shirt: '#e57373', skin: '#f5cba7', hair: '#8b4513' },
  { body: '#ab47bc', shirt: '#ba68c8', skin: '#ffecd2', hair: '#1a1a1a' },
  { body: '#26a69a', shirt: '#4db6ac', skin: '#ffd5b4', hair: '#654321' },
  { body: '#ff7043', shirt: '#ff8a65', skin: '#ffe4c4', hair: '#3d2314' },
];

// Office colors
const OFFICE_COLORS = {
  floor1: '#3d3d5c',
  floor2: '#35354d',
  wall: '#1a1a2e',
  desk: '#6b5344',
  deskTop: '#a08060',
  deskLeg: '#4a3828',
  chair: '#4a4a6a',
  chairSeat: '#5a5a7a',
  monitor: '#2d2d3d',
  monitorScreen: '#1a3a4a',
  monitorScreenOn: '#00ff88',
  plant: '#2d5a2d',
  plantPot: '#8b6914',
};

interface Character {
  id: string;
  agent: AgentInfo;
  state: CharacterState;
  dir: Direction;
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  deskCol: number;
  deskRow: number;
  palette: number;
  frame: number;
  frameTimer: number;
  wanderTimer: number;
  isAtDesk: boolean;
  path: { col: number; row: number }[];
  moveProgress: number;
  bubbleType: 'waiting' | 'error' | null;
  bubbleTimer: number;
}

export class CanvasRenderer {
  private ctx: CanvasRenderingContext2D;
  private canvas: HTMLCanvasElement;
  private characters: Map<string, Character> = new Map();
  private animationId: number | null = null;
  private lastTime: number = 0;
  private gridCols: number = 15;
  private gridRows: number = 8;
  private scale: number = 2;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = this.canvas.getContext('2d')!;
    this.ctx.imageSmoothingEnabled = false;
    this.startAnimationLoop();
  }

  resize(width: number, height: number): void {
    this.canvas.width = width;
    this.canvas.height = height;
    this.scale = Math.max(2, Math.floor(Math.min(width / (this.gridCols * TILE_SIZE), height / (this.gridRows * TILE_SIZE))));
  }

  setAgents(agents: AgentInfo[]): void {
    const existingIds = new Set(this.characters.keys());
    const newIds = new Set(agents.map(a => a.id));

    // Remove characters for agents that no longer exist
    for (const id of existingIds) {
      if (!newIds.has(id)) {
        this.characters.delete(id);
      }
    }

    // Add or update characters
    agents.forEach((agent, index) => {
      let char = this.characters.get(agent.id);
      
      if (!char) {
        const deskIndex = index % DESK_POSITIONS.length;
        const desk = DESK_POSITIONS[deskIndex];
        const x = desk.col * TILE_SIZE + TILE_SIZE / 2;
        const y = desk.row * TILE_SIZE + TILE_SIZE / 2;
        
        char = {
          id: agent.id,
          agent,
          state: this.agentStateToCharState(agent.state),
          dir: desk.dir,
          x, y,
          targetX: x,
          targetY: y,
          deskCol: desk.col,
          deskRow: desk.row,
          palette: index % PALETTES.length,
          frame: 0,
          frameTimer: 0,
          wanderTimer: 0,
          isAtDesk: true,
          path: [],
          moveProgress: 0,
          bubbleType: null,
          bubbleTimer: 0,
        };
        this.characters.set(agent.id, char);
      } else {
        char.agent = agent;
        char.state = this.agentStateToCharState(agent.state);
        
        // Update bubble state
        if (agent.state === AgentState.WAITING) {
          char.bubbleType = 'waiting';
          char.bubbleTimer = 2;
        } else if (agent.state === AgentState.ERROR) {
          char.bubbleType = 'error';
          char.bubbleTimer = 3;
        } else if (char.bubbleTimer <= 0) {
          char.bubbleType = null;
        }
      }
    });
  }

  private agentStateToCharState(state: AgentState): CharacterState {
    switch (state) {
      case AgentState.READING:
        return CharacterState.READ;
      case AgentState.WRITING:
      case AgentState.EXECUTING:
      case AgentState.THINKING:
        return CharacterState.TYPE;
      case AgentState.IDLE:
      case AgentState.WAITING:
      case AgentState.ERROR:
      default:
        return CharacterState.IDLE;
    }
  }

  getAgentAtPosition(canvasX: number, canvasY: number): AgentInfo | null {
    const x = canvasX / this.scale;
    const y = canvasY / this.scale;
    
    for (const char of this.characters.values()) {
      if (Math.abs(x - char.x) < 8 && Math.abs(y - char.y) < 12) {
        return char.agent;
      }
    }
    return null;
  }

  private startAnimationLoop(): void {
    this.lastTime = performance.now();
    const animate = (time: number) => {
      const dt = Math.min((time - this.lastTime) / 1000, 0.1);
      this.lastTime = time;
      this.update(dt);
      this.render();
      this.animationId = requestAnimationFrame(animate);
    };
    this.animationId = requestAnimationFrame(animate);
  }

  private update(dt: number): void {
    for (const char of this.characters.values()) {
      // Update animation frame
      char.frameTimer += dt;
      const frameDuration = char.state === CharacterState.WALK ? 0.15 : 0.3;
      if (char.frameTimer >= frameDuration) {
        char.frameTimer -= frameDuration;
        char.frame = (char.frame + 1) % 4;
      }

      // Update bubble timer
      if (char.bubbleTimer > 0) {
        char.bubbleTimer -= dt;
      }

      // Character movement logic
      if (char.state === CharacterState.TYPE || char.state === CharacterState.READ) {
        // At desk, working
        char.isAtDesk = true;
      } else if (char.state === CharacterState.IDLE && char.isAtDesk) {
        // Stay at desk but animate idle
      }
    }
  }

  private render(): void {
    const ctx = this.ctx;
    ctx.save();
    ctx.scale(this.scale, this.scale);

    // Clear with wall color
    ctx.fillStyle = OFFICE_COLORS.wall;
    ctx.fillRect(0, 0, this.gridCols * TILE_SIZE, this.gridRows * TILE_SIZE);

    // Draw floor
    this.drawFloor();

    // Draw furniture (sorted by Y for depth)
    this.drawFurniture();

    // Draw characters (sorted by Y for depth)
    const sortedChars = Array.from(this.characters.values())
      .sort((a, b) => a.y - b.y);
    
    for (const char of sortedChars) {
      this.drawCharacter(char);
    }

    ctx.restore();
  }

  private drawFloor(): void {
    const ctx = this.ctx;
    
    // Draw checkered floor
    for (let col = 0; col < this.gridCols; col++) {
      for (let row = 1; row < this.gridRows; row++) {
        const isLight = (col + row) % 2 === 0;
        ctx.fillStyle = isLight ? OFFICE_COLORS.floor1 : OFFICE_COLORS.floor2;
        ctx.fillRect(col * TILE_SIZE, row * TILE_SIZE, TILE_SIZE, TILE_SIZE);
      }
    }

    // Top wall strip
    ctx.fillStyle = OFFICE_COLORS.wall;
    ctx.fillRect(0, 0, this.gridCols * TILE_SIZE, TILE_SIZE);
    
    // Wall decoration lines
    ctx.strokeStyle = '#2a2a4e';
    ctx.lineWidth = 1;
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.moveTo(0, TILE_SIZE - 4 + i * 2);
      ctx.lineTo(this.gridCols * TILE_SIZE, TILE_SIZE - 4 + i * 2);
      ctx.stroke();
    }
  }

  private drawFurniture(): void {
    const ctx = this.ctx;

    // Draw desks at each position
    for (const desk of DESK_POSITIONS) {
      const x = desk.col * TILE_SIZE;
      const y = desk.row * TILE_SIZE;

      // Desk shadow
      ctx.fillStyle = 'rgba(0,0,0,0.2)';
      ctx.fillRect(x - 8, y + 12, TILE_SIZE + 16, 6);

      // Desk legs
      ctx.fillStyle = OFFICE_COLORS.deskLeg;
      ctx.fillRect(x - 4, y + 8, 3, 10);
      ctx.fillRect(x + TILE_SIZE + 1, y + 8, 3, 10);

      // Desk body
      ctx.fillStyle = OFFICE_COLORS.desk;
      ctx.fillRect(x - 6, y + 2, TILE_SIZE + 12, 8);

      // Desk top highlight
      ctx.fillStyle = OFFICE_COLORS.deskTop;
      ctx.fillRect(x - 6, y, TILE_SIZE + 12, 4);

      // Monitor
      ctx.fillStyle = OFFICE_COLORS.monitor;
      ctx.fillRect(x + 2, y - 8, 12, 10);
      
      // Monitor screen (glow based on activity)
      const hasActiveAgent = Array.from(this.characters.values())
        .some(c => c.deskCol === desk.col && c.deskRow === desk.row && 
              (c.state === CharacterState.TYPE || c.state === CharacterState.READ));
      
      ctx.fillStyle = hasActiveAgent ? OFFICE_COLORS.monitorScreenOn : OFFICE_COLORS.monitorScreen;
      ctx.fillRect(x + 3, y - 7, 10, 7);
      
      // Monitor stand
      ctx.fillStyle = OFFICE_COLORS.monitor;
      ctx.fillRect(x + 6, y + 2, 4, 2);

      // Chair
      const chairY = y + TILE_SIZE + 2;
      ctx.fillStyle = OFFICE_COLORS.chair;
      ctx.fillRect(x + 2, chairY + 4, 12, 8);
      ctx.fillStyle = OFFICE_COLORS.chairSeat;
      ctx.fillRect(x, chairY, 16, 6);
    }

    // Decorative plants
    this.drawPlant(1 * TILE_SIZE, 1 * TILE_SIZE);
    this.drawPlant(13 * TILE_SIZE, 1 * TILE_SIZE);
  }

  private drawPlant(x: number, y: number): void {
    const ctx = this.ctx;
    
    // Pot
    ctx.fillStyle = OFFICE_COLORS.plantPot;
    ctx.fillRect(x + 4, y + 8, 8, 8);
    ctx.fillRect(x + 2, y + 6, 12, 4);
    
    // Plant leaves
    ctx.fillStyle = OFFICE_COLORS.plant;
    ctx.fillRect(x + 6, y, 4, 8);
    ctx.fillRect(x + 2, y + 2, 4, 4);
    ctx.fillRect(x + 10, y + 2, 4, 4);
    ctx.fillRect(x + 4, y - 2, 3, 4);
    ctx.fillRect(x + 9, y - 2, 3, 4);
  }

  private drawCharacter(char: Character): void {
    const ctx = this.ctx;
    const palette = PALETTES[char.palette];
    const x = char.x - 8;
    const y = char.y - 16;

    // Animation bounce
    let bounce = 0;
    if (char.state === CharacterState.TYPE) {
      bounce = char.frame % 2 === 0 ? -1 : 0;
    } else if (char.state === CharacterState.READ) {
      bounce = Math.sin(char.frame * Math.PI / 2) * 0.5;
    }

    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath();
    ctx.ellipse(char.x, char.y + 2, 6, 2, 0, 0, Math.PI * 2);
    ctx.fill();

    // Body
    ctx.fillStyle = palette.body;
    ctx.fillRect(x + 4, y + 8 + bounce, 8, 10);

    // Shirt detail
    ctx.fillStyle = palette.shirt;
    ctx.fillRect(x + 5, y + 9 + bounce, 6, 4);

    // Arms
    ctx.fillStyle = palette.skin;
    if (char.state === CharacterState.TYPE) {
      // Typing arms
      const armBounce = char.frame % 2 === 0 ? 0 : -1;
      ctx.fillRect(x + 2, y + 10 + bounce + armBounce, 3, 4);
      ctx.fillRect(x + 11, y + 10 + bounce - armBounce, 3, 4);
    } else {
      ctx.fillRect(x + 2, y + 10 + bounce, 3, 5);
      ctx.fillRect(x + 11, y + 10 + bounce, 3, 5);
    }

    // Head
    ctx.fillStyle = palette.skin;
    ctx.fillRect(x + 4, y + bounce, 8, 8);

    // Hair
    ctx.fillStyle = palette.hair;
    ctx.fillRect(x + 4, y - 1 + bounce, 8, 3);
    ctx.fillRect(x + 3, y + bounce, 2, 4);
    ctx.fillRect(x + 11, y + bounce, 2, 4);

    // Eyes
    ctx.fillStyle = '#222';
    const eyeY = y + 3 + bounce;
    if (char.state === CharacterState.READ) {
      // Looking down
      ctx.fillRect(x + 5, eyeY + 2, 2, 1);
      ctx.fillRect(x + 9, eyeY + 2, 2, 1);
    } else {
      // Normal eyes
      ctx.fillRect(x + 5, eyeY, 2, 2);
      ctx.fillRect(x + 9, eyeY, 2, 2);
      
      // Blink occasionally
      if (char.frame === 3) {
        ctx.fillStyle = palette.skin;
        ctx.fillRect(x + 5, eyeY, 2, 1);
        ctx.fillRect(x + 9, eyeY, 2, 1);
      }
    }

    // Legs
    ctx.fillStyle = '#3d3d5d';
    ctx.fillRect(x + 5, y + 18 + bounce, 3, 4);
    ctx.fillRect(x + 9, y + 18 + bounce, 3, 4);

    // State indicator above head
    this.drawStateIndicator(char, x + 8, y - 8 + bounce);

    // Speech bubble
    if (char.bubbleType && char.bubbleTimer > 0) {
      this.drawBubble(char, x + 8, y - 14);
    }

    // Name tag
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    const name = char.agent.name;
    ctx.font = '6px monospace';
    const textWidth = ctx.measureText(name).width;
    ctx.fillRect(char.x - textWidth / 2 - 2, char.y + 6, textWidth + 4, 8);
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.fillText(name, char.x, char.y + 12);
  }

  private drawStateIndicator(char: Character, x: number, y: number): void {
    const ctx = this.ctx;
    const bounce = (Math.sin(performance.now() / 200) + 1) * 1;

    ctx.font = '8px sans-serif';
    ctx.textAlign = 'center';

    let icon = '';
    switch (char.agent.state) {
      case AgentState.READING:
        icon = '📖';
        break;
      case AgentState.WRITING:
        icon = '✏️';
        break;
      case AgentState.EXECUTING:
        icon = '⚡';
        break;
      case AgentState.THINKING:
        icon = '💭';
        break;
      case AgentState.WAITING:
        icon = '⏳';
        break;
      case AgentState.ERROR:
        icon = '❌';
        break;
      case AgentState.IDLE:
        return; // No indicator for idle
    }

    ctx.fillText(icon, x, y - bounce);
  }

  private drawBubble(char: Character, x: number, y: number): void {
    const ctx = this.ctx;
    
    // Bubble background
    ctx.fillStyle = char.bubbleType === 'error' ? '#ff6b6b' : '#fff';
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 0.5;
    
    // Rounded bubble
    const bubbleW = 20;
    const bubbleH = 12;
    ctx.beginPath();
    ctx.roundRect(x - bubbleW / 2, y - bubbleH, bubbleW, bubbleH, 3);
    ctx.fill();
    ctx.stroke();

    // Bubble tail
    ctx.fillStyle = char.bubbleType === 'error' ? '#ff6b6b' : '#fff';
    ctx.beginPath();
    ctx.moveTo(x - 2, y);
    ctx.lineTo(x + 2, y);
    ctx.lineTo(x, y + 4);
    ctx.closePath();
    ctx.fill();

    // Bubble content
    ctx.font = '8px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#333';
    ctx.fillText(char.bubbleType === 'error' ? '!' : '?', x, y - 4);
  }

  destroy(): void {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
    this.characters.clear();
  }
}
