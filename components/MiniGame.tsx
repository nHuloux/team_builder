
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, Trophy, Play, RotateCcw, Zap, Brain, Rocket, Coffee, Bug } from 'lucide-react';
import { Button } from './Button';

interface MiniGameProps {
  isOpen: boolean;
  onClose: () => void;
  groupName?: string;
}

type GameType = 'runner' | 'catcher' | 'memory';

// --- SHARED COMPONENTS ---

const WinScreen: React.FC<{ groupName: string; onClose: () => void }> = ({ groupName, onClose }) => (
    <div className="absolute inset-0 bg-green-900/90 flex flex-col items-center justify-center backdrop-blur-sm z-50 animate-in fade-in duration-300">
        <div className="bg-white p-8 rounded-xl shadow-2xl text-center border-4 border-indigo-100 transform scale-110">
            <div className="text-6xl mb-4 animate-bounce">🎉</div>
            <h3 className="text-2xl font-bold text-indigo-900 mb-1">Bienvenue chez</h3>
            <h2 className="text-3xl font-extrabold text-indigo-600 mb-6">{groupName}</h2>
            <Button onClick={onClose} variant="secondary">
                Fermer
            </Button>
        </div>
    </div>
);

const GameOverScreen: React.FC<{ message: string; onRetry: () => void }> = ({ message, onRetry }) => (
    <div className="absolute inset-0 bg-red-900/80 flex flex-col items-center justify-center backdrop-blur-sm z-50">
        <div className="bg-white p-6 rounded-xl shadow-xl text-center border-2 border-red-100">
            <div className="text-4xl mb-2">💥</div>
            <h3 className="text-xl font-bold text-red-600 mb-2">Perdu !</h3>
            <p className="text-gray-500 mb-6 text-sm">{message}</p>
            <Button onClick={onRetry} variant="primary">
                <RotateCcw className="w-4 h-4 mr-2" />
                Réessayer
            </Button>
        </div>
    </div>
);

