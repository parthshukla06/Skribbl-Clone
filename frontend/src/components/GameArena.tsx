import React, { useState } from 'react';
import { 
  Clock, 
  Paintbrush, 
  Crown, 
  LogOut, 
  Users, 
  Eye,
  CheckCircle2,
  Trophy,
} from 'lucide-react';
import { RoomState, DrawStroke, ChatMessage } from '../types/game';
import Canvas from './Canvas';
import DrawingToolbar from './DrawingToolbar';
import WordSelector from './WordSelector';
import ChatBox from './ChatBox';
import { AVATARS } from './Home';

interface GameArenaProps {
  room: RoomState;
  currentSocketId: string;
  onEmitStroke: (stroke: DrawStroke) => void;
  onEmitClear: () => void;
  onChooseWord: (word: string) => void;
  onLeaveRoom: () => void;
  incomingStroke: DrawStroke | null;
  clearTrigger: number;
  wordChoices: string[];
  turnEndReason: string | null;
  nextDrawerName: string | null;
  chatMessages: ChatMessage[];
  onSendGuess: (guess: string) => void;
  guessFeedback: { text: string; correct: boolean } | null;
  onPlayAgain: () => void;
}

export const GameArena: React.FC<GameArenaProps> = ({
  room,
  currentSocketId,
  onEmitStroke,
  onEmitClear,
  onChooseWord,
  onLeaveRoom,
  incomingStroke,
  clearTrigger,
  wordChoices,
  turnEndReason,
  nextDrawerName,
  chatMessages,
  onSendGuess,
  guessFeedback,
  onPlayAgain,
}) => {
  const [color, setColor] = useState<string>('#000000');
  const [brushSize, setBrushSize] = useState<number>(7);
  const [isEraser, setIsEraser] = useState<boolean>(false);

  const game = room.game;
  const isDrawer = game ? game.currentDrawerId === currentSocketId : false;
  const activeDrawerName = game ? game.currentDrawerName : 'Player';
  const timeLeft = game ? game.timeLeft : 60;
  const hasGuessed = game?.guessedPlayerIds?.includes(currentSocketId) || false;
  const isDrawingPhase = room.status === 'drawing';

  const getAvatarEmoji = (avatarId: string) => {
    const found = AVATARS.find((a) => a.id === avatarId);
    return found ? found.emoji : '🎨';
  };
  const leaderboard = room.players
    .map((player, index) => ({ player, index }))
    .sort((a, b) => b.player.score - a.player.score || a.index - b.index);
  const finalResults = room.finalResults || leaderboard.map(({ player }, index) => ({
    playerId: player.id,
    playerName: player.name,
    score: player.score,
    rank: index + 1,
  }));
  const winners = finalResults.filter((result) => result.rank === 1);

  return (
    <div className="w-full max-w-7xl mx-auto space-y-4">
      {room.status === 'game_over' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md">
          <div className="w-full max-w-xl rounded-3xl border border-amber-500/30 bg-slate-900 p-6 shadow-2xl sm:p-8">
            <div className="mb-6 text-center">
              <Trophy className="mx-auto mb-3 h-10 w-10 text-amber-400" />
              <h2 className="text-3xl font-black text-white">Final Results</h2>
              <p className="mt-2 text-sm text-amber-300">
                {winners.map((winner) => winner.playerName).join(' and ') || 'No winner'}
                {winners.length === 1 ? ' wins!' : ' tie for the win!'}
              </p>
            </div>
            <ol className="space-y-2">
              {finalResults.map((result) => (
                <li
                  key={result.playerId}
                  className={`flex items-center justify-between rounded-xl border px-4 py-3 ${
                    result.rank === 1
                      ? 'border-amber-400/70 bg-amber-950/40'
                      : 'border-slate-700 bg-slate-950/70'
                  }`}
                >
                  <span className={`font-semibold ${result.rank === 1 ? 'text-amber-100' : 'text-slate-100'}`}>
                    <span className="mr-3 text-amber-400">#{result.rank}</span>
                    {result.rank === 1 && <Trophy aria-label="Winner" className="mr-2 inline h-4 w-4 text-amber-400" />}
                    {result.playerName}
                  </span>
                  <span className={`font-mono font-bold ${result.rank === 1 ? 'text-amber-300' : 'text-indigo-300'}`}>{result.score} pts</span>
                </li>
              ))}
            </ol>
            {room.players.find((player) => player.id === currentSocketId)?.isHost ? (
              <button
                type="button"
                onClick={onPlayAgain}
                className="mt-6 w-full rounded-xl bg-indigo-600 px-5 py-3 font-bold text-white transition hover:bg-indigo-500"
              >
                Play Again
              </button>
            ) : (
              <p className="mt-6 text-center text-sm text-slate-400" role="status">
                Waiting for the host to start another game...
              </p>
            )}
          </div>
        </div>
      )}

      {/* Word Selection Modal Overlay */}
      {room.status === 'selecting_word' && (
        <WordSelector
          words={wordChoices}
          timeLeft={timeLeft}
          onSelectWord={onChooseWord}
          isDrawer={isDrawer}
          drawerName={activeDrawerName}
        />
      )}

      {/* Turn End Revealed Word Banner Overlay */}
      {room.status === 'turn_end' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in">
          <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-3xl p-6 sm:p-8 text-center shadow-2xl space-y-4">
            <div className="h-14 w-14 mx-auto rounded-2xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <Eye className="h-7 w-7" />
            </div>
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-1">
                {turnEndReason || 'Turn Finished'}
              </span>
              <span className="text-xs text-slate-400">The next turn is starting shortly.</span>
            </div>
            {nextDrawerName && (
              <p className="text-xs text-slate-400">
                Next up to draw: <strong className="text-white">{nextDrawerName}</strong>
              </p>
            )}
          </div>
        </div>
      )}

      {/* Top Header Dashboard */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 backdrop-blur-xl shadow-xl flex flex-wrap items-center justify-between gap-4">
        {/* Left: Round & Drawer info */}
        <div className="flex items-center gap-3">
          <div className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs font-bold text-slate-300">
            Round <span className="text-white font-mono">{game?.currentRound || 1}</span> / {game?.totalRounds || room.settings.rounds}
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-400">Drawer:</span>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 font-bold">
              <Paintbrush className="h-3 w-3 text-indigo-400" />
              <span>{isDrawer ? 'You' : activeDrawerName}</span>
            </div>
          </div>
        </div>

        {/* Center: Secret Word (Drawer) or Masked Word (Guesser) */}
        <div className="order-last sm:order-none w-full sm:w-auto flex items-center justify-center">
          {isDrawer ? (
            /* Drawer sees the revealed secret word */
            <div className="flex items-center gap-2.5 px-4 py-2 rounded-xl bg-indigo-950/60 border border-indigo-500/50 text-indigo-200 shadow-inner">
              <span className="text-xs text-indigo-400 font-semibold uppercase tracking-wider">Word to Draw:</span>
              <span className="font-mono font-black text-lg sm:text-xl uppercase tracking-widest text-white">
                {game?.secretWord || '...'}
              </span>
            </div>
          ) : (
            /* Guesser sees the masked word */
            <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-950/80 border border-slate-800 text-slate-200">
              <span className="font-mono font-black text-xl sm:text-2xl tracking-[0.35em] text-white">
                {game?.maskedWord || '_ _ _'}
              </span>
              <span className="text-[11px] text-slate-500 font-mono ml-2">
                ({game?.wordLength || 0} letters)
              </span>
            </div>
          )}
        </div>

        {/* Right: Authoritative 60s Timer & Leave Button */}
        <div className="flex items-center gap-3">
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border font-mono font-bold text-sm transition ${
            timeLeft <= 10 
              ? 'bg-rose-950/60 border-rose-600 text-rose-300 animate-pulse' 
              : timeLeft <= 20
              ? 'bg-amber-950/50 border-amber-600/70 text-amber-300'
              : 'bg-slate-950 border-slate-800 text-white'
          }`}>
            <Clock className="h-4 w-4" />
            <span>{timeLeft}s</span>
          </div>

          <button
            type="button"
            onClick={onLeaveRoom}
            title="Leave Match"
            className="p-2 rounded-xl bg-slate-800 hover:bg-rose-950/40 text-slate-400 hover:text-rose-300 border border-slate-700 hover:border-rose-800/60 transition cursor-pointer"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Main Game Arena 3-Column Workspace: Roster + Canvas + Chat */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* Left Column: Players Leaderboard / Roster (2.5 - 3 cols) */}
        <div className="lg:col-span-3 bg-slate-900/80 border border-slate-800 rounded-2xl p-4 backdrop-blur-xl shadow-xl space-y-3">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800 text-xs">
            <span className="font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5 text-indigo-400" />
              Leaderboard ({room.players.length})
            </span>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Total points</span>
          </div>

          <div className="space-y-2 max-h-[460px] overflow-y-auto pr-1">
            {leaderboard.map(({ player }) => {
              const isCurrent = player.id === currentSocketId;
              const isCurrentDrawer = player.id === game?.currentDrawerId;
              const playerHasGuessed = game?.guessedPlayerIds?.includes(player.id);

              return (
                <div
                  key={player.id}
                  className={`p-2.5 rounded-xl border flex items-center justify-between transition ${
                    isCurrentDrawer
                      ? 'bg-indigo-950/50 border-indigo-500/60 shadow-md shadow-indigo-500/10'
                      : playerHasGuessed
                      ? 'bg-emerald-950/30 border-emerald-600/40'
                      : isCurrent
                      ? 'bg-slate-950/80 border-slate-700/80'
                      : 'bg-slate-950/40 border-slate-800/60'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="h-8 w-8 rounded-lg bg-slate-800 flex items-center justify-center text-base shrink-0 border border-slate-700">
                      {getAvatarEmoji(player.avatar)}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1">
                        <span className="font-bold text-xs text-white truncate">
                          {player.name}
                        </span>
                        {isCurrent && (
                          <span className="text-[9px] font-bold px-1 rounded bg-indigo-500 text-white shrink-0">
                            YOU
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-400 block truncate">
                        {isCurrentDrawer 
                          ? '🎨 Drawing now' 
                          : playerHasGuessed 
                          ? '✅ Solved' 
                          : 'Guessing'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="mr-1 font-mono text-xs font-bold text-amber-300">{player.score}</span>
                    {playerHasGuessed && (
                      <span title="Guessed the word">
                        <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                      </span>
                    )}
                    {player.isHost && (
                      <span title="Host">
                        <Crown className="h-3.5 w-3.5 text-amber-400 fill-amber-400" />
                      </span>
                    )}
                    {isCurrentDrawer && (
                      <span className="h-2 w-2 rounded-full bg-indigo-400 animate-ping" />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Center Column: Canvas + Drawing Tools (6 cols) */}
        <div className="lg:col-span-6 space-y-3">
          {/* Responsive Canvas Component */}
          <Canvas
            isDrawer={isDrawer}
            color={color}
            brushSize={brushSize}
            isEraser={isEraser}
            drawHistory={room.drawHistory}
            onEmitStroke={onEmitStroke}
            incomingStroke={incomingStroke}
            clearTrigger={clearTrigger}
          />

          {/* Drawer Toolbar (Only accessible to active drawer) */}
          {isDrawer && (
            <DrawingToolbar
              color={color}
              setColor={setColor}
              brushSize={brushSize}
              setBrushSize={setBrushSize}
              isEraser={isEraser}
              setIsEraser={setIsEraser}
              onClearCanvas={onEmitClear}
            />
          )}
        </div>

        {/* Right Column: Live Chat & Guessing Box (3 cols) */}
        <div className="lg:col-span-3">
          <ChatBox
            messages={chatMessages}
            isDrawer={isDrawer}
            hasGuessed={hasGuessed}
            isDrawingPhase={isDrawingPhase}
            onSendGuess={onSendGuess}
            guessFeedback={guessFeedback}
          />
        </div>
      </div>
    </div>
  );
};

export default GameArena;
