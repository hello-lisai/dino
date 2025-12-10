
import React, { useEffect, useRef, useCallback } from 'react';
import { GameState, Entity, EntityType, Particle } from '../types';
import {
  GRAVITY,
  JUMP_FORCE,
  JUMP_FORCE_POWERUP,
  GROUND_HEIGHT,
  BASE_SPEED,
  MAX_SPEED,
  SPEED_INCREMENT,
  DINO_WIDTH,
  DINO_HEIGHT,
  DINO_COLOR,
  CACTUS_COLOR,
  CACTUS_SHOOTER_COLOR,
  METEOR_COLOR,
  SPIKE_COLOR,
  FIREBALL_COLOR,
  CLOUD_COLOR,
  SPAWN_RATE_INITIAL,
  SPAWN_RATE_MIN,
  SPRITE_URLS,
  MAX_LIVES,
  INVINCIBILITY_FRAMES,
  POWERUP_DURATION,
  MUSHROOM_DURATION,
  DAY_DURATION,
  CYCLE_SUNSET_START,
  CYCLE_NIGHT_START,
  CYCLE_DAWN_START
} from '../constants';
import { checkCollision, randomRange } from '../utils';

interface GameRunnerProps {
  onGameOver: (score: number) => void;
  gameState: GameState;
  setGameState: (state: GameState) => void;
}

