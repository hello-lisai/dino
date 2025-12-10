
export enum GameState {
  START = 'START',
  PLAYING = 'PLAYING',
  PAUSED = 'PAUSED',
  GAME_OVER = 'GAME_OVER',
}

export enum EntityType {
  DINO = 'DINO',
  CACTUS_SMALL = 'CACTUS_SMALL',
  CACTUS_LARGE = 'CACTUS_LARGE',
  CACTUS_SHOOTER = 'CACTUS_SHOOTER',
  METEOR = 'METEOR', // Red falling meteor
  SPIKE = 'SPIKE',
  FIREBALL = 'FIREBALL', // New: Moving red fireball
  CLOUD = 'CLOUD', // New: Purple cloud (Jump to hit)
  BLUE_PILL = 'BLUE_PILL', // Health
  BLUE_METEOR = 'BLUE_METEOR', // Power up (Jump)
  BLUE_MUSHROOM = 'BLUE_MUSHROOM', // Power up (Giant + Invincible)
}

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Entity extends Rect {
  id: number;
  type: EntityType;
  vx: number;
  vy: number;
  markedForDeletion: boolean;
  color: string;
  hasShot?: boolean; // For shooter cactus
  initialY?: number; // Base Y position for movement
}

export interface Particle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}
