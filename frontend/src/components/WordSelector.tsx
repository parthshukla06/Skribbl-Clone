import React from 'react';
import { Sparkles, Clock, Palette } from 'lucide-react';

interface WordSelectorProps {
  words: string[];
  timeLeft: number;
  onSelectWord: (word: string) => void;
  isDrawer: boolean;
  drawerName: string;
}

export const WordSelector: React.FC<WordSelectorProps> = ({
  words,
  timeLeft,
  onSelectWord,
  isDrawer,
  drawerName,
}) => {
  if (!isDrawer) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in">
        <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 text-center shadow-2xl space-y-4">
          <div className="h-16 w-16 mx-auto rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
            <Palette className="h-8 w-8 animate-pulse" />
          </div>
          <div>
            <span className="text-xs font-bold uppercase tracking-widest text-indigo-400 block mb-1">
              Word Selection Phase
            </span>
            <h3 className="text-xl sm:text-2xl font-black text-white">
              {drawerName} is choosing a word...
            </h3>
          </div>
          <p className="text-xs text-slate-400">
            Get your mind ready to guess! The drawing will begin shortly.
          </p>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-950 border border-slate-800 text-xs text-slate-400 font-mono">
            <Clock className="h-3.5 w-3.5 text-amber-400" />
            <span>Time remaining: {timeLeft}s</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in zoom-in-95">
      <div className="w-full max-w-lg bg-slate-900 border border-indigo-500/40 rounded-3xl p-6 sm:p-8 text-center shadow-2xl space-y-6 relative overflow-hidden">
        {/* Glowing backdrop accent */}
        <div className="absolute -top-20 -left-20 h-40 w-40 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -right-20 h-40 w-40 bg-fuchsia-500/20 rounded-full blur-3xl pointer-events-none" />

        <div className="relative">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-xs font-bold mb-3">
            <Sparkles className="h-3.5 w-3.5 text-indigo-400" />
            Your Turn to Draw!
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-white">
            Choose Your Word
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Pick one of the 3 words below before the timer runs out.
          </p>
        </div>

        {/* Word Options Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 relative">
          {words.map((word) => (
            <button
              key={word}
              type="button"
              onClick={() => onSelectWord(word)}
              className="p-4 sm:p-5 rounded-2xl bg-slate-950 border border-slate-800 hover:border-indigo-500/60 hover:bg-indigo-950/30 text-white font-bold text-base sm:text-lg capitalize transition transform hover:-translate-y-1 hover:shadow-xl hover:shadow-indigo-500/20 active:scale-95 cursor-pointer group"
            >
              <span className="block group-hover:text-indigo-300 transition">
                {word}
              </span>
              <span className="text-[10px] text-slate-500 font-normal uppercase tracking-wider block mt-1">
                {word.length} Letters
              </span>
            </button>
          ))}
        </div>

        {/* Selection Countdown Timer */}
        <div className="flex items-center justify-center gap-2 text-xs font-mono font-bold text-amber-400">
          <Clock className="h-4 w-4 animate-spin" />
          <span>Auto-selecting in {timeLeft} seconds</span>
        </div>
      </div>
    </div>
  );
};

export default WordSelector;