export const GameRunner: React.FC<GameRunnerProps> = ({ onGameOver, gameState, setGameState }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const scratchCanvasRef = useRef<HTMLCanvasElement | null>(null); // For tinting images
  const requestRef = useRef<number>(0);
  const scoreRef = useRef<number>(0);
  const highScoreRef = useRef<number>(
    parseInt(localStorage.getItem('neon-dino-highscore') || '0', 10)
  );
  
  // Game Logic Refs
  const spritesRef = useRef<Record<string, HTMLImageElement>>({});
  const bg1OffsetRef = useRef<number>(0);
  const bg2OffsetRef = useRef<number>(0);
  const bg3OffsetRef = useRef<number>(0);

  const dinoRef = useRef<Entity>({
    id: 0,
    type: EntityType.DINO,
    x: 50,
    y: 0,
    w: DINO_WIDTH,
    h: DINO_HEIGHT,
    vx: 0,
    vy: 0,
    markedForDeletion: false,
    color: DINO_COLOR,
  });
  
  const obstaclesRef = useRef<Entity[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  
  // Mechanics Refs
  const frameCountRef = useRef<number>(0);
  const gameSpeedRef = useRef<number>(BASE_SPEED);
  const nextSpawnTimeRef = useRef<number>(0);
  
  const livesRef = useRef<number>(MAX_LIVES);
  const invincibilityTimerRef = useRef<number>(0);
  const powerUpTimerRef = useRef<number>(0); // Jump boost
  const mushroomTimerRef = useRef<number>(0); // Giant mode
  const dayCycleTimerRef = useRef<number>(0); // 0 -> DAY_DURATION

  // Load Images
  useEffect(() => {
    const loadImages = () => {
      Object.entries(SPRITE_URLS).forEach(([key, url]) => {
        const img = new Image();
        img.src = url;
        spritesRef.current[key] = img;
      });
    };
    loadImages();

    // Create scratch canvas
    scratchCanvasRef.current = document.createElement('canvas');
  }, []);

  const initGame = useCallback(() => {
    scoreRef.current = 0;
    gameSpeedRef.current = BASE_SPEED;
    frameCountRef.current = 0;
    nextSpawnTimeRef.current = 0;
    
    // Mechanics Reset
    livesRef.current = MAX_LIVES;
    invincibilityTimerRef.current = 0;
    powerUpTimerRef.current = 0;
    mushroomTimerRef.current = 0;
    dayCycleTimerRef.current = 0;
    
    // Reset Backgrounds
    bg1OffsetRef.current = 0;
    bg2OffsetRef.current = 0;
    bg3OffsetRef.current = 0;

    obstaclesRef.current = [];
    particlesRef.current = [];
    
    if (canvasRef.current) {
      dinoRef.current = {
        id: 0,
        type: EntityType.DINO,
        x: 50,
        y: canvasRef.current.height - GROUND_HEIGHT - DINO_HEIGHT,
        w: DINO_WIDTH,
        h: DINO_HEIGHT,
        vx: 0,
        vy: 0,
        markedForDeletion: false,
        color: DINO_COLOR,
      };
    }
  }, []);

  const jump = useCallback(() => {
    if (gameState !== GameState.PLAYING) {
      // Only allow starting from START screen with a click/tap.
      // Do NOT allow starting from GAME_OVER with a click/tap (must use UI button).
      if (gameState === GameState.START) {
         setGameState(GameState.PLAYING);
      }
      return;
    }

    const dino = dinoRef.current;
    const groundY = (canvasRef.current?.height || 400) - GROUND_HEIGHT - dino.h;
    
    // Jump if on ground (with buffer)
    if (dino.y >= groundY - 5) {
      // Check for power-up
      const force = powerUpTimerRef.current > 0 ? JUMP_FORCE_POWERUP : JUMP_FORCE;
      dino.vy = force;
      
      // Jump particles
      for(let i=0; i<5; i++) {
        particlesRef.current.push({
          id: Math.random(),
          x: dino.x + dino.w/2,
          y: dino.y + dino.h,
          vx: randomRange(-2, 2),
          vy: randomRange(0, 2),
          life: 20,
          maxLife: 20,
          color: powerUpTimerRef.current > 0 ? '#60a5fa' : '#ffffff', // Blue if powerup
          size: randomRange(2, 4)
        });
      }
    }
  }, [gameState, setGameState]);

  // Input Listeners
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'ArrowUp') {
        e.preventDefault();
        jump();
      }
    };
    
    const handleInputStart = (e: TouchEvent | MouseEvent) => {
        if (e.type === 'touchstart') {
             // e.preventDefault(); 
        }
        jump();
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('touchstart', handleInputStart);
    window.addEventListener('mousedown', handleInputStart);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('touchstart', handleInputStart);
      window.removeEventListener('mousedown', handleInputStart);
    };
  }, [jump]);

  // Init on Play
  useEffect(() => {
    if (gameState === GameState.PLAYING) {
      // If restarting from dead state OR fresh game
      if (livesRef.current <= 0 || frameCountRef.current === 0) {
        initGame();
      }
    }
  }, [gameState, initGame]);

  const interpolateColor = (color1: number[], color2: number[], factor: number) => {
      const r = Math.round(color1[0] + (color2[0] - color1[0]) * factor);
      const g = Math.round(color1[1] + (color2[1] - color1[1]) * factor);
      const b = Math.round(color1[2] + (color2[2] - color1[2]) * factor);
      return `rgb(${r}, ${g}, ${b})`;
  };

  // Main Game Loop
  const loop = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (gameState === GameState.PAUSED) {
        return; 
    }

    if (gameState === GameState.PLAYING) {
      frameCountRef.current++;
      
      // Score = Time Survived (Seconds)
      // Assuming ~60fps
      scoreRef.current += 1 / 60;
      
      gameSpeedRef.current = Math.min(MAX_SPEED, gameSpeedRef.current + SPEED_INCREMENT);
      
      // Timers
      if (invincibilityTimerRef.current > 0) invincibilityTimerRef.current--;
      if (powerUpTimerRef.current > 0) powerUpTimerRef.current--;
      if (mushroomTimerRef.current > 0) mushroomTimerRef.current--;
      
      const isGiant = mushroomTimerRef.current > 0;

      // Day Cycle
      dayCycleTimerRef.current = (dayCycleTimerRef.current + 1) % DAY_DURATION;
      const isNight = dayCycleTimerRef.current > CYCLE_NIGHT_START && dayCycleTimerRef.current < CYCLE_DAWN_START;
      const isDay = dayCycleTimerRef.current < CYCLE_SUNSET_START;

      // Parallax
      bg1OffsetRef.current = (bg1OffsetRef.current + gameSpeedRef.current * 0.1) % canvas.width;
      bg2OffsetRef.current = (bg2OffsetRef.current + gameSpeedRef.current * 0.3) % canvas.width;
      bg3OffsetRef.current = (bg3OffsetRef.current + gameSpeedRef.current * 0.6) % canvas.width;

      // 1. Update Dino
      const dino = dinoRef.current;
      
      // Handle Size Change
      const targetW = isGiant ? DINO_WIDTH * 1.5 : DINO_WIDTH;
      const targetH = isGiant ? DINO_HEIGHT * 1.5 : DINO_HEIGHT;
      dino.w = targetW;
      dino.h = targetH;

      const groundY = canvas.height - GROUND_HEIGHT;

      dino.vy += GRAVITY;
      dino.y += dino.vy;

      if (dino.y + dino.h > groundY) {
        dino.y = groundY - dino.h;
        dino.vy = 0;
      }

      // 2. Spawn Logic
      if (frameCountRef.current > nextSpawnTimeRef.current) {
        const difficultyMultiplier = gameSpeedRef.current / BASE_SPEED;
        const id = Date.now();
        const rand = Math.random();
        
        // Spawn Entity
        if (rand < 0.05 && livesRef.current < MAX_LIVES) {
            // BLUE PILL (Health)
            obstaclesRef.current.push({
                id,
                type: EntityType.BLUE_PILL,
                x: canvas.width,
                y: groundY - 30,
                w: 30,
                h: 30,
                vx: -gameSpeedRef.current,
                vy: 0,
                markedForDeletion: false,
                color: '#38bdf8'
            });
        } else if (rand > 0.95) { // 5% chance for Mushroom
             obstaclesRef.current.push({
                id,
                type: EntityType.BLUE_MUSHROOM,
                x: canvas.width,
                y: groundY - 30,
                w: 30,
                h: 30,
                vx: -gameSpeedRef.current,
                vy: 0,
                markedForDeletion: false,
                color: '#3b82f6'
            });
        } else if (isNight && rand > 0.85 && rand < 0.95) { 
            // BLUE METEOR (Powerup) - Night only
            obstaclesRef.current.push({
                id,
                type: EntityType.BLUE_METEOR,
                x: canvas.width,
                y: randomRange(groundY - 120, groundY - 60),
                w: 40,
                h: 40,
                vx: -(gameSpeedRef.current * 1.2),
                vy: 0,
                markedForDeletion: false,
                color: '#60a5fa'
            });
        } else if (isNight && rand > 0.75 && rand < 0.85) {
             // CLOUD (Night only, high obstacle, safe if walking)
             // Dino height is 47, GroundY is usually 350. Top of Dino is 303.
             // Cloud needs to be above 303 so walking dino doesn't hit it.
             // Cloud H=30. Let's put bottom at 303 - 10 = 293.
             // Y = 293 - 30 = 263.
             // So Y roughly groundY - 90
             obstaclesRef.current.push({
                 id,
                 type: EntityType.CLOUD,
                 x: canvas.width,
                 y: groundY - 90,
                 w: 60,
                 h: 30,
                 vx: -gameSpeedRef.current,
                 vy: 0,
                 markedForDeletion: false,
                 color: CLOUD_COLOR
             });
        } else if (isDay && rand > 0.70 && rand < 0.80 && scoreRef.current > 15) {
            // FIREBALL (Day only, moves up and down)
            const startY = groundY - 100;
            obstaclesRef.current.push({
                id,
                type: EntityType.FIREBALL,
                x: canvas.width,
                y: startY,
                initialY: startY,
                w: 40,
                h: 40,
                vx: -gameSpeedRef.current,
                vy: 3, // Initial vertical velocity
                markedForDeletion: false,
                color: FIREBALL_COLOR
            });
        } else if (rand < 0.25 && scoreRef.current > 10) {
          // HOSTILE METEOR
          obstaclesRef.current.push({
            id,
            type: EntityType.METEOR,
            x: canvas.width + 50,
            y: randomRange(50, canvas.height / 2),
            w: 40,
            h: 40,
            vx: -(gameSpeedRef.current * 1.3),
            vy: gameSpeedRef.current * 0.4,
            markedForDeletion: false,
            color: METEOR_COLOR
          });
        } else if (rand < 0.45 && scoreRef.current > 20) {
          // SHOOTER
           obstaclesRef.current.push({
            id,
            type: EntityType.CACTUS_SHOOTER,
            x: canvas.width,
            y: groundY - 60,
            w: 30,
            h: 60,
            vx: -gameSpeedRef.current,
            vy: 0,
            markedForDeletion: false,
            color: CACTUS_SHOOTER_COLOR,
            hasShot: false
          });
        } else {
          // CACTUS
          const isLarge = Math.random() > 0.5;
          obstaclesRef.current.push({
            id,
            type: isLarge ? EntityType.CACTUS_LARGE : EntityType.CACTUS_SMALL,
            x: canvas.width,
            y: groundY - (isLarge ? 70 : 50),
            w: isLarge ? 35 : 25,
            h: isLarge ? 70 : 50,
            vx: -gameSpeedRef.current,
            vy: 0,
            markedForDeletion: false,
            color: CACTUS_COLOR
          });
        }

        const safeGap = (200 / gameSpeedRef.current) * 20;
        const randomVariance = randomRange(0, 50);
        const nextFrames = Math.max(SPAWN_RATE_MIN, SPAWN_RATE_INITIAL / difficultyMultiplier) + randomVariance;
        nextSpawnTimeRef.current = frameCountRef.current + nextFrames;
      }

      // 3. Update Entities
      obstaclesRef.current.forEach(obs => {
        obs.x += obs.vx;
        obs.y += obs.vy;

        // Fireball LINEAR Movement (Ping Pong)
        if (obs.type === EntityType.FIREBALL && obs.initialY !== undefined) {
             const range = 60;
             // If goes too low or too high relative to initialY, flip direction
             if (obs.y > obs.initialY + range) {
                 obs.y = obs.initialY + range;
                 obs.vy = -Math.abs(obs.vy);
             } else if (obs.y < obs.initialY - range) {
                 obs.y = obs.initialY - range;
                 obs.vy = Math.abs(obs.vy);
             }
             
             // Fireball Trail
             if (Math.random() > 0.3) {
                 particlesRef.current.push({
                     id: Math.random(),
                     x: obs.x + obs.w/2 + randomRange(-10, 10),
                     y: obs.y + obs.h/2 + randomRange(-10, 10),
                     vx: randomRange(1, 3),
                     vy: randomRange(-1, 1),
                     life: 15,
                     maxLife: 15,
                     color: Math.random() > 0.5 ? '#f87171' : '#fca5a5',
                     size: randomRange(3, 6)
                 });
             }
        }

        // Meteor Trail
        if (obs.type === EntityType.METEOR) {
           for(let i=0; i<2; i++) {
             particlesRef.current.push({
               id: Math.random(),
               x: obs.x + obs.w/2 + randomRange(-5, 5),
               y: obs.y + obs.h/2 + randomRange(-5, 5),
               vx: randomRange(1, 3),
               vy: randomRange(-1, 1),
               life: 15,
               maxLife: 15,
               color: Math.random() > 0.5 ? '#f97316' : '#ef4444',
               size: randomRange(2, 5)
             });
           }
           if (obs.y + obs.h > groundY) {
             obs.markedForDeletion = true;
             // Explosion
             for(let i=0; i<8; i++) {
                particlesRef.current.push({
                  id: Math.random(),
                  x: obs.x + obs.w/2,
                  y: groundY,
                  vx: randomRange(-5, 5),
                  vy: randomRange(-5, -2),
                  life: 30,
                  maxLife: 30,
                  color: METEOR_COLOR,
                  size: randomRange(3, 6)
                });
             }
           }
        }

        // Blue Meteor Sparkles
        if (obs.type === EntityType.BLUE_METEOR) {
            if (Math.random() > 0.5) {
                particlesRef.current.push({
                    id: Math.random(),
                    x: obs.x + obs.w/2,
                    y: obs.y + obs.h/2,
                    vx: -gameSpeedRef.current,
                    vy: randomRange(-1, 1),
                    life: 20,
                    maxLife: 20,
                    color: '#60a5fa',
                    size: randomRange(2, 4)
                });
            }
        }
        
        // Cloud Rain/Drip particles
        if (obs.type === EntityType.CLOUD) {
            if (Math.random() > 0.8) {
                 particlesRef.current.push({
                    id: Math.random(),
                    x: obs.x + randomRange(5, obs.w - 5),
                    y: obs.y + obs.h - 5,
                    vx: 0,
                    vy: randomRange(1, 2),
                    life: 20,
                    maxLife: 20,
                    color: '#d8b4fe',
                    size: 2
                 });
            }
        }

        // Shooter
        if (obs.type === EntityType.CACTUS_SHOOTER && !obs.hasShot) {
          const dist = obs.x - dino.x;
          if (dist < 300 && dist > 100) {
            obs.hasShot = true;
            obstaclesRef.current.push({
              id: Date.now() + 1,
              type: EntityType.SPIKE,
              x: obs.x + obs.w/2 - 5,
              y: obs.y,
              w: 10,
              h: 20,
              vx: -gameSpeedRef.current,
              vy: -7,
              markedForDeletion: false,
              color: SPIKE_COLOR
            });
          }
        }

        if (obs.x + obs.w < -100 || obs.y > canvas.height + 100) {
          obs.markedForDeletion = true;
        }

        // --- COLLISION ---
        if (checkCollision(dino, obs)) {
           
           // Good Items
           if (obs.type === EntityType.BLUE_PILL) {
               livesRef.current = Math.min(MAX_LIVES, livesRef.current + 1);
               obs.markedForDeletion = true;
               // Heal Effect
               for(let i=0; i<10; i++) {
                   particlesRef.current.push({
                       id: Math.random(),
                       x: dino.x + dino.w/2,
                       y: dino.y + dino.h/2,
                       vx: randomRange(-2, 2),
                       vy: randomRange(-2, 2),
                       life: 30, maxLife: 30, color: '#4ade80', size: 4
                   });
               }
           } else if (obs.type === EntityType.BLUE_METEOR) {
               powerUpTimerRef.current += POWERUP_DURATION; // Add 5 seconds
               obs.markedForDeletion = true;
               // Powerup Effect
               for(let i=0; i<15; i++) {
                   particlesRef.current.push({
                       id: Math.random(),
                       x: dino.x + dino.w/2,
                       y: dino.y + dino.h/2,
                       vx: randomRange(-3, 3),
                       vy: randomRange(-3, 3),
                       life: 40, maxLife: 40, color: '#3b82f6', size: 5
                   });
               }
           } else if (obs.type === EntityType.BLUE_MUSHROOM) {
               mushroomTimerRef.current += MUSHROOM_DURATION; // Add 5 seconds giant mode
               obs.markedForDeletion = true;
               // Giant Effect
                for(let i=0; i<20; i++) {
                   particlesRef.current.push({
                       id: Math.random(),
                       x: dino.x + dino.w/2,
                       y: dino.y + dino.h/2,
                       vx: randomRange(-4, 4),
                       vy: randomRange(-4, 4),
                       life: 45, maxLife: 45, color: '#a855f7', size: 6
                   });
               }
           } else {
               // Bad Items (Spike, Cactus, Meteor, Fireball, Cloud)
               if (isGiant) {
                   // SMASH!
                   obs.markedForDeletion = true;
                   scoreRef.current += 10;
                   // Smash particles
                   for(let i=0; i<12; i++) {
                       particlesRef.current.push({
                           id: Math.random(),
                           x: obs.x + obs.w/2,
                           y: obs.y + obs.h/2,
                           vx: randomRange(-4, 4),
                           vy: randomRange(-4, 4),
                           life: 25, maxLife: 25, color: obs.color, size: 5
                       });
                   }
               } else if (invincibilityTimerRef.current === 0) {
                   livesRef.current--;
                   if (livesRef.current <= 0) {
                       onGameOver(Math.floor(scoreRef.current));
                       setGameState(GameState.GAME_OVER);
                       if (scoreRef.current > highScoreRef.current) {
                           highScoreRef.current = Math.floor(scoreRef.current);
                           localStorage.setItem('neon-dino-highscore', highScoreRef.current.toString());
                       }
                   } else {
                       // Hit but survived
                       invincibilityTimerRef.current = INVINCIBILITY_FRAMES;
                       // Only destroy small projectiles, but for obstacles like Cactus/Cloud/Fireball/Meteor we usually destroy them so you don't get stuck inside
                       obs.markedForDeletion = true; 
                       // Hit particles
                       for(let i=0; i<15; i++) {
                           particlesRef.current.push({
                               id: Math.random(),
                               x: dino.x + dino.w/2,
                               y: dino.y + dino.h/2,
                               vx: randomRange(-5, 5),
                               vy: randomRange(-5, 5),
                               life: 20, maxLife: 20, color: '#ef4444', size: 4
                           });
                       }
                   }
               }
           }
        }
      });

      obstaclesRef.current = obstaclesRef.current.filter(o => !o.markedForDeletion);
    }

    // Update Particles
    particlesRef.current.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;
      p.life--;
      p.vy += 0.05;
    });
    particlesRef.current = particlesRef.current.filter(p => p.life > 0);

    // --- DRAW LOGIC ---
    
    // Calculate Sky Color based on Cycle
    const t = dayCycleTimerRef.current;
    
    // Define RGB Colors
    const COLOR_DAY = [254, 240, 138];    // Light Yellow (Sunny)
    const COLOR_SUNSET = [251, 146, 60];  // Orange
    const COLOR_NIGHT = [15, 23, 42];     // Dark Slate

    // Forest Colors (R, G, B)
    const FOREST_DAY = [186, 214, 196];   // Misty Green / Sage
    const FOREST_SUNSET = [124, 45, 18];  // Orange 900
    const FOREST_NIGHT = [2, 6, 23];      // Slate 950

    let currentSkyColor = 'rgb(254, 240, 138)';
    let currentForestColor = `rgb(${FOREST_DAY.join(',')})`;
    let starOpacity = 0;

    if (t < CYCLE_SUNSET_START) {
        // DAY
        currentSkyColor = `rgb(${COLOR_DAY.join(',')})`;
        currentForestColor = `rgb(${FOREST_DAY.join(',')})`;
        starOpacity = 0;
    } else if (t < CYCLE_NIGHT_START) {
        // SUNSET TRANSITION
        const transitionDuration = CYCLE_NIGHT_START - CYCLE_SUNSET_START;
        const localT = t - CYCLE_SUNSET_START;
        const factor = localT / transitionDuration;
        
        if (factor < 0.5) {
            // Day -> Sunset
            currentSkyColor = interpolateColor(COLOR_DAY, COLOR_SUNSET, factor * 2);
            currentForestColor = interpolateColor(FOREST_DAY, FOREST_SUNSET, factor * 2);
        } else {
            // Sunset -> Night
            currentSkyColor = interpolateColor(COLOR_SUNSET, COLOR_NIGHT, (factor - 0.5) * 2);
            currentForestColor = interpolateColor(FOREST_SUNSET, FOREST_NIGHT, (factor - 0.5) * 2);
        }
        starOpacity = factor;
    } else if (t < CYCLE_DAWN_START) {
        // NIGHT
        currentSkyColor = `rgb(${COLOR_NIGHT.join(',')})`;
        currentForestColor = `rgb(${FOREST_NIGHT.join(',')})`;
        starOpacity = 1;
    } else {
        // DAWN (Night to Day)
        const factor = (t - CYCLE_DAWN_START) / (DAY_DURATION - CYCLE_DAWN_START);
        currentSkyColor = interpolateColor(COLOR_NIGHT, COLOR_DAY, factor);
        currentForestColor = interpolateColor(FOREST_NIGHT, FOREST_DAY, factor);
        starOpacity = 1 - factor;
    }

    // Draw Background Color
    ctx.fillStyle = currentSkyColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // 1. Draw Parallax Background Layers
    const drawParallaxLayer = (spriteKey: string, offset: number, alphaOverride: number = 1.0, colorOverride?: string) => {
        const sprite = spritesRef.current[spriteKey];
        if (sprite && sprite.complete) {
            const bgW = canvas.width;
            const bgH = canvas.height;
            const prevAlpha = ctx.globalAlpha;
            ctx.globalAlpha = alphaOverride;

            if (colorOverride && scratchCanvasRef.current) {
                // Use scratch canvas to tint the image
                const sCanvas = scratchCanvasRef.current;
                sCanvas.width = bgW;
                sCanvas.height = bgH;
                const sCtx = sCanvas.getContext('2d');
                if (sCtx) {
                    // Draw image
                    sCtx.drawImage(sprite, -offset, 0, bgW, bgH);
                    sCtx.drawImage(sprite, bgW - offset, 0, bgW, bgH);
                    
                    // Tint
                    sCtx.globalCompositeOperation = 'source-in';
                    sCtx.fillStyle = colorOverride;
                    sCtx.fillRect(0, 0, bgW, bgH);
                    
                    // Draw tinted result to main canvas
                    ctx.drawImage(sCanvas, 0, 0);
                }
            } else {
                // Normal draw
                ctx.drawImage(sprite, -offset, 0, bgW, bgH);
                ctx.drawImage(sprite, bgW - offset, 0, bgW, bgH);
            }
            
            ctx.globalAlpha = prevAlpha;
        }
    }
    
    // Layer 1: Stars/Moon (No tint, just opacity fade)
    drawParallaxLayer('BG_LAYER_1', bg1OffsetRef.current, starOpacity); 
    
    // Layer 2: Distant Trees (Tinted)
    drawParallaxLayer('BG_LAYER_2', bg2OffsetRef.current, 1.0, currentForestColor);
    
    // Layer 3: Foreground (Tinted)
    drawParallaxLayer('BG_LAYER_3', bg3OffsetRef.current, 1.0, currentForestColor);

    const groundY = canvas.height - GROUND_HEIGHT;
    ctx.strokeStyle = currentForestColor; // Ground line matches forest
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, groundY);
    ctx.lineTo(canvas.width, groundY);
    ctx.stroke();

    const drawEntity = (entity: Entity, spriteKeyOverride?: string) => {
      const key = spriteKeyOverride || entity.type;
      const sprite = spritesRef.current[key];
      if (sprite && sprite.complete && sprite.naturalWidth !== 0) {
        ctx.drawImage(sprite, entity.x, entity.y, entity.w, entity.h);
      } else {
        ctx.fillStyle = entity.color;
        ctx.fillRect(entity.x, entity.y, entity.w, entity.h);
      }
    };

    // Draw Dino
    const dino = dinoRef.current;
    const isGrounded = dino.y >= groundY - dino.h - 5;
    let currentDinoSprite = isGrounded ? 'DINO' : 'DINO_JUMP';
    if (isGrounded) {
       const runFreq = Math.max(5, 12 - Math.floor(gameSpeedRef.current / 1.5)); 
       const frameIndex = Math.floor(frameCountRef.current / runFreq) % 2;
       currentDinoSprite = frameIndex === 0 ? 'DINO_RUN_1' : 'DINO_RUN_2';
    }

    // Blink if invincible
    if (invincibilityTimerRef.current === 0 || Math.floor(Date.now() / 100) % 2 === 0) {
        drawEntity(dino, currentDinoSprite);
    }

    // Draw Obstacles
    obstaclesRef.current.forEach(obs => {
        drawEntity(obs);
    });

    // Draw Particles
    particlesRef.current.forEach(p => {
      ctx.fillStyle = p.color;
      ctx.globalAlpha = p.life / p.maxLife;
      ctx.fillRect(p.x, p.y, p.size, p.size);
      ctx.globalAlpha = 1.0;
    });
    
    // --- HUD (Heads Up Display) ---
    
    // 1. Lives (Hearts)
    const heartSize = 24;
    const heartSpacing = 30;
    for (let i = 0; i < MAX_LIVES; i++) {
        const x = 20 + (i * heartSpacing);
        const y = 20;
        
        ctx.fillStyle = i < livesRef.current ? '#ef4444' : 'rgba(0,0,0,0.3)'; 
        ctx.font = '24px Arial';
        ctx.fillText('❤', x, y + 20);
    }

    // 2. PowerUp Timer (Jump)
    if (powerUpTimerRef.current > 0) {
        const barW = 60;
        const barH = 6;
        const pct = powerUpTimerRef.current / POWERUP_DURATION; 
        const drawPct = Math.min(1, pct); 
        
        // Draw near dino
        const barX = dino.x + (dino.w - barW)/2;
        const barY = dino.y - 15;
        
        // Background
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(barX, barY, barW, barH);
        
        // Fill
        ctx.fillStyle = '#60a5fa'; // Blue
        ctx.fillRect(barX, barY, barW * drawPct, barH);
        
        // Text
        ctx.fillStyle = dayCycleTimerRef.current < CYCLE_SUNSET_START ? '#1e40af' : '#93c5fd';
        ctx.font = 'bold 10px monospace';
        ctx.textAlign = 'center';
        ctx.fillText("JUMP UP!", dino.x + dino.w/2, barY - 5);
    }

    // 3. Giant Mode Timer
    if (mushroomTimerRef.current > 0) {
        const barW = 80;
        const barH = 6;
        const pct = mushroomTimerRef.current / MUSHROOM_DURATION; 
        const drawPct = Math.min(1, pct); 
        
        // Draw above jump bar if both active, or just above dino
        const offsetY = powerUpTimerRef.current > 0 ? 30 : 15;
        const barX = dino.x + (dino.w - barW)/2;
        const barY = dino.y - offsetY;
        
        // Background
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(barX, barY, barW, barH);
        
        // Fill
        ctx.fillStyle = '#a855f7'; // Purple
        ctx.fillRect(barX, barY, barW * drawPct, barH);
        
        // Text
        ctx.fillStyle = '#d8b4fe';
        ctx.font = 'bold 10px monospace';
        ctx.textAlign = 'center';
        ctx.fillText("GIANT MODE!", dino.x + dino.w/2, barY - 5);
    }

    // 3. Score
    // Adjust score color for contrast
    ctx.fillStyle = dayCycleTimerRef.current < CYCLE_SUNSET_START ? '#334155' : '#e2e8f0';
    ctx.font = 'bold 20px monospace';
    ctx.textAlign = 'right';
    const scoreStr = Math.floor(scoreRef.current).toString().padStart(5, '0');
    const hiScoreStr = highScoreRef.current.toString().padStart(5, '0');
    ctx.fillText(`HI ${hiScoreStr}  ${scoreStr}`, canvas.width - 20, 30);

    requestRef.current = requestAnimationFrame(loop);
  }, [gameState, onGameOver, setGameState]);

  // Restart loop if unpaused
  useEffect(() => {
    if (gameState === GameState.PLAYING) {
        requestRef.current = requestAnimationFrame(loop);
    }
    return () => {
        if (requestRef.current) cancelAnimationFrame(requestRef.current);
    }
  }, [gameState, loop]);

  return (
    <canvas
      ref={canvasRef}
      width={800}
      height={400}
      className="block w-full h-full touch-none select-none"
    />
  );
};
