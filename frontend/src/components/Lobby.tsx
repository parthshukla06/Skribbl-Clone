import React, { useState } from 'react';
import { 
  Crown, 
  Copy, 
  Check, 
  Share2, 
  LogOut, 
  Users, 
  Clock, 
  Repeat, 
  FileText, 
  ShieldCheck, 
  Play, 
  Sparkles,
  UserCheck
} from 'lucide-react';
import { RoomState } from '../types/game';
import { AVATARS } from './Home';

interface LobbyProps {
  room: RoomState;
  currentSocketId: string;
  onLeaveRoom: () => void;
  onStartGame: () => void;
}

export const Lobby: React.FC<LobbyProps> = ({
  room,
  currentSocketId,
  onLeaveRoom,
  onStartGame,
}) => {
  const [copiedCode, setCopiedCode] = useState<boolean>(false);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);

  const isHost = room.hostId === currentSocketId;
  const currentCount = room.players.length;
  const maxCapacity = room.settings.maxPlayers || 8;

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(room.code);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    } catch (err) {
      console.error('Failed to copy room code:', err);
    }
  };

  const handleCopyLink = async () => {
    try {
      const inviteUrl = `${window.location.origin}?room=${room.code}`;
      await navigator.clipboard.writeText(inviteUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } catch (err) {
      console.error('Failed to copy invite link:', err);
    }
  };

  // Helper to find emoji from avatar id
  const getAvatarEmoji = (avatarId: string) => {
    const found = AVATARS.find((a) => a.id === avatarId);
    return found ? found.emoji : '🎨';
  };

  // Generate placeholders for remaining empty slots up to maxCapacity
  const emptySlotsCount = Math.max(0, maxCapacity - currentCount);
  const emptySlots = Array.from({ length: emptySlotsCount });

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6">
      {/* Top Banner / Navigation */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900/80 border border-slate-800 rounded-2xl p-4 sm:p-6 backdrop-blur-xl shadow-xl">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-600/30 text-white font-black text-xl">
            {room.code.slice(0, 2)}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">
                Arena Room Code
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                Lobby Active
              </span>
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-2xl sm:text-3xl font-mono font-black tracking-widest text-white">
                {room.code}
              </span>
              <button
                id="copy-code-btn"
                type="button"
                onClick={handleCopyCode}
                title="Copy Room Code"
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer"
              >
                {copiedCode ? (
                  <Check className="h-4 w-4 text-emerald-400" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
          <button
            id="copy-invite-link-btn"
            type="button"
            onClick={handleCopyLink}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 text-xs font-bold transition cursor-pointer"
          >
            {copiedLink ? (
              <>
                <Check className="h-4 w-4 text-emerald-400" />
                <span>Link Copied!</span>
              </>
            ) : (
              <>
                <Share2 className="h-4 w-4" />
                <span>Copy Invite Link</span>
              </>
            )}
          </button>

          <button
            id="leave-room-btn"
            type="button"
            onClick={onLeaveRoom}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800/80 hover:bg-rose-950/40 text-slate-300 hover:text-rose-300 border border-slate-700 hover:border-rose-800/60 text-xs font-bold transition cursor-pointer"
          >
            <LogOut className="h-4 w-4" />
            <span>Leave Room</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Player Roster & Match Settings */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Players Roster (8 Columns) */}
        <div className="lg:col-span-8 bg-slate-900/80 border border-slate-800 rounded-2xl p-6 backdrop-blur-xl shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-6">
              <div className="flex items-center gap-2.5">
                <Users className="h-5 w-5 text-indigo-400" />
                <h2 className="font-bold text-white text-lg">Arena Players</h2>
              </div>
              <span className="text-xs font-mono font-bold px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/30">
                {currentCount} / {maxCapacity} Joined
              </span>
            </div>

            {/* Players Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {room.players.map((player) => {
                const isCurrent = player.id === currentSocketId;
                return (
                  <div
                    key={player.id}
                    className={`p-3.5 rounded-xl border flex items-center justify-between transition ${
                      isCurrent
                        ? 'bg-indigo-950/40 border-indigo-500/50 shadow-md shadow-indigo-500/10'
                        : 'bg-slate-950/60 border-slate-800/80'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-10 w-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-xl shrink-0">
                        {getAvatarEmoji(player.avatar)}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-sm text-white truncate">
                            {player.name}
                          </span>
                          {isCurrent && (
                            <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-indigo-500 text-white shrink-0">
                              YOU
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] text-slate-400 block truncate">
                          {player.isHost ? 'Room Organizer' : 'Challenger'}
                        </span>
                      </div>
                    </div>

                    {player.isHost && (
                      <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-300 border border-amber-500/30 text-[11px] font-bold shrink-0">
                        <Crown className="h-3.5 w-3.5 text-amber-400 fill-amber-400" />
                        <span>HOST</span>
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Empty Player Slots */}
              {emptySlots.map((_, index) => (
                <div
                  key={`empty-${index}`}
                  className="p-3.5 rounded-xl border border-dashed border-slate-800/80 bg-slate-950/20 flex items-center gap-3 opacity-60"
                >
                  <div className="h-10 w-10 rounded-xl bg-slate-900 border border-slate-800/80 flex items-center justify-center text-slate-600 text-sm">
                    {currentCount + index + 1}
                  </div>
                  <div>
                    <span className="text-xs font-medium text-slate-500 block">
                      Empty Slot
                    </span>
                    <span className="text-[11px] text-slate-600">
                      Waiting for player to join...
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Lobby Action Banner */}
          <div className="mt-8 pt-6 border-t border-slate-800">
            {isHost ? (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-xl bg-gradient-to-r from-indigo-950/40 via-purple-950/30 to-slate-950 border border-indigo-900/40">
                <div>
                  <div className="flex items-center gap-2">
                    <Crown className="h-4 w-4 text-amber-400" />
                    <span className="text-xs font-bold text-white uppercase tracking-wider">
                      You are the Room Host
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Invite more players with the code <strong className="text-indigo-300">{room.code}</strong>.
                  </p>
                </div>

                <button
                  id="btn-start-game"
                  type="button"
                  onClick={onStartGame}
                  disabled={currentCount < 2}
                  title={currentCount < 2 ? 'At least 2 players are required to start the game' : 'Start the game match'}
                  className={`w-full sm:w-auto px-6 py-3 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition shadow-lg ${
                    currentCount >= 2
                      ? 'bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 hover:from-emerald-400 hover:to-teal-500 text-white shadow-emerald-900/40 cursor-pointer active:scale-95'
                      : 'bg-slate-800 text-slate-500 border border-slate-700/60 cursor-not-allowed opacity-60'
                  }`}
                >
                  <Play className="h-4 w-4 fill-current" />
                  <span>{currentCount < 2 ? 'Need 2+ Players to Start' : 'Start Game'}</span>
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-between p-4 rounded-xl bg-slate-950/60 border border-slate-800/80">
                <div className="flex items-center gap-3">
                  <div className="h-3 w-3 rounded-full bg-amber-400 animate-ping" />
                  <div>
                    <span className="text-xs font-bold text-white block">
                      Waiting for host to initiate the match
                    </span>
                    <span className="text-[11px] text-slate-400">
                      The game will begin once the host starts the session.
                    </span>
                  </div>
                </div>
                <UserCheck className="h-5 w-5 text-slate-500" />
              </div>
            )}
          </div>
        </div>

        {/* Room Settings & Rules Panel (4 Columns) */}
        <div className="lg:col-span-4 bg-slate-900/80 border border-slate-800 rounded-2xl p-6 backdrop-blur-xl shadow-xl flex flex-col justify-between space-y-6">
          <div>
            <div className="flex items-center gap-2.5 pb-4 border-b border-slate-800 mb-5">
              <Sparkles className="h-5 w-5 text-violet-400" />
              <h3 className="font-bold text-white text-base">Match Parameters</h3>
            </div>

            <div className="space-y-3">
              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/70 flex items-center justify-between">
                <div className="flex items-center gap-2.5 text-xs text-slate-300">
                  <Repeat className="h-4 w-4 text-indigo-400" />
                  <span>Rounds</span>
                </div>
                <span className="font-mono text-xs font-bold text-white">
                  {room.settings.rounds} Rounds
                </span>
              </div>

              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/70 flex items-center justify-between">
                <div className="flex items-center gap-2.5 text-xs text-slate-300">
                  <Clock className="h-4 w-4 text-violet-400" />
                  <span>Draw Time</span>
                </div>
                <span className="font-mono text-xs font-bold text-white">
                  {room.settings.drawTime} Seconds
                </span>
              </div>

              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/70 flex items-center justify-between">
                <div className="flex items-center gap-2.5 text-xs text-slate-300">
                  <Users className="h-4 w-4 text-fuchsia-400" />
                  <span>Max Players</span>
                </div>
                <span className="font-mono text-xs font-bold text-white">
                  {room.settings.maxPlayers} Players
                </span>
              </div>

              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/70 flex items-center justify-between">
                <div className="flex items-center gap-2.5 text-xs text-slate-300">
                  <FileText className="h-4 w-4 text-cyan-400" />
                  <span>Word Choices</span>
                </div>
                <span className="font-mono text-xs font-bold text-white">
                  {room.settings.wordCount} Options
                </span>
              </div>

              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/70 flex items-center justify-between">
                <div className="flex items-center gap-2.5 text-xs text-slate-300">
                  <ShieldCheck className="h-4 w-4 text-emerald-400" />
                  <span>Room Visibility</span>
                </div>
                <span className="text-xs font-bold text-emerald-400">
                  {room.settings.isPrivate ? 'Private' : 'Public'}
                </span>
              </div>
            </div>
          </div>

          {/* Quick Share Tip */}
          <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800/80 text-xs text-slate-400 space-y-1.5">
            <span className="font-semibold text-slate-200 block">💡 Multi-Tab Testing Tip:</span>
            <p className="text-[11px] leading-relaxed text-slate-400">
              Open a new incognito window or browser tab at <code className="text-indigo-300">http://localhost:5173</code> and join with code <strong className="text-white font-mono">{room.code}</strong> to test live multiplayer synchronization.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Lobby;
