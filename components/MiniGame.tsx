
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, Trophy, Play, RotateCcw } from 'lucide-react';
import { Button } from './Button';

interface MiniGameProps {
  isOpen: boolean;
  onClose: () => void;
  groupName?: string;
}

// Config Constants
const GRAVITY = 0.6;
const JUMP_FORCE = 12;
const GAME_SPEED = 6;
const OBSTACLE_INTERVAL_MIN = 60; // frames
const OBSTACLE_INTERVAL_MAX = 120; // frames
const WIN_DISTANCE = 2500; // pixels

interface Obstacle {
  id: number;
  x: number;
  type: 'man' | 'woman';
}

export const MiniGame: React.FC<MiniGameProps> = ({ isOpen, onClose, groupName = "Mon Équipe" }) => {
  const [gameState, setGameState] = useState<'start' | 'playing' | 'gameover' | 'won'>('start');
  const [displayDistance, setDisplayDistance] = useState(0);

  // Refs for Game Loop Mutable State
  const containerRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<number>(0);
  const playerY = useRef(0); // 0 is ground
  const playerVelocity = useRef(0);
  const isJumping = useRef(false);
  const distance = useRef(0);
  
  const obstacles = useRef<Obstacle[]>([]);
  const nextSpawnTimer = useRef(0);
  const nextObstacleType = useRef<'man' | 'woman'>('man');
  
  const buildingX = useRef<number | null>(null); // Null if not spawned yet
  const playerType = useRef<'man' | 'woman'>('man'); // Randomized player

  // Reset Game
  const resetGame = useCallback(() => {
    setGameState('start');
    setDisplayDistance(0);
    playerY.current = 0;
    playerVelocity.current = 0;
    isJumping.current = false;
    distance.current = 0;
    obstacles.current = [];
    nextSpawnTimer.current = 0;
    buildingX.current = null;
    playerType.current = Math.random() > 0.5 ? 'man' : 'woman';
    nextObstacleType.current = 'man';
  }, []);

  // Initialize randomized player on open
  useEffect(() => {
    if (isOpen) resetGame();
  }, [isOpen, resetGame]);

  const startGame = () => {
    resetGame();
    setGameState('playing');
  };

  const jump = useCallback(() => {
    if (gameState !== 'playing') return;
    if (!isJumping.current) {
      playerVelocity.current = JUMP_FORCE;
      isJumping.current = true;
    }
  }, [gameState]);

  // Main Game Loop
  const loop = useCallback(() => {
    if (gameState !== 'playing') return;

    // 1. Update Physics
    playerVelocity.current -= GRAVITY;
    playerY.current += playerVelocity.current;

    // Floor collision
    if (playerY.current <= 0) {
      playerY.current = 0;
      playerVelocity.current = 0;
      isJumping.current = false;
    }

    // 2. Move World (Obstacles & Distance)
    distance.current += GAME_SPEED;
    
    // Update Score UI every 10 frames to save renders
    if (distance.current % 60 === 0) {
        setDisplayDistance(Math.floor(distance.current / 10));
    }

    // 3. Spawning Obstacles
    if (distance.current < WIN_DISTANCE) {
        if (nextSpawnTimer.current <= 0) {
            obstacles.current.push({
                id: Date.now(),
                x: 800, // Spawn off-screen right (assuming container max 800 width logic)
                type: nextObstacleType.current
            });
            // Toggle next type
            nextObstacleType.current = nextObstacleType.current === 'man' ? 'woman' : 'man';
            // Reset timer
            nextSpawnTimer.current = Math.floor(Math.random() * (OBSTACLE_INTERVAL_MAX - OBSTACLE_INTERVAL_MIN + 1) + OBSTACLE_INTERVAL_MIN);
        }
        nextSpawnTimer.current--;
    } else if (buildingX.current === null) {
        // Spawn Building
        buildingX.current = 800; 
    }

    // 4. Move Entities & Check Collisions
    // Player Hitbox (approx): x: 50, w: 40, y: playerY, h: 40
    const pRect = { l: 50, r: 90, t: playerY.current + 40, b: playerY.current };

    // Move Obstacles
    obstacles.current.forEach(obs => obs.x -= GAME_SPEED);
    // Remove off-screen
    obstacles.current = obstacles.current.filter(obs => obs.x > -100);

    // Collision Check
    for (const obs of obstacles.current) {
        // Obstacle Hitbox (approx): x: obs.x, w: 30, y: 0, h: 40
        const oRect = { l: obs.x + 10, r: obs.x + 40, t: 40, b: 0 }; // +10 padding for visual accuracy

        if (
            pRect.r > oRect.l &&
            pRect.l < oRect.r &&
            pRect.b < oRect.t
        ) {
            setGameState('gameover');
            return; // Stop loop
        }
    }

    // Move Building
    if (buildingX.current !== null) {
        buildingX.current -= GAME_SPEED;
        
        // Win Condition: Building reaches player (approx x=50)
        if (buildingX.current <= 100) {
            setGameState('won');
            return;
        }
    }

    // 5. Render Request
    // We force a re-render for React to update the DOM positions
    // Optimization: In a heavy game we'd use Canvas or direct DOM manipulation refs, 
    // but for this simple runner, react state update on frame is "okay" if simple enough, 
    // OR better: we use the Ref to update DOM directly for performance without React render cycle.
    // Let's use React render for simplicity first, if laggy we optimize.
    // Actually, forcing React render 60fps might be heavy on mobile. 
    // Let's use a "dummy" state to trigger render or just rely on the fact that we need to render obstacles.
    // To ensure 60fps smoothness on mobile, updating style directly is better.
    
    if (containerRef.current) {
       // Direct DOM manipulation for Player
       const playerEl = containerRef.current.querySelector('#player') as HTMLElement;
       if (playerEl) playerEl.style.bottom = `${playerY.current + 24}px`; // +24 for ground offset

       // Direct DOM manipulation for Obstacles
       obstacles.current.forEach(obs => {
          let el = containerRef.current?.querySelector(`#obs-${obs.id}`) as HTMLElement;
          // If element doesn't exist yet (react hasn't rendered it), we might miss a frame of movement visual, 
          // but React will render it next cycle.
          // To keep it simple in this architecture: We will force a re-render.
       });
       // Direct DOM for Building
       if (buildingX.current !== null) {
          const buildEl = containerRef.current.querySelector('#building') as HTMLElement;
          if (buildEl) buildEl.style.left = `${buildingX.current}px`;
       }
    }

    // For this simple example, we WILL trigger a react render to handle the array of obstacles appearing/disappearing cleanly
    // But to save resources, we only trigger it if we really need to add/remove DOM nodes.
    // However, updating X positions needs render. 
    // Let's try the "forceUpdate" approach via setDisplayDistance used as a tick, 
    // but we need high freq.
    // Let's just set a dummy state to force render.
    setFrame(f => f + 1);

    frameRef.current = requestAnimationFrame(loop);
  }, [gameState]);

  const [, setFrame] = useState(0);

  useEffect(() => {
    if (gameState === 'playing') {
        frameRef.current = requestAnimationFrame(loop);
    }
    return () => cancelAnimationFrame(frameRef.current);
  }, [gameState, loop]);

  // Controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        if (e.code === 'Space' || e.code === 'ArrowUp') {
            e.preventDefault(); // Prevent scrolling
            if (gameState === 'playing') jump();
            else if (gameState !== 'playing') startGame();
        }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState, jump]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex flex-col items-center justify-center p-4 backdrop-blur-sm touch-none">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full relative overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-gray-100 bg-gray-50">
            <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                <Trophy className="w-5 h-5 text-yellow-500" />
                Run to MIRA
            </h2>
            <button 
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 transition-colors p-1"
            >
                <X className="w-6 h-6" />
            </button>
        </div>

        {/* Game Area */}
        <div 
            ref={containerRef}
            className="relative w-full h-64 bg-blue-50 overflow-hidden cursor-pointer select-none"
            onClick={(e) => {
                // Prevent click propagation if clicking UI buttons overlay
                if ((e.target as HTMLElement).closest('button')) return;
                if (gameState === 'playing') jump();
            }}
            onTouchStart={(e) => {
                 if ((e.target as HTMLElement).closest('button')) return;
                 if (gameState === 'playing') jump();
            }}
        >
            {/* Background Decor (Clouds) */}
            <div className="absolute top-8 left-10 text-4xl opacity-50 animate-pulse">☁️</div>
            <div className="absolute top-16 right-20 text-5xl opacity-30">☁️</div>

            {/* Ground */}
            <div className="absolute bottom-0 w-full h-6 bg-amber-200 border-t-4 border-amber-300"></div>

            {/* Building (Target) */}
            {buildingX.current !== null && (
                <div 
                    id="building"
                    className="absolute bottom-6 flex flex-col items-center transition-none"
                    style={{ left: buildingX.current }}
                >
                     <div className="bg-indigo-600 text-white text-xs px-2 py-1 rounded mb-1 whitespace-nowrap shadow-md font-bold">
                        {groupName}
                     </div>
                     <span className="text-8xl leading-none filter drop-shadow-lg">🏢</span>
                </div>
            )}

            {/* Obstacles */}
            {obstacles.current.map(obs => (
                <div
                    key={obs.id}
                    id={`obs-${obs.id}`}
                    className="absolute bottom-6 text-4xl leading-none transition-none"
                    style={{ left: obs.x }}
                >
                    {obs.type === 'man' ? '👨‍🏫' : '👩‍🏫'}
                </div>
            ))}

            {/* Player */}
            <div 
                id="player"
                className="absolute left-[50px] text-5xl leading-none transition-none z-10"
                style={{ bottom: playerY.current + 24 }} // +24 to sit on ground
            >
                {playerType.current === 'man' ? '🏄‍♂️' : '🏄‍♀️'}
            </div>

            {/* UI Overlays */}
            {gameState === 'start' && (
                <div className="absolute inset-0 bg-black/20 flex flex-col items-center justify-center backdrop-blur-[1px]">
                     <div className="bg-white p-6 rounded-xl shadow-xl text-center">
                         <h3 className="text-2xl font-bold mb-2">Prêt à surfer ?</h3>
                         <p className="text-gray-600 mb-6">Évite les profs pour rejoindre ton équipe !</p>
                         <p className="text-xs text-gray-400 mb-4 hidden sm:block">Espace ou Clic pour sauter</p>
                         <Button size="lg" onClick={startGame} className="animate-bounce">
                             <Play className="w-5 h-5 mr-2" />
                             C'est parti !
                         </Button>
                     </div>
                </div>
            )}

            {gameState === 'gameover' && (
                <div className="absolute inset-0 bg-red-900/20 flex flex-col items-center justify-center backdrop-blur-[2px]">
                     <div className="bg-white p-6 rounded-xl shadow-xl text-center border-2 border-red-100">
                         <div className="text-4xl mb-2">💥</div>
                         <h3 className="text-xl font-bold text-red-600 mb-2">Aïe ! Un prof !</h3>
                         <p className="text-gray-500 mb-6 text-sm">Tu n'as pas atteint le QG.</p>
                         <Button onClick={startGame} variant="primary">
                             <RotateCcw className="w-4 h-4 mr-2" />
                             Réessayer
                         </Button>
                     </div>
                </div>
            )}

            {gameState === 'won' && (
                <div className="absolute inset-0 bg-green-900/20 flex flex-col items-center justify-center backdrop-blur-[2px]">
                     <div className="bg-white p-8 rounded-xl shadow-2xl text-center border-4 border-indigo-100 transform scale-110">
                         <div className="text-5xl mb-4 animate-bounce">🎉</div>
                         <h3 className="text-2xl font-bold text-indigo-900 mb-1">Bienvenue chez</h3>
                         <h2 className="text-3xl font-extrabold text-indigo-600 mb-6">{groupName}</h2>
                         <Button onClick={onClose} variant="secondary">
                             Fermer
                         </Button>
                     </div>
                </div>
            )}
            
            {/* Score / Distance */}
            <div className="absolute top-4 right-4 bg-white/80 px-3 py-1 rounded-full text-sm font-mono font-bold text-gray-600 shadow-sm border border-gray-200">
                {displayDistance}m
            </div>
        </div>

        {/* Mobile Helper Text */}
        <div className="p-3 bg-gray-50 text-center text-xs text-gray-400 sm:hidden">
            Tape sur l'écran pour sauter
        </div>
      </div>
    </div>
  );
};
