export interface SpriteFrame {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface SpriteAnimation {
  frames: SpriteFrame[];
  frameDuration: number;
}

export interface SpriteSheet {
  image: HTMLImageElement;
  animations: Map<string, SpriteAnimation>;
}

export class SpriteLoader {
  private sprites: Map<string, HTMLImageElement> = new Map();
  private spriteSheets: Map<string, SpriteSheet> = new Map();
  private loaded: boolean = false;

  async loadAll(basePath: string = '/assets'): Promise<void> {
    const spriteList = [
      'characters/char1.png',
      'characters/char2.png',
      'characters/char3.png',
      'office/desk.png',
      'office/floor.png',
      'ui/icons.png',
    ];

    try {
      await Promise.all(
        spriteList.map(path => this.loadSprite(`${basePath}/${path}`, path))
      );
      this.loaded = true;
    } catch (error) {
      console.warn('[SpriteLoader] Some sprites failed to load, using fallback rendering');
      this.loaded = false;
    }
  }

  private async loadSprite(url: string, key: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        this.sprites.set(key, img);
        resolve();
      };
      img.onerror = () => {
        console.warn(`[SpriteLoader] Failed to load: ${url}`);
        reject(new Error(`Failed to load sprite: ${url}`));
      };
      img.src = url;
    });
  }

  async loadSpriteSheet(url: string, key: string, animations: Record<string, SpriteAnimation>): Promise<void> {
    const image = await this.loadAndGetImage(url);
    
    this.spriteSheets.set(key, {
      image,
      animations: new Map(Object.entries(animations))
    });
  }

  private async loadAndGetImage(url: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error(`Failed to load: ${url}`));
      img.src = url;
    });
  }

  getSprite(key: string): HTMLImageElement | undefined {
    return this.sprites.get(key);
  }

  getSpriteSheet(key: string): SpriteSheet | undefined {
    return this.spriteSheets.get(key);
  }

  isLoaded(): boolean {
    return this.loaded;
  }

  getLoadedCount(): number {
    return this.sprites.size;
  }

  clear(): void {
    this.sprites.clear();
    this.spriteSheets.clear();
    this.loaded = false;
  }
}

export const spriteLoader = new SpriteLoader();
