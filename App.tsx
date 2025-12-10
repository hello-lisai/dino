
import React, { useState } from 'react';
import { GameRunner } from './components/GameRunner';
import { GameState } from './types';
import { Play, RotateCcw, Zap, Pause } from 'lucide-react';

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>(GameState.START);
  const [lastScore, setLastScore] = useState(0);

  const handleGameOver = (score: number) => {
    setLastScore(score);
  };

  const handleStart = () => {
    setGameState(GameState.PLAYING);
  };
  
  const togglePause = () => {
    if (gameState === GameState.PLAYING) {
        setGameState(GameState.PAUSED);
    } else if (gameState === GameState.PAUSED) {
        setGameState(GameState.PLAYING);
    }
  }

  return (
    <div className="w-full fixed inset-0 bg-slate-950 flex flex-col items-center justify-start pt-[15vh] sm:justify-center sm:pt-0 p-4 select-none touch-none">
      
      {/* 
        Game Container:
        - Fixed Aspect Ratio (2/1).
        - Width Constraints:
          1. 100% of container (fits mobile portrait width)
          2. 140vh (Ensure height doesn't exceed 70vh [140*0.5] to fit landscape browsers with bars)
          3. 56rem (Max desktop width)
      */}
      <div 
        className="relative aspect-[2/1] bg-slate-900 rounded-xl overflow-hidden shadow-2xl border-2 sm:border-4 border-slate-700 mx-auto"
        style={{
          width: 'min(100%, 140vh, 56rem)'
        }}
      >
        
        <GameRunner 
          gameState={gameState} 
          setGameState={setGameState} 
          onGameOver={handleGameOver} 
        />

        {/* Pause Button - Top Center to avoid blocking score */}
        {(gameState === GameState.PLAYING || gameState === GameState.PAUSED) && (
            <button 
              onClick={togglePause}
              className="absolute top-2 left-1/2 -translate-x-1/2 z-30 w-8 h-8 flex items-center justify-center text-slate-500 hover:text-white transition-colors bg-black/20 hover:bg-black/50 rounded-full backdrop-blur-sm"
            >
              {gameState === GameState.PAUSED ? <Play className="w-4 h-4 fill-current" /> : <Pause className="w-4 h-4 fill-current" />}
            </button>
        )}

        {/* Pause Overlay */}
        {gameState === GameState.PAUSED && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-900/60 backdrop-blur-[2px] z-20">
             <div className="bg-slate-800 p-4 sm:p-8 rounded-xl shadow-2xl text-center border border-slate-700">
                 <h2 className="text-xl sm:text-2xl font-bold text-white mb-4">PAUSED</h2>
                 <button 
                   onClick={togglePause}
                   className="px-6 py-2 bg-sky-500 hover:bg-sky-400 text-white rounded-lg font-bold flex items-center gap-2 mx-auto text-sm sm:text-base transition-transform active:scale-95"
                 >
                   <Play className="w-4 h-4 fill-current" />
                   RESUME
                 </button>
             </div>
          </div>
        )}

        {/* Start Screen - Highly Compact */}
        {gameState === GameState.START && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/85 backdrop-blur-sm z-20 p-2">
            <div className="text-center w-full max-w-md mx-auto flex flex-col items-center">
              
              <div className="flex items-center justify-center gap-2 mb-2">
                <div className="p-2 bg-slate-800 rounded-full shadow-lg shadow-sky-500/20">
                   <Zap className="w-6 h-6 sm:w-10 sm:h-10 text-sky-400" />
                </div>
                <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white drop-shadow-[0_0_15px_rgba(56,189,248,0.5)]">
                  NEON DINO
                </h1>
              </div>

              {/* Instructions Row */}
              <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 text-[10px] sm:text-xs text-slate-400 mb-6 bg-slate-950/50 px-4 py-2 rounded-full border border-slate-800">
                  <span className="flex items-center gap-1"><span className="text-sky-400 font-bold">Tap</span> Jump</span>
                  <span className="flex items-center gap-1"><span className="text-blue-400">★</span> Boost</span>
                  <span className="flex items-center gap-1"><span className="text-purple-400">●</span> Giant</span>
              </div>

              <button
                onClick={handleStart}
                className="group relative px-10 py-3 bg-sky-500 hover:bg-sky-400 text-white font-bold text-lg rounded-xl transition-all hover:scale-105 active:scale-95 shadow-[0_0_20px_rgba(14,165,233,0.4)] flex items-center justify-center gap-2"
              >
                <Play className="w-5 h-5 fill-current" />
                PLAY
              </button>
            </div>
          </div>
        )}

        {/* Game Over Screen - Reorganized for vertical constraint */}
        {gameState === GameState.GAME_OVER && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/90 backdrop-blur-md z-20 p-2 animate-in fade-in duration-300">
             <div className="text-center w-full mx-auto flex flex-col items-center justify-center h-full gap-2 sm:gap-6">
                <h2 className="text-2xl sm:text-5xl font-black text-rose-500 tracking-wider drop-shadow-[0_0_10px_rgba(244,63,94,0.5)]">
                  CRASHED
                </h2>

              <div className="bg-slate-900/80 px-6 py-2 sm:p-4 rounded-xl border border-slate-800 flex flex-col items-center">
                <p className="text-[10px] sm:text-xs text-slate-500 uppercase tracking-widest mb-0 sm:mb-1">Time Survived</p>
                <p className="text-2xl sm:text-5xl font-mono font-bold text-white">{lastScore}s</p>
              </div>

              <div>
                <button
                    onClick={handleStart}
                    className="px-6 py-2 sm:px-8 sm:py-3 bg-white text-slate-900 hover:bg-slate-200 font-bold text-sm sm:text-lg rounded-xl transition-all hover:scale-105 active:scale-95 flex items-center justify-center gap-2 mx-auto shadow-lg"
                >
                    <RotateCcw className="w-4 h-4 sm:w-5 sm:h-5" />
                    TRY AGAIN
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default App;