// --- GAME 1: RUNNER (Surfer vs Profs) ---
const RunnerGame: React.FC<{ onWin: () => void; onLose: () => void }> = ({ onWin, onLose }) => {
    // Config
    const GRAVITY = 0.6;
    const JUMP_FORCE = 12;
    const GAME_SPEED = 6;
    
    // State
    const [gameState, setGameState] = useState<'start' | 'playing'>('start');
    const [score, setScore] = useState(0);
    const containerRef = useRef<HTMLDivElement>(null);
    const frameRef = useRef<number>(0);
    
    // Mutable Game State
    const playerY = useRef(0);
    const playerVelocity = useRef(0);
    const isJumping = useRef(false);
    const distance = useRef(0);
    const obstacles = useRef<{id: number, x: number, type: string}[]>([]);
    const nextSpawnTimer = useRef(0);
    const playerType = useRef(Math.random() > 0.5 ? 'man' : 'woman');

    const reset = useCallback(() => {
        playerY.current = 0;
        playerVelocity.current = 0;
        isJumping.current = false;
        distance.current = 0;
        obstacles.current = [];
        nextSpawnTimer.current = 0;
        setScore(0);
        setGameState('start');
    }, []);

    const jump = useCallback(() => {
        if (!isJumping.current) {
            playerVelocity.current = JUMP_FORCE;
            isJumping.current = true;
        }
    }, []);

    const loop = useCallback(() => {
        // Physics
        playerVelocity.current -= GRAVITY;
        playerY.current += playerVelocity.current;
        if (playerY.current <= 0) {
            playerY.current = 0;
            playerVelocity.current = 0;
            isJumping.current = false;
        }

        // World Move
        distance.current += GAME_SPEED;
        if (distance.current % 10 === 0) setScore(Math.floor(distance.current / 10));

        // Spawn
        if (nextSpawnTimer.current <= 0) {
            obstacles.current.push({
                id: Date.now(),
                x: 800,
                type: Math.random() > 0.5 ? 'man' : 'woman'
            });
            nextSpawnTimer.current = Math.random() * 60 + 60;
        }
        nextSpawnTimer.current--;

        // Move Obstacles & Collision
        const pRect = { l: 50, r: 90, t: playerY.current + 40, b: playerY.current };
        obstacles.current.forEach(obs => obs.x -= GAME_SPEED);
        obstacles.current = obstacles.current.filter(obs => obs.x > -100);

        for (const obs of obstacles.current) {
            const oRect = { l: obs.x + 10, r: obs.x + 40, t: 40, b: 0 };
            if (pRect.r > oRect.l && pRect.l < oRect.r && pRect.b < oRect.t) {
                onLose();
                return;
            }
        }

        // Win Condition
        if (distance.current > 1500) { // Win at 1500m
            onWin();
            return;
        }

        // Render (Direct DOM)
        if (containerRef.current) {
            const playerEl = containerRef.current.querySelector('#player') as HTMLElement;
            if (playerEl) playerEl.style.bottom = `${playerY.current + 24}px`;
            
            // Force React render for obstacles occasionally or use dummy state?
            // For smoothness we let React handle obstacle list changes, which triggers re-render
        }

        frameRef.current = requestAnimationFrame(loop);
    }, [onWin, onLose]);

    // Loop trigger (using a dummy state to re-render obstacle positions is costly, so we just rely on the ref for data and let react render what it can)
    // To make obstacles move smoothly in React without 60fps re-renders, we use inline styles on the list map.
    // We need a re-render to update the 'obstacles' array in the DOM.
    const [, setTick] = useState(0);
    useEffect(() => {
        if (gameState === 'playing') {
            const i = setInterval(() => setTick(t => t + 1), 50); // 20fps react render for obstacles is enough if CSS transition is off or handled
            frameRef.current = requestAnimationFrame(loop);
            return () => {
                cancelAnimationFrame(frameRef.current);
                clearInterval(i);
            }
        }
    }, [gameState, loop]);

    return (
        <div className="relative w-full h-64 bg-blue-50 overflow-hidden cursor-pointer select-none"
             onClick={() => gameState === 'start' ? setGameState('playing') : jump()}
             ref={containerRef}>
            
            {/* Background */}
            <div className="absolute top-8 left-10 text-4xl opacity-50">☁️</div>
            <div className="absolute bottom-0 w-full h-6 bg-amber-200 border-t-4 border-amber-300"></div>
            
            {/* Player */}
            <div id="player" className="absolute left-[50px] text-5xl leading-none z-10" style={{ bottom: 24 }}>
                {playerType.current === 'man' ? '🏄‍♂️' : '🏄‍♀️'}
            </div>

            {/* Obstacles */}
            {obstacles.current.map(obs => (
                <div key={obs.id} className="absolute bottom-6 text-4xl leading-none" style={{ left: obs.x }}>
                    {obs.type === 'man' ? '👨‍🏫' : '👩‍🏫'}
                </div>
            ))}

            {/* UI */}
            <div className="absolute top-4 right-4 font-bold text-gray-500">{score}m</div>
            
            {gameState === 'start' && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/20 backdrop-blur-[1px]">
                     <div className="bg-white px-6 py-4 rounded-xl shadow-lg animate-bounce cursor-pointer">
                        <Play className="inline-block mr-2 w-5 h-5"/>
                        Clique pour surfer !
                     </div>
                </div>
            )}
        </div>
    );
};

// --- GAME 2: CATCHER (Projet Rush) ---
const CatcherGame: React.FC<{ onWin: () => void; onLose: () => void }> = ({ onWin, onLose }) => {
    const [gameState, setGameState] = useState<'start' | 'playing'>('start');
    const [score, setScore] = useState(0);
    const [playerX, setPlayerX] = useState(50); // Percentage
    
    const itemsRef = useRef<{id: number, x: number, y: number, type: 'good' | 'bad', icon: string}[]>([]);
    const frameRef = useRef<number>(0);
    const lastSpawn = useRef<number>(0);

    const ICONS = {
        good: ['🍕', '☕', '💻', '💡', '🚀'],
        bad: ['🐛', '📉', '❌']
    };

    const loop = useCallback((time: number) => {
        if (time - lastSpawn.current > 800) { // Spawn every 800ms
            const isGood = Math.random() > 0.3; // 70% good items
            const type = isGood ? 'good' : 'bad';
            const icon = ICONS[type][Math.floor(Math.random() * ICONS[type].length)];
            itemsRef.current.push({
                id: Date.now(),
                x: Math.random() * 90, // 0-90%
                y: -10,
                type,
                icon
            });
            lastSpawn.current = time;
        }

        // Move items
        itemsRef.current.forEach(item => item.y += 0.8); // Speed

        // Collision & Cleanup
        const playerRect = { l: playerX - 10, r: playerX + 10, t: 90, b: 100 }; // hitbox at bottom approx
        
        // Filter out caught or lost items
        const nextItems: typeof itemsRef.current = [];
        let scoreDelta = 0;
        let lost = false;

        itemsRef.current.forEach(item => {
            let kept = true;
            // Collision
            if (item.y > 85 && item.y < 95 && Math.abs(item.x - playerX) < 10) {
                if (item.type === 'good') {
                    scoreDelta += 10;
                } else {
                    lost = true;
                }
                kept = false; // Caught
            } else if (item.y > 100) {
                kept = false; // Missed
            }

            if (kept) nextItems.push(item);
        });

        itemsRef.current = nextItems;
        
        if (lost) {
            onLose();
            return;
        }

        if (scoreDelta > 0) {
            setScore(s => {
                const newScore = s + scoreDelta;
                if (newScore >= 100) {
                    onWin();
                    return newScore;
                }
                return newScore;
            });
        }

        if (score < 100) { // Double check to stop loop if won inside setter
             frameRef.current = requestAnimationFrame(loop);
             // Force render
             setTick(t => t + 1);
        }
    }, [playerX, score, onWin, onLose]);

    const [, setTick] = useState(0);

    useEffect(() => {
        if (gameState === 'playing') {
            frameRef.current = requestAnimationFrame(loop);
            return () => cancelAnimationFrame(frameRef.current);
        }
    }, [gameState, loop]);

    const handleMove = (e: React.MouseEvent | React.TouchEvent) => {
        if (gameState !== 'playing') return;
        const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
        const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
        const x = ((clientX - rect.left) / rect.width) * 100;
        setPlayerX(Math.max(5, Math.min(95, x)));
    };

    return (
        <div className="relative w-full h-64 bg-gray-900 overflow-hidden cursor-crosshair touch-none"
             onMouseMove={handleMove}
             onTouchMove={handleMove}
             onClick={() => gameState === 'start' && setGameState('playing')}>
            
            {/* Items */}
            {itemsRef.current.map(item => (
                <div key={item.id} className="absolute text-2xl" style={{ left: `${item.x}%`, top: `${item.y}%` }}>
                    {item.icon}
                </div>
            ))}

            {/* Player */}
            <div className="absolute bottom-0 text-4xl transition-all duration-75 ease-linear" 
                 style={{ left: `${playerX}%`, transform: 'translateX(-50%)' }}>
                 🗑️
            </div>

            {/* Score Bar */}
            <div className="absolute top-0 left-0 w-full h-2 bg-gray-800">
                <div className="h-full bg-green-500 transition-all duration-300" style={{ width: `${Math.min(100, score)}%` }} />
            </div>

            {gameState === 'start' && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 text-white p-4 text-center">
                    <h3 className="text-xl font-bold mb-2">Projet Rush</h3>
                    <p className="text-sm text-gray-300 mb-4">Attrape les bonus (🍕☕), évite les bugs (🐛) !</p>
                    <Button onClick={() => setGameState('playing')}>Start</Button>
                </div>
            )}
        </div>
    );
};

// --- GAME 3: MEMORY (Team Match) ---
const MemoryGame: React.FC<{ onWin: () => void }> = ({ onWin }) => {
    const ICONS = ['🚀', '🧠', '💻', '🎨', '🍕', '☕'];
    const [cards, setCards] = useState<{id: number, icon: string, flipped: boolean, matched: boolean}[]>([]);
    const [flippedIndices, setFlippedIndices] = useState<number[]>([]);
    const [matches, setMatches] = useState(0);
    const [isLocked, setIsLocked] = useState(false);

    useEffect(() => {
        // Init Game
        const deck = [...ICONS, ...ICONS]
            .sort(() => Math.random() - 0.5)
            .map((icon, i) => ({ id: i, icon, flipped: false, matched: false }));
        setCards(deck);
    }, []);

    useEffect(() => {
        if (matches === ICONS.length && matches > 0) {
            setTimeout(onWin, 500);
        }
    }, [matches, onWin]);

    const handleCardClick = (index: number) => {
        if (isLocked || cards[index].flipped || cards[index].matched) return;

        const newCards = [...cards];
        newCards[index].flipped = true;
        setCards(newCards);

        const newFlipped = [...flippedIndices, index];
        setFlippedIndices(newFlipped);

        if (newFlipped.length === 2) {
            setIsLocked(true);
            const [first, second] = newFlipped;
            if (cards[first].icon === cards[second].icon) {
                // Match
                setTimeout(() => {
                    setCards(prev => prev.map((c, i) => 
                        i === first || i === second ? { ...c, matched: true } : c
                    ));
                    setFlippedIndices([]);
                    setMatches(m => m + 1);
                    setIsLocked(false);
                }, 500);
            } else {
                // No Match
                setTimeout(() => {
                    setCards(prev => prev.map((c, i) => 
                        i === first || i === second ? { ...c, flipped: false } : c
                    ));
                    setFlippedIndices([]);
                    setIsLocked(false);
                }, 1000);
            }
        }
    };

    return (
        <div className="w-full h-64 bg-indigo-50 p-4 flex items-center justify-center">
            <div className="grid grid-cols-4 gap-2 w-full max-w-sm h-full">
                {cards.map((card, i) => (
                    <div key={card.id} 
                         onClick={() => handleCardClick(i)}
                         className={`relative flex items-center justify-center text-2xl rounded-lg cursor-pointer transition-all duration-300 transform ${card.flipped || card.matched ? 'rotate-y-180 bg-white shadow-md' : 'bg-indigo-200 hover:bg-indigo-300'}`}>
                        {card.flipped || card.matched ? card.icon : '❓'}
                    </div>
                ))}
            </div>
        </div>
    );
};

// --- MAIN CONTAINER ---

export const MiniGame: React.FC<MiniGameProps> = ({ isOpen, onClose, groupName = "Mon Équipe" }) => {
  const [activeGame, setActiveGame] = useState<GameType | null>(null);
  const [showWin, setShowWin] = useState(false);
  const [showLose, setShowLose] = useState(false);
  const [loseMsg, setLoseMsg] = useState("");

  const pickRandomGame = useCallback(() => {
      const games: GameType[] = ['runner', 'catcher', 'memory'];
      const random = games[Math.floor(Math.random() * games.length)];
      setActiveGame(random);
      setShowWin(false);
      setShowLose(false);
  }, []);

  useEffect(() => {
      if (isOpen) {
          pickRandomGame();
      } else {
          setActiveGame(null); // Reset when closed
      }
  }, [isOpen, pickRandomGame]);

  const handleWin = () => {
      setShowWin(true);
  };

  const handleLose = (msg: string = "Try again!") => {
      setLoseMsg(msg);
      setShowLose(true);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex flex-col items-center justify-center p-4 backdrop-blur-sm touch-none">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full relative overflow-hidden flex flex-col min-h-[350px]">
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-gray-100 bg-gray-50">
            <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                <Trophy className="w-5 h-5 text-yellow-500" />
                {activeGame === 'runner' && "Run to MIRA"}
                {activeGame === 'catcher' && "Projet Rush"}
                {activeGame === 'memory' && "Team Memory"}
            </h2>
            <button 
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 transition-colors p-1"
            >
                <X className="w-6 h-6" />
            </button>
        </div>

        {/* Game Content */}
        <div className="flex-1 bg-gray-100 relative">
            {activeGame === 'runner' && <RunnerGame onWin={handleWin} onLose={() => handleLose("Un prof t'a attrapé !")} />}
            {activeGame === 'catcher' && <CatcherGame onWin={handleWin} onLose={() => handleLose("Trop de bugs dans le projet !")} />}
            {activeGame === 'memory' && <MemoryGame onWin={handleWin} />}
            
            {/* Overlays */}
            {showWin && <WinScreen groupName={groupName} onClose={onClose} />}
            {showLose && <GameOverScreen message={loseMsg} onRetry={() => { setShowLose(false); }} />}
        </div>
        
        {/* Footer Hint */}
        <div className="p-2 bg-gray-50 text-center text-xs text-gray-400">
            {activeGame === 'runner' && "Espace/Clic pour sauter"}
            {activeGame === 'catcher' && "Glisse pour bouger"}
            {activeGame === 'memory' && "Trouve les paires"}
        </div>
      </div>
    </div>
  );
};
